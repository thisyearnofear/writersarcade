'use client'

import { useEffect, useState } from 'react'

interface TypewriterEffectProps {
  text: string
  isVisible: boolean
  duration?: number
  reverse?: boolean
  onComplete?: () => void
}

export function TypewriterEffect({
  text,
  isVisible,
  duration = 400,
  reverse = false,
  onComplete,
}: TypewriterEffectProps) {
  const [displayText, setDisplayText] = useState(reverse ? text : '')

  useEffect(() => {
    if (!isVisible) {
      setDisplayText(reverse ? text : '')
      return
    }

    const charCount = text.length
    const frameCount = Math.max(10, Math.floor(charCount / (duration / 16)))
    const charsPerFrame = charCount / frameCount
    let currentFrame = 0

    const interval = setInterval(() => {
      currentFrame++
      const progress = currentFrame / frameCount

      if (reverse) {
        setDisplayText(text.slice(0, Math.floor(text.length * (1 - progress))))
      } else {
        setDisplayText(text.slice(0, Math.floor(text.length * progress)))
      }

      if (progress >= 1) {
        clearInterval(interval)
        onComplete?.()
      }
    }, 16)

    return () => clearInterval(interval)
  }, [text, isVisible, duration, reverse, onComplete])

  return displayText
}
