'use client'

import { useState, useEffect, useRef } from 'react'
import { Button } from '@/components/ui/button'
import { Loader2, Star } from 'lucide-react'
import { GameplayOption } from '../types'
import { ImageGenerationService, ImageGenerationResult } from '../services/image-generation.service'

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
}: ComicPanelCardProps) {
  const [imageData, setImageData] = useState<ImageGenerationResult | null>(null)
  const [isGeneratingImage, setIsGeneratingImage] = useState(true)
  const [userRating, setUserRating] = useState<number | null>(null)
  
  // Track if we've already generated an image for this messageId (prevents duplicate generations)
  const generationAttemptedRef = useRef(false)
  const messageIdRef = useRef(messageId)

  // Generate image only once per unique messageId
  useEffect(() => {
    // If messageId changed, reset the ref and allow new generation
    if (messageIdRef.current !== messageId) {
      messageIdRef.current = messageId
      generationAttemptedRef.current = false
    }
    
    // Only generate if we haven't already tried for this messageId
    if (!generationAttemptedRef.current && narrativeText) {
      generationAttemptedRef.current = true
      generateImage()
    }
  }, [messageId, narrativeText])

  const generateImage = async () => {
    setIsGeneratingImage(true)
    setUserRating(null)
    try {
      const result = await ImageGenerationService.generateNarrativeImage({
        narrative: narrativeText,
        genre,
        primaryColor,
      })
      setImageData(result)
      onImageGenerated?.(result)
    } catch (error) {
      console.error('Failed to generate narrative image:', error)
      setImageData({
        imageUrl: null,
        model: 'failed',
        timestamp: Date.now(),
      })
    } finally {
      setIsGeneratingImage(false)
    }
  }

  const handleRating = (rating: number) => {
    setUserRating(rating)
    if (imageData?.model) {
      ImageGenerationService.recordModelFeedback(imageData.model, rating)
      onImageRating?.(rating)
    }
  }

  return (
    <div
      className="rounded-xl overflow-hidden border-4 shadow-2xl"
      style={{
        borderColor: primaryColor,
        backgroundColor: 'rgba(0,0,0,0.4)',
      }}
    >
      {/* Comic Panel Image */}
      <div className="w-full h-72 md:h-96 overflow-hidden bg-black relative group">
        {isGeneratingImage && !imageData?.imageUrl ? (
          <div className="w-full h-full flex items-center justify-center">
            <div className="text-center space-y-2">
              <Loader2 className="w-8 h-8 animate-spin mx-auto" style={{ color: primaryColor }} />
              <p className="text-xs text-gray-400">Drawing scene...</p>
            </div>
          </div>
        ) : imageData?.imageUrl ? (
          <>
            <img
              src={imageData.imageUrl}
              alt="Story panel"
              className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
            />
            {/* Bottom gradient overlay for text readability */}
            <div className="absolute inset-0 bg-gradient-to-b from-transparent via-transparent to-black/60"></div>
          </>
        ) : (
          <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-gray-900 to-black">
            <p className="text-gray-500 text-sm">Unable to generate image</p>
          </div>
        )}
      </div>

      {/* Model Badge & Rating (if image generated) */}
      {imageData?.model && imageData.model !== 'failed' && (
        <div className="px-6 py-3 bg-black/40 border-b border-white/10 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-xs text-gray-400">Generated with:</span>
            <span
              className="text-xs font-mono px-2 py-1 rounded"
              style={{
                backgroundColor: `${primaryColor}20`,
                color: primaryColor,
              }}
            >
              {imageData.model}
            </span>
          </div>

          {/* 5-Star Rating */}
          {!userRating ? (
            <div className="flex gap-1">
              {[1, 2, 3, 4, 5].map((star) => (
                <button
                  key={star}
                  onClick={() => handleRating(star)}
                  className="text-lg hover:scale-125 transition-transform cursor-pointer"
                  style={{ color: primaryColor }}
                  title={`Rate ${star} star${star > 1 ? 's' : ''}`}
                >
                  ☆
                </button>
              ))}
            </div>
          ) : (
            <div className="flex gap-1">
              {[1, 2, 3, 4, 5].map((star) => (
                <span
                  key={star}
                  className="text-lg"
                  style={{ color: star <= userRating ? primaryColor : '#404040' }}
                >
                  ★
                </span>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Comic Panel Content */}
      <div className="p-6 md:p-8 space-y-6">
        {/* Speech Bubble Style Narrative */}
        <div
          className="relative p-4 rounded-lg border-2"
          style={{
            borderColor: primaryColor,
            backgroundColor: `${primaryColor}10`,
          }}
        >
          {/* Speech bubble tail */}
          <div
            className="absolute -bottom-3 left-6 w-0 h-0 border-l-4 border-r-4 border-t-4 border-l-transparent border-r-transparent"
            style={{ borderTopColor: primaryColor }}
          ></div>

          <p className="text-gray-100 text-base md:text-lg leading-relaxed font-medium">
            {narrativeText}
          </p>
        </div>

        {/* Action Choices */}
        {options.length > 0 && (
          <div className="pt-4 space-y-3">
            <p className="text-xs text-gray-400 uppercase tracking-wider font-bold">What happens next?</p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {options.map((option) => (
                <button
                  key={option.id}
                  onClick={() => onOptionSelect(option)}
                  disabled={isWaiting}
                  className="group relative text-left p-4 rounded-lg border-2 transition-all duration-200 disabled:opacity-50 hover:scale-105 active:scale-95"
                  style={{
                    borderColor: primaryColor,
                    backgroundColor: `${primaryColor}10`,
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.backgroundColor = `${primaryColor}30`
                    e.currentTarget.style.boxShadow = `0 0 20px ${primaryColor}40`
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.backgroundColor = `${primaryColor}10`
                    e.currentTarget.style.boxShadow = 'none'
                  }}
                >
                  {/* Option Number Badge */}
                  <div
                    className="inline-flex items-center justify-center w-8 h-8 rounded-full font-bold text-white mb-2"
                    style={{
                      backgroundColor: primaryColor,
                    }}
                  >
                    {option.id}
                  </div>

                  {/* Option Text */}
                  <p className="font-semibold text-gray-100 text-sm md:text-base leading-tight">
                    {option.text}
                  </p>
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
