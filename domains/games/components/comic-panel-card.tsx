'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { Button } from '@/components/ui/button'
import { Loader2, Star } from 'lucide-react'
import { GameplayOption } from '../types'
import { ImageGenerationService, ImageGenerationResult } from '../services/image-generation.service'
import { parseNarrativeText, parsePanels } from '../utils/text-parser'

interface ComicPanelCardProps {
  messageId: string  // Unique identifier for this panel (prevents duplicate generations)
  narrativeText: string
  genre: string
  primaryColor: string
  options: GameplayOption[]
  onOptionSelect: (option: GameplayOption) => void
  isWaiting: boolean
  onImageGenerated?: (result: ImageGenerationResult) => void
  onImageRating?: (rating: number) => void
  onImagesReady?: () => void // New: Callback when all images are loaded
}

export function ComicPanelCard({
  messageId,
  narrativeText,
  genre,
  primaryColor,
  options,
  onOptionSelect,
  isWaiting,
  onImageGenerated,
  onImageRating,
  onImagesReady,
}: ComicPanelCardProps) {
  const { panels, options: parsedOptions } = parsePanels(narrativeText)
  const [panelImages, setPanelImages] = useState<(ImageGenerationResult | null)[]>([])
  const [isGeneratingImages, setIsGeneratingImages] = useState(true)
  const [userRatings, setUserRatings] = useState<(number | null)[]>([])
  const hasMultiplePanels = panels.length > 1
  
  // Track if we've already generated an image for this messageId (prevents duplicate generations)
  const generationAttemptedRef = useRef(false)
  const messageIdRef = useRef(messageId)

  // Initialize arrays for multi-panel support
  useEffect(() => {
    setPanelImages(new Array(panels.length).fill(null))
    setUserRatings(new Array(panels.length).fill(null))
  }, [panels.length])

  const generateAllImages = useCallback(async () => {
    setIsGeneratingImages(true)
    const results = await Promise.allSettled(
      panels.map(panel => 
        ImageGenerationService.generateImage({
          prompt: panel.narrative,
          genre,
          style: 'comic_book',
          aspectRatio: 'landscape'
        })
      )
    )
    
    const images = results.map(result => 
      result.status === 'fulfilled' ? result.value : { imageUrl: null, model: 'failed', timestamp: Date.now() }
    )
    
    setPanelImages(images)
    setIsGeneratingImages(false)
    
    // Notify parent of first successful image
    const firstSuccess = images.find(img => img.imageUrl)
    if (firstSuccess) onImageGenerated?.(firstSuccess)
    
    // Notify parent that all images are ready (even if some failed)
    onImagesReady?.()
  }, [genre, onImageGenerated, onImagesReady, panels])

  // Generate images for all panels (only if not already generated)
  useEffect(() => {
    if (messageIdRef.current !== messageId) {
      messageIdRef.current = messageId
      generationAttemptedRef.current = false
    }
    
    if (!generationAttemptedRef.current && panels.length > 0) {
      generationAttemptedRef.current = true
      console.log('Generating images for panels:', { count: panels.length, cacheSize: ImageGenerationService.getCacheStats?.().size })
      generateAllImages()
    }
  }, [messageId, panels, generateAllImages])

  const handleRating = (panelIndex: number, rating: number) => {
    setUserRatings(prev => {
      const updated = [...prev]
      updated[panelIndex] = rating
      return updated
    })
    onImageRating?.(rating)
  }

  // Show loading until all images ready
  if (isGeneratingImages) {
    return (
      <div className="w-full max-w-4xl mx-auto p-8">
        <div 
          className="rounded-xl border-2 p-12 text-center"
          style={{
            borderColor: primaryColor,
            backgroundColor: `${primaryColor}05`
          }}
        >
          <Loader2 className="w-12 h-12 animate-spin mx-auto mb-4" style={{ color: primaryColor }} />
          <h3 className="text-xl font-semibold text-white mb-2">Crafting Your Scene</h3>
          <p className="text-gray-400">
            Generating {panels.length} panel{panels.length > 1 ? 's' : ''} with visuals...
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="w-full max-w-6xl mx-auto space-y-8">
      {/* Render each panel */}
      {panels.map((panel, index) => (
        <div
          key={index}
          className={`rounded-xl border-2 shadow-2xl overflow-hidden ${
            index % 2 === 0 ? 'lg:flex-row' : 'lg:flex-row-reverse'
          } flex flex-col lg:flex`}
          style={{
            borderColor: primaryColor,
            backgroundColor: 'rgba(0,0,0,0.6)',
          }}
        >
          {/* Comic Panel Image */}
          <div className="w-full lg:w-1/2 h-72 lg:h-96 overflow-hidden bg-black relative">
            {panelImages[index]?.imageUrl ? (
              <>
                <img
                  src={panelImages[index].imageUrl}
                  alt={`Story panel ${index + 1}`}
                  className="w-full h-full object-cover"
                />
                {/* Model badge */}
                <div className="absolute top-4 left-4">
                  <span className="text-xs font-mono px-2 py-1 rounded bg-black/70 text-white">
                    {panelImages[index].model || 'AI Generated'}
                  </span>
                </div>
                {/* Rating stars */}
                <div className="absolute top-4 right-4 flex gap-1">
                  {!userRatings[index] ? (
                    <>
                      {[1, 2, 3, 4, 5].map((star) => (
                        <button
                          key={star}
                          onClick={() => handleRating(index, star)}
                          className="text-lg hover:scale-110 transition-transform cursor-pointer text-white/70 hover:text-white"
                        >
                          ☆
                        </button>
                      ))}
                    </>
                  ) : (
                    <>
                      {[1, 2, 3, 4, 5].map((star) => (
                        <span
                          key={star}
                          className="text-lg"
                          style={{ color: star <= userRatings[index]! ? primaryColor : '#404040' }}
                        >
                          ★
                        </span>
                      ))}
                    </>
                  )}
                </div>
              </>
            ) : (
              <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-gray-900 to-black">
                <p className="text-gray-500">Image unavailable</p>
              </div>
            )}
          </div>

          {/* Content Section */}
          <div className="flex-1 p-6 lg:p-8 flex flex-col justify-center">
            <div className="space-y-4">
              <h3 className="text-sm font-mono text-gray-400">
                Panel {index + 1} of {panels.length}
              </h3>
              <p className="text-lg lg:text-xl leading-relaxed text-gray-100 font-medium">
                {panel.narrative}
              </p>
            </div>
          </div>
        </div>
      ))}

      {/* Options Section - Full width grid */}
      {(parsedOptions.length > 0 || options.length > 0) && (
        <div className="w-full">
          <div className="mb-6 text-center">
            <h3 className="text-xl font-semibold text-white mb-2">What happens next?</h3>
            <p className="text-gray-400 text-sm">Choose your path to continue the story</p>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {(parsedOptions.length > 0 ? parsedOptions : options.map(o => o.text)).map((option, index) => (
              <button
                key={index}
                onClick={() => onOptionSelect(typeof option === 'string' ? { id: index + 1, text: option } : option)}
                disabled={isWaiting}
                className="p-6 rounded-xl border-2 text-left transition-all duration-200 hover:shadow-lg hover:shadow-current hover:scale-[1.02] disabled:opacity-50 disabled:cursor-not-allowed"
                style={{
                  borderColor: `${primaryColor}40`,
                  backgroundColor: `${primaryColor}10`,
                  color: 'white',
                }}
              >
                <div className="flex items-start gap-3">
                  <span 
                    className="flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold"
                    style={{ backgroundColor: primaryColor }}
                  >
                    {index + 1}
                  </span>
                  <span className="text-base leading-relaxed">
                    {typeof option === 'string' ? option : option.text}
                  </span>
                </div>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
