'use client'

import { useState, useEffect } from 'react'
import { X, ChevronRight } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { ProgressBar } from '@/components/ui/ProgressBar'

interface OnboardingModalProps {
  isOpen: boolean
  onClose: () => void
}

export function OnboardingModal({ isOpen, onClose }: OnboardingModalProps) {
  const [currentStep, setCurrentStep] = useState(0)
  
  const steps = [
    {
      title: "Welcome to WritArcade",
      description: "Turn any article into an interactive, mintable game powered by AI",
      visual: "🎮",
      content: "Your creative playground for game creation"
    },
    {
      title: "Step 1: Choose Your Content",
      description: "Paste an article URL or describe your game idea",
      visual: "📝",
      content: "Works with Substack, Medium, blogs, news articles, or your own ideas"
    },
    {
      title: "Step 2: Customize (Optional)",
      description: "Pick your game style: Horror? Comedy? Mystery?",
      visual: "⚙️",
      content: "Customize difficulty and genre using Writer Coins for advanced features"
    },
    {
      title: "Step 3: Play Your Game",
      description: "Experience your unique AI-generated game interpretation",
      visual: "🎯",
      content: "Every game is unique based on your input and customization"
    },
    {
      title: "Step 4: Mint as NFT",
      description: "Own your creation and earn from future plays",
      visual: "✨",
      content: "Mint your game as an NFT and share it with the world"
    }
  ]

  const handleNext = () => {
    if (currentStep < steps.length - 1) {
      setCurrentStep(currentStep + 1)
    } else {
      onClose()
    }
  }

  const handleSkip = () => {
    onClose()
  }

  if (!isOpen) return null

  const step = steps[currentStep]
  const progress = ((currentStep + 1) / steps.length) * 100

  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-gradient-to-br from-gray-900 to-black border border-purple-500/30 rounded-2xl max-w-md w-full shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-purple-500/20">
          <h2 className="text-lg font-bold bg-gradient-to-r from-purple-400 to-pink-400 text-transparent bg-clip-text">
            Getting Started
          </h2>
          <button
            onClick={handleSkip}
            className="text-gray-400 hover:text-gray-200 transition-colors"
            aria-label="Close"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-8 space-y-6">
          {/* Visual */}
          <div className="text-center">
            <div className="text-6xl mb-4">{step.visual}</div>
            <h3 className="text-2xl font-bold mb-2">{step.title}</h3>
            <p className="text-gray-300 text-sm">{step.description}</p>
          </div>

          {/* Content Details */}
          <div className="bg-purple-900/20 border border-purple-600/30 rounded-lg p-4">
            <p className="text-gray-200 text-sm">{step.content}</p>
          </div>

          {/* Progress Bar */}
          <ProgressBar
            value={progress}
            label={`Step ${currentStep + 1} of ${steps.length}`}
            percent
          />
        </div>

        {/* Footer */}
        <div className="flex gap-3 p-6 border-t border-purple-500/20">
          <Button
            variant="outline"
            onClick={handleSkip}
            className="flex-1 text-gray-300 border-gray-600 hover:bg-gray-800"
          >
            Skip
          </Button>
          <Button
            onClick={handleNext}
            className="flex-1 bg-purple-600 hover:bg-purple-700 flex items-center justify-center gap-2"
          >
            {currentStep === steps.length - 1 ? 'Start' : 'Next'}
            <ChevronRight className="w-4 h-4" />
          </Button>
        </div>

        {/* Dots Navigation */}
        <div className="flex justify-center gap-2 pb-4">
          {steps.map((_, idx) => (
            <button
              key={idx}
              onClick={() => setCurrentStep(idx)}
              className={`w-2 h-2 rounded-full transition-all ${
                idx === currentStep ? 'bg-purple-500 w-6' : 'bg-gray-600'
              }`}
              aria-label={`Go to step ${idx + 1}`}
            />
          ))}
        </div>
      </div>
    </div>
  )
}
