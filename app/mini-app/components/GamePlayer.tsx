'use client'

import { useState, useEffect } from 'react'

interface GamePlayerProps {
    game: any
    onBack: () => void
}

export function GamePlayer({ game, onBack }: GamePlayerProps) {
    const [gameContent, setGameContent] = useState<string>('')
    const [options, setOptions] = useState<Array<{ id: number; text: string }>>([])
    const [isLoading, setIsLoading] = useState(false)
    const [sessionId] = useState(() => Math.random().toString(36).slice(2, 11))
    const [gameHistory, setGameHistory] = useState<Array<{ role: 'user' | 'assistant'; content: string }>>([])

    // Start the game
    useEffect(() => {
        const startGame = async () => {
            setIsLoading(true)
            try {
                const response = await fetch(`/api/games/${game.slug}/start`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ sessionId }),
                })

                if (!response.ok) throw new Error('Failed to start game')

                const reader = response.body?.getReader()
                if (!reader) return

                const decoder = new TextDecoder()
                let buffer = ''
                let currentContent = ''
                let currentOptions: typeof options = []

                while (true) {
                    const { done, value } = await reader.read()
                    if (done) break

                    buffer += decoder.decode(value, { stream: true })
                    const lines = buffer.split('\n')
                    buffer = lines.pop() || ''

                    for (const line of lines) {
                        if (line.startsWith('data: ')) {
                            try {
                                const data = JSON.parse(line.slice(6))
                                if (data.type === 'content') {
                                    currentContent += data.content
                                    setGameContent(currentContent)
                                } else if (data.type === 'options') {
                                    currentOptions = data.options
                                    setOptions(currentOptions)
                                }
                            } catch (e) {
                                // Ignore parse errors
                            }
                        }
                    }
                }

                setGameHistory([{ role: 'assistant', content: currentContent }])
            } catch (error) {
                console.error('Error starting game:', error)
                setGameContent('Failed to start game. Please try again.')
            } finally {
                setIsLoading(false)
            }
        }

        startGame()
    }, [game.slug, sessionId])

    const handleChoice = async (option: { id: number; text: string }) => {
        if (isLoading) return

        setIsLoading(true)
        try {
            // Add user choice to history
            const newHistory = [
                ...gameHistory,
                { role: 'user' as const, content: option.text }
            ]
            setGameHistory(newHistory)

            const response = await fetch('/api/games/chat', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    messages: gameHistory,
                    userInput: option.text,
                    sessionId,
                    gameSlug: game.slug,
                    model: game.promptModel || 'gpt-4o-mini',
                }),
            })

            if (!response.ok) throw new Error('Failed to continue game')

            const reader = response.body?.getReader()
            if (!reader) return

            const decoder = new TextDecoder()
            let buffer = ''
            let currentContent = ''
            let currentOptions: typeof options = []

            while (true) {
                const { done, value } = await reader.read()
                if (done) break

                buffer += decoder.decode(value, { stream: true })
                const lines = buffer.split('\n')
                buffer = lines.pop() || ''

                for (const line of lines) {
                    if (line.startsWith('data: ')) {
                        try {
                            const data = JSON.parse(line.slice(6))
                            if (data.type === 'content') {
                                currentContent += data.content
                                setGameContent(prev => prev + data.content)
                            } else if (data.type === 'options') {
                                currentOptions = data.options
                                setOptions(currentOptions)
                            }
                        } catch (e) {
                            // Ignore parse errors
                        }
                    }
                }
            }

            setGameHistory([...newHistory, { role: 'assistant', content: currentContent }])
            setGameContent(prev => prev + '\n\n' + currentContent)
        } catch (error) {
            console.error('Error continuing game:', error)
            setGameContent(prev => prev + '\n\nFailed to continue game. Please try again.')
        } finally {
            setIsLoading(false)
        }
    }

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h2 className="text-2xl font-bold text-white">{game.title}</h2>
                    <p className="text-sm text-purple-300">
                        {game.genre} • {game.subgenre}
                    </p>
                </div>
                <button
                    onClick={onBack}
                    className="flex items-center space-x-2 text-purple-300 hover:text-purple-200"
                >
                    <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                    </svg>
                    <span>Back</span>
                </button>
            </div>

            {/* Game Description */}
            <div className="rounded-lg bg-purple-900/30 p-4">
                <p className="text-sm text-purple-200">{game.description}</p>
            </div>

            {/* Game Content */}
            <div className="rounded-lg bg-purple-950/50 border border-purple-700/50 p-6">
                <div className="space-y-4">
                    <div className="prose prose-invert max-w-none text-purple-50">
                        <p className="whitespace-pre-wrap leading-relaxed">
                            {gameContent}
                        </p>
                    </div>

                    {isLoading && (
                        <div className="flex items-center justify-center py-4">
                            <div className="inline-block h-5 w-5 animate-spin rounded-full border-2 border-purple-400 border-t-transparent"></div>
                        </div>
                    )}

                    {/* Game Options */}
                    {options.length > 0 && !isLoading && (
                        <div className="space-y-2 pt-4">
                            <p className="text-xs uppercase tracking-wider text-purple-400">Choose your action:</p>
                            {options.map((option) => (
                                <button
                                    key={option.id}
                                    onClick={() => handleChoice(option)}
                                    disabled={isLoading}
                                    className="w-full rounded-lg border border-purple-500/50 bg-purple-900/30 px-4 py-3 text-left text-sm text-purple-200 transition-all hover:border-purple-400 hover:bg-purple-900/50 disabled:opacity-50"
                                >
                                    <span className="font-medium">{option.id}.</span> {option.text}
                                </button>
                            ))}
                        </div>
                    )}
                </div>
            </div>

            {/* Action Buttons */}
            <div className="flex gap-3">
                <button
                    onClick={onBack}
                    className="flex-1 rounded-lg border border-purple-500/50 px-4 py-3 font-medium text-purple-300 transition-colors hover:border-purple-400 hover:bg-white/5"
                >
                    Exit Game
                </button>
                <button
                    disabled={true}
                    className="flex-1 rounded-lg bg-purple-600 px-4 py-3 font-medium text-white opacity-50 cursor-not-allowed"
                    title="Mint feature coming soon"
                >
                    Mint as NFT
                </button>
            </div>

            {/* Info */}
            <div className="rounded-lg bg-purple-900/30 p-4">
                <p className="text-xs text-purple-300">
                    💡 <span className="font-semibold">Tip:</span> Your choices shape the story. Explore different paths to uncover all the game has to offer.
                </p>
            </div>
        </div>
    )
}
