'use client'

import { useState, useEffect, useRef } from 'react'
import { motion } from 'framer-motion'
import { ZoomIn, Loader2 } from 'lucide-react'
import { GameplayOption } from '../types'
import { parsePanel } from '../utils/text-parser'
import { ImageLightbox } from './image-lightbox'
import { TypewriterEffect } from './typewriter-effect'
import { AnimatedOptionButton } from './animated-option-button'

interface ComicPanelCardProps {
  messageId: string
  narrativeText: string
  genre: string
  primaryColor: string
  options: GameplayOption[]
  onOptionSelect: (option: GameplayOption) => void
  isWaiting: boolean
  onImageGenerated?: (result: any) => void
  onImageRating?: (rating: number) => void
  onImagesReady?: () => void
  pendingOptionId?: number | null
  responseReady?: { text: boolean; images: boolean }
  narrativeImage?: string | null
  imageModel?: string
  shouldRevealContent?: boolean
  showLoadingState?: boolean
}

export function ComicPanelCard({
  messageId,
  narrativeText,
  genre,
  primaryColor,
  options,
  onOptionSelect,
  isWaiting,
  onImageRating,
  onImagesReady,
  pendingOptionId,
  narrativeImage,
  imageModel,
  shouldRevealContent = true,
  showLoadingState = false,
}: ComicPanelCardProps) {
  const { narrative, options: parsedOptions } = parsePanel(narrativeText)
  const [imageRating, setImageRating] = useState<number | null>(null)
  const [isImageExpanded, setIsImageExpanded] = useState(false)
  const [revealAnimation, setRevealAnimation] = useState(false)
  const messageIdRef = useRef(messageId)

  // Reset rating and trigger reveal animation when messageId changes
  useEffect(() => {
    if (messageIdRef.current !== messageId) {
      messageIdRef.current = messageId
      setImageRating(null)
      setRevealAnimation(true)
    }
  }, [messageId])

  // Trigger reveal animation when content should be shown
  useEffect(() => {
    if (shouldRevealContent) {
      setRevealAnimation(true)
    }
  }, [shouldRevealContent])

  const handleRating = (rating: number) => {
    setImageRating(rating)
    onImageRating?.(rating)
  }

  const choiceOptions = parsedOptions.length > 0 ? parsedOptions : options.map(o => o.text)

  const handleImageExpand = () => {
    setIsImageExpanded(true)
  }

  return (
    <>
      <ImageLightbox
        isOpen={isImageExpanded}
        imageUrl={narrativeImage || null}
        imageModel={imageModel}
        narrativeText={narrative}
        primaryColor={primaryColor}
        onClose={() => setIsImageExpanded(false)}
      />
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
        <div className="w-full bg-black relative overflow-hidden group">
          {/* Comic book frame effect */}
          <div 
            className="absolute inset-0 pointer-events-none"
            style={{
              background: `linear-gradient(90deg, transparent 0%, ${primaryColor}08 50%, transparent 100%)`,
            }}
          />
           
          {/* Image container - responsive height with better mobile scaling */}
          <div className="w-full h-48 sm:h-64 md:h-80 lg:h-96 overflow-hidden cursor-pointer relative" onClick={handleImageExpand}>
            {narrativeImage ? (
              <>
                <img
                  src={narrativeImage}
                  alt="Story panel"
                  className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                />
                {/* Subtle vignette overlay */}
                <div className="absolute inset-0 bg-gradient-to-br from-transparent via-transparent to-black/20 pointer-events-none" />
                
                {/* Expand button overlay with enhanced micro-interaction */}
                <motion.button
                  onClick={(e) => {
                    e.stopPropagation()
                    handleImageExpand()
                  }}
                  className="absolute inset-0 flex items-center justify-center bg-black/0 group-hover:bg-black/30 transition-all duration-200 opacity-0 group-hover:opacity-100"
                  aria-label="Expand image"
                  whileHover={{ scale: 1.1 }}
                  whileTap={{ scale: 0.95 }}
                  transition={{ type: "spring", stiffness: 400, damping: 10 }}
                >
                  <motion.div
                    className="p-3 rounded-lg bg-black/60 backdrop-blur-sm hover:bg-black/80 transition-colors"
                    whileHover={{ rotate: 5 }}
                    whileTap={{ rotate: 0, scale: 0.9 }}
                  >
                    <ZoomIn className="w-5 h-5" style={{ color: primaryColor }} />
                  </motion.div>
                </motion.button>
                
                {/* Info badges */}
                <div className="absolute top-4 left-4 flex items-center gap-2">
                   {/* Model badge */}
                   <span className="text-xs font-mono px-3 py-1.5 rounded-md bg-black/85 text-white/80 backdrop-blur-sm border border-white/10">
                     {imageModel || 'unknown'}
                   </span>
                 </div>
                 
                 {/* Rating stars - right side with better mobile touch targets */}
                 <div className="absolute top-4 right-4 flex gap-1 bg-black/70 px-3 py-1.5 rounded-md backdrop-blur-sm border border-white/10">
                   {!imageRating ? (
                     <>
                       {[1, 2, 3, 4, 5].map((star) => (
                         <button
                           key={star}
                           onClick={() => handleRating(star)}
                           className="text-lg sm:text-base hover:scale-125 transition-all duration-200 cursor-pointer text-white/50 hover:text-white p-1"
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
                           className="text-lg sm:text-base transition-colors duration-300"
                           style={{ color: star <= imageRating ? primaryColor : 'rgba(64,64,64,0.5)' }}
                         >
                           ★
                         </span>
                       ))}
                     </>
                   )}
                 </div>
               </>
             ) : showLoadingState ? (
               <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-gray-800 to-black relative">
                 <div className="text-center">
                   <Loader2 className="w-8 h-8 animate-spin mx-auto mb-2" style={{ color: primaryColor }} />
                   <p className="text-gray-400 text-sm">Preparing next panel...</p>
                 </div>
               </div>
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
          <div className="flex flex-col min-h-24">
            {/* Subtle label */}
            <div className="mb-3 pb-3 border-b" style={{ borderColor: `${primaryColor}30` }}>
              <span className="text-xs font-semibold text-gray-400 uppercase tracking-widest">Scene</span>
            </div>
            
            {/* Main narrative - with typewriter reveal */}
            <p className="text-base lg:text-lg leading-relaxed text-gray-100 font-medium">
              <TypewriterEffect
                text={narrative}
                isVisible={revealAnimation}
                duration={400}
              />
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
                     return (
                       <AnimatedOptionButton
                         key={idx}
                         option={option}
                         optionId={optionId}
                         isSelected={pendingOptionId === optionId}
                         isWaiting={isWaiting}
                         primaryColor={primaryColor}
                         disabled={isWaiting}
                         onClick={() => onOptionSelect({ id: optionId, text: option })}
                       />
                     )
                   })}
                 </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
    </>
  )
}
