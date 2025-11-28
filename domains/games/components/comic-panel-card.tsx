'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { Button } from '@/components/ui/button'
import { Loader2 } from 'lucide-react'
import { GameplayOption } from '../types'
import { ImageGenerationService, ImageGenerationResult } from '../services/image-generation.service'
import { parsePanel } from '../utils/text-parser'

interface ComicPanelCardProps {
  messageId: string
  narrativeText: string
  genre: string
  primaryColor: string
  options: GameplayOption[]
  onOptionSelect: (option: GameplayOption) => void
  isWaiting: boolean
  onImageGenerated?: (result: ImageGenerationResult) => void
  onImageRating?: (rating: number) => void
  onImagesReady?: () => void
  pendingOptionId?: number | null
  responseReady?: { text: boolean; images: boolean }
  narrativeImage?: string | null
  imageModel?: string
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
  pendingOptionId,
  responseReady,
  narrativeImage,
  imageModel,
}: ComicPanelCardProps) {
  const { narrative, options: parsedOptions } = parsePanel(narrativeText)
  const [imageRating, setImageRating] = useState<number | null>(null)
  const messageIdRef = useRef(messageId)

  // Reset rating when messageId changes
  useEffect(() => {
    if (messageIdRef.current !== messageId) {
      messageIdRef.current = messageId
      setImageRating(null)
    }
  }, [messageId])

  const handleRating = (rating: number) => {
    setImageRating(rating)
    onImageRating?.(rating)
  }

  const choiceOptions = parsedOptions.length > 0 ? parsedOptions : options.map(o => o.text)

  return (
    <div className="w-full max-w-7xl mx-auto">
      {/* Comic Panel Container - Stacked layout with full-width image */}
      <div
        className="rounded-lg shadow-2xl overflow-hidden transition-all duration-500 ease-out"
        style={{
          backgroundColor: 'rgba(0,0,0,0.5)',
          border: `3px solid ${primaryColor}`,
          boxShadow: `0 20px 40px rgba(0,0,0,0.6), 0 0 20px ${primaryColor}20`,
        }}
      >
        {/* Image Section - Full Width */}
        <div className="w-full bg-black relative overflow-hidden">
          {/* Comic book frame effect */}
          <div 
            className="absolute inset-0 pointer-events-none"
            style={{
              background: `linear-gradient(90deg, transparent 0%, ${primaryColor}08 50%, transparent 100%)`,
            }}
          />
          
          {/* Image container - responsive height */}
          <div className="w-full h-64 md:h-80 lg:h-96 overflow-hidden">
            {narrativeImage ? (
              <>
                <img
                  src={narrativeImage}
                  alt="Story panel"
                  className="w-full h-full object-cover"
                />
                {/* Subtle vignette overlay */}
                <div className="absolute inset-0 bg-gradient-to-br from-transparent via-transparent to-black/20 pointer-events-none" />
                
                {/* Info badges */}
                <div className="absolute top-4 left-4 flex items-center gap-2">
                   {/* Model badge */}
                   <span className="text-xs font-mono px-3 py-1.5 rounded-md bg-black/85 text-white/80 backdrop-blur-sm border border-white/10">
                     {imageModel || 'unknown'}
                   </span>
                 </div>
                 
                 {/* Rating stars - right side */}
                 <div className="absolute top-4 right-4 flex gap-1 bg-black/70 px-3 py-1.5 rounded-md backdrop-blur-sm border border-white/10">
                   {!imageRating ? (
                     <>
                       {[1, 2, 3, 4, 5].map((star) => (
                         <button
                           key={star}
                           onClick={() => handleRating(star)}
                           className="text-base hover:scale-125 transition-all duration-200 cursor-pointer text-white/50 hover:text-white"
                           aria-label={`Rate ${star} stars`}
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
                           className="text-base transition-colors duration-300"
                           style={{ color: star <= imageRating ? primaryColor : 'rgba(64,64,64,0.5)' }}
                         >
                           ★
                         </span>
                       ))}
                     </>
                   )}
                 </div>
               </>
             ) : (
               <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-gray-800 to-black relative">
                 <div className="text-center">
                   <Loader2 className="w-8 h-8 animate-spin mx-auto mb-2" style={{ color: primaryColor }} />
                   <p className="text-gray-400 text-sm">Generating visual...</p>
                 </div>
               </div>
             )}
           </div>
         </div>

        {/* Content Section - Full Width Below Image */}
        <div className="w-full p-6 lg:p-8 flex flex-col gap-6 bg-gradient-to-b from-black/30 to-black/10">
          
          {/* Narrative Text */}
          <div className="flex flex-col">
            {/* Subtle label */}
            <div className="mb-3 pb-3 border-b" style={{ borderColor: `${primaryColor}30` }}>
              <span className="text-xs font-semibold text-gray-400 uppercase tracking-widest">Scene</span>
            </div>
            
            {/* Main narrative - larger and more readable */}
            <p className="text-base lg:text-lg leading-relaxed text-gray-100 font-medium">
              {narrative}
            </p>
          </div>

          {/* Choice Options - Spanning Full Width Below */}
          {choiceOptions.length > 0 && (
            <div className="flex flex-col gap-4">
              <div className="pt-2 border-t" style={{ borderColor: `${primaryColor}30` }}>
                <h4 className="text-xs font-semibold text-gray-400 uppercase tracking-widest mb-4">
                  Your next move
                </h4>
                
                {/* Grid layout - 1 col on mobile, 2 on tablet, 4 on desktop */}
                 <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
                   {choiceOptions.map((option, idx) => {
                     const optionId = idx + 1
                     const isSelected = pendingOptionId === optionId
                     const isLoading = isSelected && isWaiting
                     const textReady = isSelected && responseReady?.text
                     const imagesReady = isSelected && responseReady?.images
                     
                     return (
                       <button
                         key={idx}
                         onClick={() => onOptionSelect({ id: optionId, text: option })}
                         disabled={isWaiting}
                         className="group relative p-4 rounded-lg border-2 text-left transition-all duration-200 hover:shadow-lg hover:shadow-current disabled:opacity-50 disabled:cursor-not-allowed"
                         style={{
                           borderColor: isSelected ? primaryColor : `${primaryColor}50`,
                           backgroundColor: isSelected ? `${primaryColor}20` : `${primaryColor}08`,
                           color: 'white',
                         }}
                         onMouseEnter={(e) => {
                           if (!isSelected) {
                             e.currentTarget.style.borderColor = `${primaryColor}80`
                             e.currentTarget.style.backgroundColor = `${primaryColor}15`
                           }
                         }}
                         onMouseLeave={(e) => {
                           if (!isSelected) {
                             e.currentTarget.style.borderColor = `${primaryColor}50`
                             e.currentTarget.style.backgroundColor = `${primaryColor}08`
                           }
                         }}
                       >
                         {/* Top animated bar indicator */}
                         <div 
                           className={`absolute top-0 left-0 right-0 transition-all duration-300 ${isSelected ? 'h-1' : 'h-0 group-hover:h-1'}`}
                           style={{ backgroundColor: primaryColor }}
                         />
                         
                         <div className="flex gap-3 items-start">
                           <span 
                             className="w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0 transition-all duration-200 mt-0.5"
                             style={{ backgroundColor: `${primaryColor}70` }}
                           >
                             {isLoading ? (
                               <Loader2 className="w-3 h-3 animate-spin" />
                             ) : (
                               optionId
                             )}
                           </span>
                           <div className="flex-1">
                             <span className="leading-snug font-medium text-sm">
                               {option}
                             </span>
                             {isSelected && isWaiting && (
                               <div className="mt-2 space-y-1.5 text-xs">
                                 <div className="flex items-center gap-2">
                                   <div className={`w-1.5 h-1.5 rounded-full transition-all ${textReady ? 'bg-green-500' : 'bg-yellow-500 animate-pulse'}`} />
                                   <span className="text-gray-400">Crafting narrative {textReady && '✓'}</span>
                                 </div>
                                 <div className="flex items-center gap-2">
                                   <div className={`w-1.5 h-1.5 rounded-full transition-all ${imagesReady ? 'bg-green-500' : 'bg-gray-600 animate-pulse'}`} />
                                   <span className="text-gray-400">Generating visuals {imagesReady && '✓'}</span>
                                 </div>
                               </div>
                             )}
                           </div>
                         </div>
                       </button>
                     )
                   })}
                 </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
