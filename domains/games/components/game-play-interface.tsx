'use client'

import { useState, useRef, useEffect, ReactNode } from 'react'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Loader2, Play, Send, BookOpen } from 'lucide-react'
import { Game, ChatMessage, GameplayOption } from '../types'
import { ImageGenerationService, type ImageGenerationResult } from '../services/image-generation.service'
import { ComicPanelCard } from './comic-panel-card'
import { ComicBookFinale, type ComicBookFinalePanelData } from './comic-book-finale'
import { parsePanels } from '../utils/text-parser'

interface GamePlayInterfaceProps {
  game: Game
}

interface ChatEntry extends ChatMessage {
  options?: GameplayOption[]
  imageModel?: string             // Which Venice AI model generated this image
  imageRating?: number            // User rating (1-5) for this image
  narrativeImage?: string | null  // Comic panel image URL
}

const MAX_COMIC_PANELS = 10

export function GamePlayInterface({ game }: GamePlayInterfaceProps) {
  const [sessionId, setSessionId] = useState<string | null>(null)
  const [messages, setMessages] = useState<ChatEntry[]>([])
  const [isStarting, setIsStarting] = useState(false)
  const [isPlaying, setIsPlaying] = useState(false)
  const [isContentReady, setIsContentReady] = useState(false) // New: Track when all content is loaded
  const [loadingProgress, setLoadingProgress] = useState({ text: false, images: false }) // New: Track loading stages
  const [userInput, setUserInput] = useState('')
  const [isWaitingForResponse, setIsWaitingForResponse] = useState(false)
  const [showComicFinale, setShowComicFinale] = useState(false)
  const [isMinting, setIsMinting] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)

  const assistantMessageCount = messages.filter(m => m.role === 'assistant').length
  const canAddMorePanels = assistantMessageCount < MAX_COMIC_PANELS

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  const startGame = async () => {
    setIsStarting(true)
    setLoadingProgress({ text: false, images: false })

    try {
      // Step 1: Create session
      const sessionResponse = await fetch('/api/session/new')
      const sessionData = await sessionResponse.json()

      if (!sessionData.success) {
        throw new Error('Failed to create session')
      }

      const newSessionId = sessionData.data.sessionId
      setSessionId(newSessionId)

      // Step 2: Generate initial narrative content
      const startResponse = await fetch(`/api/games/${game.slug}/start`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sessionId: newSessionId }),
      })

      if (!startResponse.ok) {
        throw new Error('Failed to start game')
      }

      const reader = startResponse.body?.getReader()
      if (!reader) throw new Error('No response body')

      let currentMessage = ''
      let currentOptions: GameplayOption[] = []

      // Process the streaming response but don't switch screens yet
      while (true) {
        const { done, value } = await reader.read()
        if (done) break

        const chunk = new TextDecoder().decode(value)
        const lines = chunk.split('\n')

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            try {
              const data = JSON.parse(line.slice(6))

              if (data.type === 'content') {
                currentMessage += data.content
                // Don't update UI yet - keep user on hero screen
              } else if (data.type === 'options') {
                currentOptions = data.options || []
              } else if (data.type === 'end') {
                // Text generation complete
                setLoadingProgress(prev => ({ ...prev, text: true }))
                
                // Now create the message for image generation
                const content = currentMessage
                const optionStartRegex = /[\n\r]+\s*1[.)]\s+/
                const match = content.match(optionStartRegex)
                
                const cleanContent = match && match.index && currentOptions.length > 0 
                  ? content.substring(0, match.index).trim() 
                  : content

                const finalMessage: ChatEntry = {
                  id: `initial-${newSessionId}`,
                  sessionId: newSessionId,
                  gameId: game.id,
                  role: 'assistant',
                  content: cleanContent,
                  options: currentOptions,
                  model: game.promptModel,
                  createdAt: new Date(),
                }

                setMessages([finalMessage])
                
                // Now generate images for all panels while still on hero screen
                setLoadingProgress(prev => ({ ...prev, text: true }))
                
                // Parse panels from the narrative
                const { panels } = parsePanels(cleanContent)
                
                // Generate all images in parallel
                Promise.allSettled(
                  panels.map(panel =>
                    ImageGenerationService.generateImage({
                      prompt: panel.narrative,
                      genre: game.genre,
                      style: 'comic_book',
                      aspectRatio: 'landscape'
                    })
                  )
                ).then(results => {
                  const successful = results.filter(r => r.status === 'fulfilled' && r.value.imageUrl).length
                  console.log(`Hero screen image generation: ${successful}/${results.length} successful, cache size: ${ImageGenerationService.getCacheStats?.().size}`)
                  setLoadingProgress(prev => ({ ...prev, images: true }))
                }).catch(err => {
                  console.error('Hero screen image generation error:', err)
                  // Continue anyway - show gameplay even if images failed
                  setLoadingProgress(prev => ({ ...prev, images: true }))
                })
              }
            } catch (error) {
              console.error('Error parsing stream data:', error)
            }
          }
        }
      }

    } catch (error) {
      console.error('Failed to start game:', error)
      setIsStarting(false)
    }
    // Note: Don't set isStarting to false yet - let image loading complete
  }

  // New: Handle when images are ready from ComicPanelCard
  const handleImagesReady = () => {
    setLoadingProgress(prev => ({ ...prev, images: true }))
  }

  // Check if all content is ready
  useEffect(() => {
    // Transition to game screen only when BOTH text AND images are ready
    if (loadingProgress.text && loadingProgress.images) {
      setIsPlaying(true)
      setIsStarting(false)
    }
  }, [loadingProgress.text, loadingProgress.images])

  const sendMessage = async (message: string) => {
    if (!sessionId || !message.trim()) return

    setIsWaitingForResponse(true)
    setUserInput('')

    const userMessage: ChatEntry = {
      id: `user-${Date.now()}`,
      sessionId,
      gameId: game.id,
      role: 'user',
      content: message.trim(),
      model: game.promptModel,
      createdAt: new Date(),
    }

    setMessages(prev => [...prev, userMessage])

    try {
      const response = await fetch(`/api/games/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sessionId,
          gameId: game.id,
          message: message.trim(),
        }),
      })

      if (!response.ok) {
        throw new Error('Failed to send message')
      }

      const reader = response.body?.getReader()
      if (!reader) throw new Error('No response body')

      let currentMessage = ''
      let currentOptions: GameplayOption[] = []

      while (true) {
        const { done, value } = await reader.read()
        if (done) break

        const chunk = new TextDecoder().decode(value)
        const lines = chunk.split('\n')

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            try {
              const data = JSON.parse(line.slice(6))

              if (data.type === 'content') {
                currentMessage += data.content
                setMessages(prev => {
                  const newMessages = [...prev]
                  const lastMessage = newMessages[newMessages.length - 1]

                  if (lastMessage && lastMessage.role === 'assistant' && !lastMessage.options) {
                    lastMessage.content = currentMessage
                  } else {
                    newMessages.push({
                      id: `assistant-${Date.now()}`,
                      sessionId,
                      gameId: game.id,
                      role: 'assistant',
                      content: currentMessage,
                      model: game.promptModel,
                      createdAt: new Date(),
                    })
                  }

                  return newMessages
                })
              } else if (data.type === 'options') {
                currentOptions = data.options || []
              } else if (data.type === 'end') {
                setMessages(prev => {
                  const newMessages = [...prev]
                  const lastMessage = newMessages[newMessages.length - 1]
                  if (lastMessage) {
                    lastMessage.options = currentOptions

                    // Strip options from content to avoid repetition
                    const content = lastMessage.content
                    const optionStartRegex = /[\n\r]+\s*1[.)]\s+/
                    const match = content.match(optionStartRegex)

                    if (match && match.index && currentOptions.length > 0) {
                      lastMessage.content = content.substring(0, match.index).trim()
                    }

                    // Image generation now handled by ComicPanelCard component
                  }
                  return newMessages
                })
              }
            } catch (error) {
              console.error('Error parsing stream data:', error)
            }
          }
        }
      }

    } catch (error) {
      console.error('Failed to send message:', error)
      setMessages(prev => prev.filter(m => m.id !== userMessage.id))
    } finally {
      setIsWaitingForResponse(false)
    }
  }

  const handleImageGenerated = (messageId: string, result: ImageGenerationResult) => {
    setMessages(prev => {
      const newMessages = [...prev]
      const targetMessage = newMessages.find(m => m.id === messageId)
      if (targetMessage) {
        targetMessage.imageModel = result.model
        targetMessage.narrativeImage = result.imageUrl || null
      }
      return newMessages
    })
  }

  const handleImageRating = (messageId: string, rating: number) => {
    // Record feedback to optimize model selection
    const message = messages.find(m => m.id === messageId)
    if (message?.imageModel) {
      ImageGenerationService.recordModelFeedback(message.imageModel, rating)
    }

    // Update UI to show rating
    setMessages(prev => {
      const newMessages = [...prev]
      const targetMessage = newMessages.find(m => m.id === messageId)
      if (targetMessage) {
        targetMessage.imageRating = rating
      }
      return newMessages
    })
  }

  const handleOptionClick = (option: GameplayOption) => {
    sendMessage(option.text)
  }

  const buildComicPanels = (): ComicBookFinalePanelData[] => {
    const assistantMessages = messages.filter(m => m.role === 'assistant').slice(0, MAX_COMIC_PANELS)
    
    return assistantMessages.map((message, idx) => {
      // Find the user's choice that comes after this assistant message
      const messageIndex = messages.indexOf(message)
      const nextUserMessage = messages
        .slice(messageIndex + 1)
        .find(m => m.role === 'user')
      
      return {
        id: message.id,
        narrativeText: message.content,
        imageUrl: message.narrativeImage || null,
        imageModel: message.imageModel || 'unknown',
        userChoice: nextUserMessage?.content || undefined,
      }
    })
  }

  const handleMintComic = async (panelData: ComicBookFinalePanelData[]) => {
    setIsMinting(true)
    try {
      // TODO: Implement NFT minting with full comic panel sequence
      // This should:
      // 1. Upload all panels to IPFS
      // 2. Create metadata with panel sequence
      // 3. Call mint contract with full comic metadata
      console.log('Minting comic with panels:', panelData)
      // For now, just show success
      alert('Minting implementation coming soon!')
    } catch (error) {
      console.error('Mint failed:', error)
      alert('Failed to mint comic')
    } finally {
      setIsMinting(false)
    }
  }

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      sendMessage(userInput)
    }
  }

  // HERO SCREEN - Before game starts
  if (!isPlaying) {
    return (
      <div className="fixed inset-0 w-full h-full overflow-hidden bg-black">
        {/* Background Image */}
        {game.imageUrl && (
          <div className="absolute inset-0">
            <img
              src={game.imageUrl}
              alt={game.title}
              className="w-full h-full object-cover"
            />
            {/* Multiple gradient overlays for better text contrast */}
            <div className="absolute inset-0 bg-gradient-to-b from-black/50 via-black/70 to-black/90"></div>
            <div className="absolute inset-0 bg-gradient-to-r from-black/40 to-transparent"></div>
          </div>
        )}

        {/* Content */}
        <div className="relative w-full h-full flex flex-col items-center justify-center px-4 py-8 overflow-y-auto">
          <div className="w-full max-w-2xl flex flex-col items-center text-center space-y-4 md:space-y-6 my-auto">
            {/* Genre Badge */}
            <div
              className="inline-block px-3 md:px-4 py-1.5 md:py-2 rounded-full border text-xs md:text-sm font-semibold backdrop-blur-sm"
              style={{
                borderColor: game.primaryColor || '#8b5cf6',
                color: game.primaryColor || '#8b5cf6',
                backgroundColor: `${game.primaryColor || '#8b5cf6'}20`,
              }}
            >
              {game.genre} • {game.subgenre}
            </div>

            {/* Title */}
            <h1
              className="text-4xl md:text-6xl lg:text-7xl font-bold leading-tight drop-shadow-lg"
              style={{ color: game.primaryColor || '#8b5cf6' }}
            >
              {game.title}
            </h1>

            {/* Tagline */}
            <blockquote
              className="text-lg md:text-2xl italic opacity-90 drop-shadow-md max-w-xl"
              style={{ color: game.primaryColor || '#8b5cf6' }}
            >
              "{game.tagline}"
            </blockquote>

            {/* Description */}
            <p className="text-gray-200 text-sm md:text-base lg:text-lg max-w-xl drop-shadow-md leading-relaxed">
              {game.description}
            </p>

            {/* CTA Button */}
            <div className="mt-6 md:mt-8 pt-2">
              <Button
                onClick={startGame}
                disabled={isStarting}
                size="lg"
                className="text-base md:text-lg px-6 md:px-8 py-5 md:py-6 rounded-lg font-semibold shadow-xl hover:shadow-2xl transition-all duration-300 disabled:opacity-50"
                style={{
                  backgroundColor: game.primaryColor || '#8b5cf6',
                  color: 'white',
                }}
              >
                {isStarting ? (
                  <>
                    <Loader2 className="w-5 h-5 md:w-6 md:h-6 mr-2 animate-spin" />
                    <span>
                      {!loadingProgress.text ? 'Crafting your story...' : 
                       !loadingProgress.images ? 'Generating visuals...' :
                       'Almost ready...'}
                    </span>
                  </>
                ) : (
                  <>
                    <Play className="w-5 h-5 md:w-6 md:h-6 mr-2 fill-current" />
                    <span>Start Game</span>
                  </>
                )}
              </Button>
              
              {/* Loading Progress Indicators */}
              {isStarting && (
                <div className="mt-4 flex justify-center gap-2">
                  <div className={`w-3 h-3 rounded-full transition-colors duration-500 ${
                    loadingProgress.text ? 'bg-green-500' : 'bg-gray-600 animate-pulse'
                  }`} 
                  style={{
                    backgroundColor: loadingProgress.text ? (game.primaryColor || '#8b5cf6') : undefined
                  }}
                  />
                  <div className={`w-3 h-3 rounded-full transition-colors duration-500 ${
                    loadingProgress.images ? 'bg-green-500' : 'bg-gray-600 animate-pulse'
                  }`}
                  style={{
                    backgroundColor: loadingProgress.images ? (game.primaryColor || '#8b5cf6') : undefined
                  }}
                  />
                </div>
              )}
            </div>

            {/* Optional: Tips section on mobile */}
            <div className="md:hidden mt-8 pt-4 border-t border-white/20 text-xs text-gray-300 max-w-xs">
              <p>💡 Make choices carefully - every decision shapes your story</p>
            </div>
          </div>
        </div>
      </div>
    )
  }

  // COMIC FINALE SCREEN - Story completion view
  if (showComicFinale) {
    return (
      <ComicBookFinale
        gameTitle={game.title}
        genre={game.genre}
        primaryColor={game.primaryColor || '#8b5cf6'}
        panels={buildComicPanels()}
        onBack={() => setShowComicFinale(false)}
        onMint={handleMintComic}
        isMinting={isMinting}
      />
    )
  }

  // GAME PLAY SCREEN - During game
  return (
    <div
      className="min-h-screen w-full flex flex-col"
      style={{
        background: `linear-gradient(135deg, ${game.primaryColor || '#8b5cf6'}05, black)`,
      }}
    >
      {/* Main Content Area */}
      <div className="flex-1 overflow-y-auto">
        {messages.length === 0 ? (
          // Loading State
          <div className="h-full flex items-center justify-center">
            <div className="text-center space-y-4">
              <Loader2 className="w-12 h-12 animate-spin mx-auto" style={{ color: game.primaryColor || '#8b5cf6' }} />
              <p className="text-gray-400">Generating your story...</p>
            </div>
          </div>
        ) : (
          // Comic Panel Display
          <div className="w-full flex flex-col items-center justify-center min-h-full p-4 md:p-8 py-6 md:py-8">
            {/* Panel Progress Header */}
            <div className="w-full max-w-3xl mb-6 pb-6 border-b border-white/10 flex items-center justify-between">
              <div>
                <p className="text-xs text-gray-400 uppercase tracking-wider font-bold">Story Progress</p>
                <p className="text-sm text-gray-500 mt-1">Panel {assistantMessageCount} of {MAX_COMIC_PANELS}</p>
              </div>
              <div className="w-48 h-2 bg-white/10 rounded-full overflow-hidden">
                <div
                  className="h-full transition-all duration-300"
                  style={{
                    width: `${(assistantMessageCount / MAX_COMIC_PANELS) * 100}%`,
                    backgroundColor: game.primaryColor || '#8b5cf6',
                  }}
                />
              </div>
            </div>

            {/* Panel History Thumbnails (if multiple panels exist) */}
            {messages.filter(m => m.role === 'assistant').length > 1 && (
              <div className="w-full max-w-3xl mb-6 pb-6 border-b border-white/10">
                <p className="text-xs text-gray-400 uppercase tracking-wider font-bold mb-3">Story so far</p>
                <div className="flex gap-2 overflow-x-auto pb-2">
                  {messages.map((msg, idx) => 
                    msg.role === 'assistant' && (
                      <div
                        key={msg.id}
                        className="w-20 h-20 rounded-lg border-2 flex-shrink-0 overflow-hidden cursor-pointer hover:opacity-80 transition-opacity"
                        style={{ borderColor: game.primaryColor }}
                        onClick={() => messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })}
                        title={`Panel ${idx + 1}`}
                      >
                        <div className="w-full h-full bg-gradient-to-br from-gray-800 to-black flex items-center justify-center text-xs text-gray-400">
                          {idx + 1}
                        </div>
                      </div>
                    )
                  )}
                </div>
              </div>
            )}

            {/* Current Comic Panel (only latest assistant message) - Multi Panel Support */}
            <div className="w-full space-y-6 animate-fade-in">
              {messages.map((message, idx) => {
                // Only show latest assistant message as current panel
                if (message.role !== 'assistant' || idx !== messages.length - 1) return null

                return (
                  <ComicPanelCard
                    key={message.id}
                    messageId={message.id}
                    narrativeText={message.content}
                    genre={game.genre}
                    primaryColor={game.primaryColor || '#8b5cf6'}
                    options={message.options || []}
                    onOptionSelect={handleOptionClick}
                    isWaiting={isWaitingForResponse}
                    onImageGenerated={(result) => handleImageGenerated(message.id, result)}
                    onImageRating={(rating) => handleImageRating(message.id, rating)}
                    onImagesReady={handleImagesReady}
                  />
                )
              })}

              {/* Show thinking state after narrative if waiting for response */}
              {isWaitingForResponse && (
                <div className="flex items-center gap-3 p-4 rounded-lg bg-white/5 border border-white/10 text-gray-400">
                  <Loader2 className="w-5 h-5 animate-spin" style={{ color: game.primaryColor || '#8b5cf6' }} />
                  <span className="text-sm md:text-base">Next scene loading...</span>
                </div>
              )}
            </div>

            <div ref={messagesEndRef} />
          </div>
        )}
      </div>

      {/* Input Area - Fixed at Bottom */}
      <div
        className="border-t border-white/10 p-4 md:p-6 bg-gradient-to-t from-black via-black/80 to-transparent backdrop-blur-md"
        style={{
          boxShadow: `0 -4px 20px ${game.primaryColor || '#8b5cf6'}10`,
        }}
      >
        <div className="w-full max-w-4xl mx-auto space-y-3">
          {/* Panel limit reached */}
          {!canAddMorePanels && (
            <div
              className="p-4 rounded-lg border text-sm"
              style={{
                backgroundColor: `${game.primaryColor || '#8b5cf6'}15`,
                borderColor: game.primaryColor || '#8b5cf6',
              }}
            >
              <p className="font-semibold text-gray-100">Your {MAX_COMIC_PANELS}-Panel Story is Complete</p>
              <p className="text-sm text-gray-400 mt-2">
                You've reached the end of this chapter. View your complete comic book and mint it as an NFT to preserve your choices and adventure.
              </p>
            </div>
          )}

          <div className="flex gap-3">
            {canAddMorePanels ? (
              // Options are now displayed within MultiPanelCard - no input needed here
              <div className="w-full text-center py-2">
                <p className="text-gray-500 text-xs">
                  {isWaitingForResponse ? 'Generating next scene...' : 'Continue your adventure by selecting an option above'}
                </p>
              </div>
            ) : (
              <Button
                onClick={() => setShowComicFinale(true)}
                className="w-full h-[50px] md:h-[60px] font-semibold transition-all duration-200 hover:shadow-lg hover:shadow-current"
                style={{
                  backgroundColor: game.primaryColor || '#8b5cf6',
                  color: 'white',
                }}
              >
                <BookOpen className="w-5 h-5 mr-2" />
                Complete Story & View Comic
              </Button>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}