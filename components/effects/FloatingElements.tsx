'use client'

import { motion } from 'framer-motion'
import { useReducedMotion } from 'framer-motion'
import { ReactNode } from 'react'

interface FloatingElementProps {
  children: ReactNode
  delay?: number
  duration?: number
  distance?: number
  className?: string
}

export function FloatingElement({
  children,
  delay = 0,
  duration = 4,
  distance = 10,
  className = '',
}: FloatingElementProps) {
  const prefersReducedMotion = useReducedMotion()

  if (prefersReducedMotion) {
    return <div className={className}>{children}</div>
  }

  return (
    <motion.div
      className={className}
      animate={{
        y: [-distance, distance, -distance],
      }}
      transition={{
        duration,
        repeat: Infinity,
        ease: 'easeInOut',
        delay,
      }}
    >
      {children}
    </motion.div>
  )
}

interface FloatingIconProps {
  icon: ReactNode
  className?: string
  size?: 'sm' | 'md' | 'lg'
  color?: string
}

export function FloatingIcon({
  icon,
  className = '',
  size = 'md',
  color = 'rgba(139, 92, 246, 0.3)',
}: FloatingIconProps) {
  const prefersReducedMotion = useReducedMotion()
  
  const sizeClasses = {
    sm: 'w-8 h-8',
    md: 'w-12 h-12',
    lg: 'w-16 h-16',
  }

  if (prefersReducedMotion) {
    return (
      <div
        className={`${sizeClasses[size]} ${className}`}
        style={{ color }}
      >
        {icon}
      </div>
    )
  }

  return (
    <motion.div
      className={`${sizeClasses[size]} ${className}`}
      style={{ color }}
      animate={{
        y: [-8, 8, -8],
        rotate: [-5, 5, -5],
        scale: [1, 1.1, 1],
      }}
      transition={{
        duration: 5,
        repeat: Infinity,
        ease: 'easeInOut',
      }}
    >
      {icon}
    </motion.div>
  )
}

interface GlowEffectProps {
  children: ReactNode
  color?: string
  intensity?: 'low' | 'medium' | 'high'
  className?: string
}

export function GlowEffect({
  children,
  color = 'rgba(139, 92, 246, 0.5)',
  intensity = 'medium',
  className = '',
}: GlowEffectProps) {
  const prefersReducedMotion = useReducedMotion()
  
  const intensityMap = {
    low: { blur: 20, spread: 10 },
    medium: { blur: 40, spread: 20 },
    high: { blur: 60, spread: 30 },
  }

  const { blur, spread } = intensityMap[intensity]

  if (prefersReducedMotion) {
    return (
      <div
        className={className}
        style={{
          boxShadow: `0 0 ${blur}px ${spread}px ${color}`,
        }}
      >
        {children}
      </div>
    )
  }

  return (
    <motion.div
      className={className}
      animate={{
        boxShadow: [
          `0 0 ${blur * 0.5}px ${spread * 0.5}px ${color}`,
          `0 0 ${blur}px ${spread}px ${color}`,
          `0 0 ${blur * 0.5}px ${spread * 0.5}px ${color}`,
        ],
      }}
      transition={{
        duration: 3,
        repeat: Infinity,
        ease: 'easeInOut',
      }}
    >
      {children}
    </motion.div>
  )
}

interface PulseRingProps {
  className?: string
  color?: string
  size?: number
}

export function PulseRing({ className = '', color = 'rgba(139, 92, 246, 0.5)', size = 100 }: PulseRingProps) {
  const prefersReducedMotion = useReducedMotion()

  if (prefersReducedMotion) {
    return (
      <div
        className={`rounded-full ${className}`}
        style={{
          width: size,
          height: size,
          border: `2px solid ${color}`,
        }}
      />
    )
  }

  return (
    <div className={`relative ${className}`} style={{ width: size, height: size }}>
      {[0, 1, 2].map((i) => (
        <motion.div
          key={i}
          className="absolute inset-0 rounded-full"
          style={{
            border: `2px solid ${color}`,
          }}
          initial={{ scale: 0.8, opacity: 1 }}
          animate={{
            scale: [0.8, 1.5],
            opacity: [0.8, 0],
          }}
          transition={{
            duration: 2,
            repeat: Infinity,
            delay: i * 0.6,
            ease: 'easeOut',
          }}
        />
      ))}
      <div
        className="absolute inset-0 rounded-full flex items-center justify-center"
        style={{ background: `${color}20` }}
      />
    </div>
  )
}

interface SparkleProps {
  className?: string
  color?: string
}

export function Sparkle({ className = '', color = '#FFD700' }: SparkleProps) {
  const prefersReducedMotion = useReducedMotion()

  const path = (
    <path
      d="M12 0L14.59 9.41L24 12L14.59 14.59L12 24L9.41 14.59L0 12L9.41 9.41L12 0Z"
      fill={color}
    />
  )

  if (prefersReducedMotion) {
    return (
      <svg className={`w-4 h-4 ${className}`} viewBox="0 0 24 24">
        {path}
      </svg>
    )
  }

  return (
    <motion.svg
      className={`w-4 h-4 ${className}`}
      viewBox="0 0 24 24"
      animate={{
        scale: [0, 1, 0],
        rotate: [0, 180, 360],
        opacity: [0, 1, 0],
      }}
      transition={{
        duration: 2,
        repeat: Infinity,
        ease: 'easeInOut',
      }}
    >
      {path}
    </motion.svg>
  )
}
