'use client'

import { useEffect, useState } from 'react'
import { readyMiniApp, getFarcasterContext, isInFarcasterContext, openUrl } from '@/lib/farcaster'
import { WriterCoinSelector } from './components/WriterCoinSelector'
import { ArticleInput } from './components/ArticleInput'
import { GameCustomizer } from './components/GameCustomizer'
import { GamePlayer } from './components/GamePlayer'
import { type WriterCoin } from '@/lib/writerCoins'
import type { Game } from '@/domains/games/types'

export default function MiniAppPage() {
    const [isInitialized, setIsInitialized] = useState(false)
    const [isInFrame, setIsInFrame] = useState(false)
    const [selectedCoin, setSelectedCoin] = useState<WriterCoin | null>(null)
    const [articleUrl, setArticleUrl] = useState('')
    const [generatedGame, setGeneratedGame] = useState<Game | null>(null)
    const [step, setStep] = useState<'select-coin' | 'input-article' | 'customize-game' | 'play-game'>('select-coin')

    useEffect(() => {
        async function init() {
            // Get Farcaster context to verify we're in Mini App
            await getFarcasterContext()
            setIsInitialized(true)
            setIsInFrame(await isInFarcasterContext())
            
            // Signal that Mini App is ready to display
            await readyMiniApp()
        }
        init()
    }, [])

    const handleCoinSelect = (coin: WriterCoin) => {
        setSelectedCoin(coin)
        setStep('input-article')
    }

    const handleArticleSubmit = (url: string) => {
        setArticleUrl(url)
        setStep('customize-game')
    }

    const handleBack = () => {
        if (step === 'play-game') {
            setGeneratedGame(null)
            setStep('customize-game')
        } else if (step === 'customize-game') {
            setStep('input-article')
        } else if (step === 'input-article') {
            setStep('select-coin')
            setSelectedCoin(null)
        }
    }

    const handleGameGenerated = (game: unknown) => {
        // Wordle games are rendered in the main web app; launch them directly
        if ((game as { mode?: string }).mode === 'wordle') {
            const slug = (game as { slug?: string }).slug
            if (slug) {
                // Use current origin so it works in dev and prod
                const origin = typeof window !== 'undefined' ? window.location.origin : ''
                openUrl(`${origin}/games/${slug}`).catch(console.error)
            }
            return
        }

        // Cast to Game type, but only after we know it's not a wordle game
        setGeneratedGame(game as Game)
        setStep('play-game')
    }

    return (
        <div className="min-h-screen bg-gradient-to-b from-purple-900 via-purple-800 to-indigo-900">
            {/* Header */}
            <header className="border-b border-purple-700/50 bg-purple-900/50 backdrop-blur-sm">
                <div className="container mx-auto px-4 py-4">
                    <div className="flex items-center justify-between">
                        <div>
                            <h1 className="text-2xl font-bold text-white">WritArcade</h1>
                            <p className="text-sm text-purple-200">Turn articles into playable games</p>
                        </div>
                        {!isInFrame && (
                            <div className="rounded-lg bg-yellow-500/20 px-3 py-1 text-xs text-yellow-200">
                                ⚠️ Not in Farcaster
                            </div>
                        )}
                    </div>
                </div>
            </header>

            {/* Main Content */}
            <main className="container mx-auto px-4 py-8">
                {!isInitialized && (
                    <div className="flex items-center justify-center py-12">
                        <div className="text-center">
                            <div className="mb-4 inline-block h-8 w-8 animate-spin rounded-full border-4 border-purple-400 border-t-transparent"></div>
                            <p className="text-purple-200">Initializing...</p>
                        </div>
                    </div>
                )}

                {isInitialized && (
                    <div className="mx-auto max-w-2xl">
                        {/* Progress Steps */}
                        <div className="mb-8 flex items-center justify-center space-x-2 flex-wrap gap-y-2">
                            <StepIndicator
                                number={1}
                                label="Coin"
                                active={step === 'select-coin'}
                                completed={step !== 'select-coin'}
                            />
                            <div className="h-px w-8 bg-purple-600"></div>
                            <StepIndicator
                                number={2}
                                label="URL"
                                active={step === 'input-article'}
                                completed={['customize-game', 'play-game'].includes(step)}
                            />
                            <div className="h-px w-8 bg-purple-600"></div>
                            <StepIndicator
                                number={3}
                                label="Config"
                                active={step === 'customize-game'}
                                completed={step === 'play-game'}
                            />
                            <div className="h-px w-8 bg-purple-600"></div>
                            <StepIndicator
                                number={4}
                                label="Play"
                                active={step === 'play-game'}
                                completed={false}
                            />
                        </div>

                        {/* Step Content */}
                        <div className="rounded-xl bg-white/10 backdrop-blur-md p-6 shadow-2xl">
                            {step === 'select-coin' && (
                                <WriterCoinSelector onSelect={handleCoinSelect} />
                            )}

                            {step === 'input-article' && selectedCoin && (
                                <ArticleInput
                                    writerCoin={selectedCoin}
                                    onSubmit={handleArticleSubmit}
                                    onBack={handleBack}
                                />
                            )}

                            {step === 'customize-game' && selectedCoin && articleUrl && (
                                <GameCustomizer
                                    writerCoin={selectedCoin}
                                    articleUrl={articleUrl}
                                    onBack={handleBack}
                                    onGameGenerated={handleGameGenerated}
                                />
                            )}

                            {step === 'play-game' && generatedGame && selectedCoin && (
                                <GamePlayer
                                    game={generatedGame}
                                    onBack={handleBack}
                                    writerCoin={selectedCoin}
                                />
                            )}
                        </div>
                    </div>
                )}
            </main>

            {/* Footer */}
            <footer className="mt-12 border-t border-purple-700/50 py-6 text-center text-sm text-purple-300">
                <p>Powered by Base • Farcaster Native</p>
            </footer>
        </div>
    )
}

function StepIndicator({
    number,
    label,
    active,
    completed
}: {
    number: number
    label: string
    active: boolean
    completed: boolean
}) {
    return (
        <div className="flex flex-col items-center">
            <div className={`
        flex h-10 w-10 items-center justify-center rounded-full font-bold
        ${active ? 'bg-purple-500 text-white' : ''}
        ${completed ? 'bg-green-500 text-white' : ''}
        ${!active && !completed ? 'bg-purple-800 text-purple-400' : ''}
      `}>
                {completed ? '✓' : number}
            </div>
            <span className={`mt-2 text-xs ${active ? 'text-white' : 'text-purple-400'}`}>
                {label}
            </span>
        </div>
    )
}
