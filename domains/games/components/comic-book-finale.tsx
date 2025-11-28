'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { ChevronLeft, Share2, Download, Zap } from 'lucide-react'
import type { ChatMessage, GameplayOption } from '../types'
import { ImageLightbox } from './image-lightbox'

export interface ComicBookFinalePanelData {
  id: string
  narrativeText: string
  imageUrl: string | null
  imageModel: string
  userChoice?: string
}

interface ComicBookFinaleProps {
  gameTitle: string
  genre: string
  primaryColor: string
  panels: ComicBookFinalePanelData[]
  onBack: () => void
  onMint: (panelData: ComicBookFinalePanelData[]) => void
  isMinting?: boolean
}

export function ComicBookFinale({
  gameTitle,
  genre,
  primaryColor,
  panels,
  onBack,
  onMint,
  isMinting = false,
}: ComicBookFinaleProps) {
  const [currentPanelIndex, setCurrentPanelIndex] = useState(0)
  const [isImageExpanded, setIsImageExpanded] = useState(false)
  const currentPanel = panels[currentPanelIndex]
  const totalPanels = panels.length

  const handleNext = () => {
    if (currentPanelIndex < totalPanels - 1) {
      setCurrentPanelIndex(currentPanelIndex + 1)
    }
  }

  const handlePrev = () => {
    if (currentPanelIndex > 0) {
      setCurrentPanelIndex(currentPanelIndex - 1)
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (isImageExpanded) return // Lightbox handles navigation
    if (e.key === 'ArrowRight') handleNext()
    if (e.key === 'ArrowLeft') handlePrev()
  }

  return (
    <>
      <ImageLightbox
        isOpen={isImageExpanded}
        imageUrl={currentPanel.imageUrl}
        imageModel={currentPanel.imageModel}
        narrativeText={currentPanel.narrativeText}
        panelNumber={currentPanelIndex + 1}
        totalPanels={totalPanels}
        primaryColor={primaryColor}
        onClose={() => setIsImageExpanded(false)}
        onNavigate={(direction) => {
          if (direction === 'next' && currentPanelIndex < totalPanels - 1) {
            setCurrentPanelIndex(currentPanelIndex + 1)
          } else if (direction === 'prev' && currentPanelIndex > 0) {
            setCurrentPanelIndex(currentPanelIndex - 1)
          }
        }}
        canNavigatePrev={currentPanelIndex > 0}
        canNavigateNext={currentPanelIndex < totalPanels - 1}
      />
      <div
      className="min-h-screen w-full flex flex-col"
      style={{
        background: `linear-gradient(135deg, ${primaryColor}05, black)`,
      }}
      onKeyDown={handleKeyDown}
      tabIndex={0}
    >
      {/* Header */}
      <div className="border-b border-white/10 px-4 md:px-8 py-4">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button
              onClick={onBack}
              className="p-2 hover:bg-white/10 rounded-lg transition-colors"
              title="Back to gameplay"
            >
              <ChevronLeft className="w-6 h-6" />
            </button>
            <div>
              <h1 className="text-2xl md:text-3xl font-bold">{gameTitle}</h1>
              <p className="text-sm text-gray-400">
                {genre} • Your Complete Story
              </p>
            </div>
          </div>

          {/* Panel counter */}
          <div className="text-right">
            <div
              className="text-2xl font-bold"
              style={{ color: primaryColor }}
            >
              {currentPanelIndex + 1}/{totalPanels}
            </div>
            <p className="text-xs text-gray-400">Panels</p>
          </div>
        </div>
      </div>

      {/* Main content */}
      <div className="flex-1 overflow-y-auto flex flex-col items-center justify-center p-4 md:p-8">
        <div className="w-full max-w-4xl space-y-6">
          {/* Large panel display */}
          <div
            className="rounded-xl overflow-hidden border-4 shadow-2xl"
            style={{
              borderColor: primaryColor,
              backgroundColor: 'rgba(0,0,0,0.4)',
            }}
          >
            {/* Image */}
            <div
              className="w-full h-96 md:h-[28rem] overflow-hidden bg-black relative group cursor-pointer"
              onClick={() => currentPanel.imageUrl && setIsImageExpanded(true)}
            >
              {currentPanel.imageUrl ? (
                <>
                  <img
                    src={currentPanel.imageUrl}
                    alt={`Panel ${currentPanelIndex + 1}`}
                    className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                  />
                  <div className="absolute inset-0 bg-gradient-to-b from-transparent via-transparent to-black/60"></div>
                  <div className="absolute inset-0 flex items-center justify-center bg-black/0 group-hover:bg-black/20 transition-all duration-200 opacity-0 group-hover:opacity-100">
                    <div className="text-white text-sm font-medium">Click to expand</div>
                  </div>
                </>
              ) : (
                <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-gray-900 to-black">
                  <p className="text-gray-500">No image available</p>
                </div>
              )}
            </div>

            {/* Model badge */}
            <div className="px-6 py-3 bg-black/40 border-b border-white/10 flex items-center gap-2">
              <span className="text-xs text-gray-400">Generated with:</span>
              <span
                className="text-xs font-mono px-2 py-1 rounded"
                style={{
                  backgroundColor: `${primaryColor}20`,
                  color: primaryColor,
                }}
              >
                {currentPanel.imageModel}
              </span>
            </div>

            {/* Narrative in speech bubble */}
            <div className="p-6 md:p-8 space-y-4">
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
                  {currentPanel.narrativeText}
                </p>
              </div>

              {/* User choice indicator */}
              {currentPanel.userChoice && (
                <div
                  className="p-3 rounded-lg text-sm"
                  style={{
                    backgroundColor: `${primaryColor}15`,
                    borderLeft: `3px solid ${primaryColor}`,
                  }}
                >
                  <p className="text-gray-300">
                    <span className="text-gray-500">Your choice: </span>
                    <span className="font-semibold">{currentPanel.userChoice}</span>
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* Navigation controls */}
          <div className="flex items-center justify-between">
            <Button
              onClick={handlePrev}
              disabled={currentPanelIndex === 0}
              className="px-4 py-2"
              variant="outline"
            >
              ← Previous
            </Button>

            {/* Page indicator */}
            <div className="flex items-center gap-2">
              {panels.map((_, idx) => (
                <button
                  key={idx}
                  onClick={() => setCurrentPanelIndex(idx)}
                  className="w-3 h-3 rounded-full transition-all"
                  style={{
                    backgroundColor:
                      idx === currentPanelIndex ? primaryColor : 'rgba(255,255,255,0.2)',
                    width: idx === currentPanelIndex ? '32px' : '12px',
                  }}
                  title={`Go to panel ${idx + 1}`}
                />
              ))}
            </div>

            <Button
              onClick={handleNext}
              disabled={currentPanelIndex === totalPanels - 1}
              className="px-4 py-2"
              variant="outline"
            >
              Next →
            </Button>
          </div>
        </div>
      </div>

      {/* Footer - Action buttons */}
      <div
        className="border-t border-white/10 p-4 md:p-6 bg-gradient-to-t from-black via-black/80 to-transparent backdrop-blur-md"
        style={{
          boxShadow: `0 -4px 20px ${primaryColor}10`,
        }}
      >
        <div className="max-w-6xl mx-auto flex items-center justify-between flex-wrap gap-4">
          {/* Info */}
          <div className="text-sm text-gray-400">
            <p>
              {totalPanels} panels • {genre} game
            </p>
            <p className="text-xs mt-1">
              🎨 Created with WritArcade Comic Engine
            </p>
          </div>

          {/* Action buttons */}
          <div className="flex gap-3">
            <Button
              variant="outline"
              className="gap-2"
              title="Share your comic (coming soon)"
              disabled
            >
              <Share2 className="w-4 h-4" />
              Share
            </Button>

            <Button
              variant="outline"
              className="gap-2"
              title="Download your comic (coming soon)"
              disabled
            >
              <Download className="w-4 h-4" />
              Download
            </Button>

            <Button
              onClick={() => onMint(panels)}
              disabled={isMinting}
              className="gap-2"
              style={{
                backgroundColor: primaryColor,
                color: 'white',
              }}
            >
              <Zap className="w-4 h-4" />
              {isMinting ? 'Minting...' : 'Mint as NFT'}
            </Button>
          </div>
        </div>
      </div>
    </div>
    </>
  )
}
