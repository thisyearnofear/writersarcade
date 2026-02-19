'use client'

import Link from 'next/link'
import { useState, useRef } from 'react'
import { motion, useMotionValue, useSpring, useTransform, MotionValue } from 'framer-motion'
import { useReducedMotion } from 'framer-motion'
import { Game } from '../types'
import { Play, Zap, Crown, Trash2, Eye, EyeOff, Settings } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useAccount } from 'wagmi'
import { isAdmin } from '@/lib/constants'

interface GameCardEnhancedProps {
  game: Game
  isUserGame?: boolean
  onMintClick?: () => void
  onRegisterClick?: () => void
  onToggleVisibility?: (isPrivate: boolean) => void
  onSettingsClick?: () => void
  onDeleteClick?: () => void
  isLoading?: boolean
}

/**
 * Enhanced game card with 3D tilt effect and micro-interactions
 * Single source of truth for game card display across the app
 */
export function GameCardEnhanced({
  game,
  isUserGame = false,
  onMintClick,
  onRegisterClick,
  onToggleVisibility,
  onSettingsClick,
  onDeleteClick,
  isLoading = false,
}: GameCardEnhancedProps) {
  const [isHovered, setIsHovered] = useState(false)
  const { address } = useAccount()
  const userIsAdmin = isAdmin(address)
  const cardRef = useRef<HTMLDivElement>(null)
  const prefersReducedMotion = useReducedMotion()

  // Settings visible if owner OR admin
  const showSettings = isUserGame || userIsAdmin

  // 3D Tilt effect
  const x = useMotionValue(0.5)
  const y = useMotionValue(0.5)

  const rotateX = useSpring(useTransform(y, [0, 1], [8, -8]), {
    stiffness: 300,
    damping: 30,
  })
  const rotateY = useSpring(useTransform(x, [0, 1], [-8, 8]), {
    stiffness: 300,
    damping: 30,
  })

  const glareX = useTransform(x, [0, 1], ['0%', '100%'])
  const glareY = useTransform(y, [0, 1], ['0%', '100%'])

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!cardRef.current || prefersReducedMotion) return
    
    const rect = cardRef.current.getBoundingClientRect()
    const xPos = (e.clientX - rect.left) / rect.width
    const yPos = (e.clientY - rect.top) / rect.height
    
    x.set(xPos)
    y.set(yPos)
  }

  const handleMouseLeave = () => {
    setIsHovered(false)
    x.set(0.5)
    y.set(0.5)
  }

  const handleMouseEnter = () => {
    setIsHovered(true)
  }

  // Card animation variants
  const cardVariants = {
    hidden: { opacity: 0, y: 30, scale: 0.95 },
    visible: { 
      opacity: 1, 
      y: 0, 
      scale: 1,
      transition: {
        duration: 0.5,
        ease: [0.22, 1, 0.36, 1] as const,
      }
    },
  }

  return (
    <motion.div
      ref={cardRef}
      className="group relative"
      style={{
        rotateX: prefersReducedMotion ? 0 : rotateX,
        rotateY: prefersReducedMotion ? 0 : rotateY,
        transformStyle: 'preserve-3d',
        perspective: 1000,
      }}
      variants={cardVariants}
      initial="hidden"
      whileInView="visible"
      viewport={{ once: true, amount: 0.2 }}
      whileHover={prefersReducedMotion ? {} : { scale: 1.02, z: 50 }}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      onMouseEnter={handleMouseEnter}
    >
      <div className="relative bg-gray-900 border border-gray-800 rounded-lg overflow-hidden transition-colors duration-300 group-hover:border-purple-500/50">
        {/* Glare effect */}
        {!prefersReducedMotion && (
          <motion.div
            className="absolute inset-0 pointer-events-none z-20 rounded-lg"
            style={{
              background: useTransform(
                [glareX, glareY],
                ([latestX, latestY]) => {
                  return `radial-gradient(circle at ${latestX} ${latestY}, rgba(255,255,255,0.1) 0%, transparent 50%)`
                }
              ),
            }}
          />
        )}

        {/* Blend layer 1: Multiply blend for depth with enhanced animation */}
        <motion.div
          className="absolute inset-0 rounded-lg pointer-events-none"
          animate={{
            opacity: isHovered ? 0.15 : 0,
            scale: isHovered ? 1.02 : 1,
          }}
          transition={{ duration: 0.4, ease: "easeOut" }}
          style={{
            background: `linear-gradient(135deg, ${game.primaryColor || '#8b5cf6'}40, ${game.primaryColor || '#8b5cf6'}10)`,
            mixBlendMode: 'multiply',
          }}
        />

        {/* Blend layer 2: Lighten for shimmer with enhanced animation */}
        <motion.div
          className="absolute inset-0 rounded-lg pointer-events-none"
          animate={{
            opacity: isHovered ? 0.1 : 0,
            x: isHovered ? [0, 100, 0] : 0,
          }}
          transition={{
            opacity: { duration: 0.4 },
            x: { duration: 2, repeat: Infinity, ease: "easeInOut" }
          }}
          style={{
            background: `linear-gradient(90deg, transparent, rgba(255,255,255,0.15), transparent)`,
            mixBlendMode: 'lighten',
          }}
        />

        {/* Header with gradient and animated border */}
        <motion.div
          className="relative h-24 bg-gradient-to-br overflow-hidden"
          animate={{
            opacity: isHovered ? 1 : 0.85,
          }}
          transition={{ duration: 0.3 }}
          style={{
            background: `linear-gradient(135deg, ${game.primaryColor || '#8b5cf6'}40, ${game.primaryColor || '#8b5cf6'}10)`,
            borderBottom: `2px solid ${game.primaryColor || '#8b5cf6'}`,
          }}
        >
          {/* Animated gradient overlay on hover */}
          <motion.div
            className="absolute inset-0"
            style={{
              background: `linear-gradient(45deg, transparent, ${game.primaryColor || '#8b5cf6'}20, transparent)`,
            }}
            animate={{
              x: isHovered ? ['-100%', '100%'] : '-100%',
            }}
            transition={{
              duration: 1.5,
              ease: 'easeInOut',
            }}
          />
        </motion.div>

        {/* Content */}
        <div className="relative p-6 space-y-3 z-10">
          {/* Genre & Status */}
          <div className="flex items-start justify-between">
            <motion.span
              className="inline-block px-2 py-1 text-xs rounded-full border"
              style={{
                borderColor: game.primaryColor || '#8b5cf6',
                color: game.primaryColor || '#8b5cf6',
                backgroundColor: `${game.primaryColor || '#8b5cf6'}20`,
              }}
              whileHover={{ scale: 1.05 }}
              transition={{ type: 'spring', stiffness: 400, damping: 10 }}
            >
              {game.genre}
            </motion.span>
            {isUserGame && (
              <div className="flex items-center gap-2">
                <motion.span 
                  className={`text-xs px-2 py-1 rounded ${game.private ? 'bg-red-500/20 text-red-300' : 'bg-green-500/20 text-green-300'}`}
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ type: 'spring', stiffness: 500, damping: 15 }}
                >
                  {game.private ? 'Private' : 'Public'}
                </motion.span>
                {game.nftTokenId && (
                  <motion.span 
                    className="text-xs px-2 py-1 rounded bg-yellow-500/20 text-yellow-300 border border-yellow-500/30"
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    transition={{ type: 'spring', stiffness: 500, damping: 15, delay: 0.1 }}
                  >
                    Minted
                  </motion.span>
                )}
              </div>
            )}
          </div>

          {/* Title & Tagline with responsive sizing */}
          <div>
            <motion.h3 
              className="text-base sm:text-lg font-bold text-white mb-1 group-hover:text-purple-400 transition-colors line-clamp-2"
              layout
            >
              {game.title}
            </motion.h3>
            <p className="text-xs sm:text-sm text-gray-400 line-clamp-2 italic uppercase">
              {game.tagline}
            </p>
          </div>

          {/* Description with responsive sizing */}
          <p className="text-xs sm:text-sm text-gray-400 line-clamp-3">
            {game.description}
          </p>

          {/* Meta */}
          <div className="text-xs text-gray-500 space-y-1 pt-2 border-t border-gray-800">
            <div className="flex justify-between">
              <span>Created {new Date(game.createdAt).toLocaleDateString()}</span>
              <span className="text-gray-600">{game.subgenre}</span>
            </div>
            <div className="text-gray-600">
              Model: {game.promptModel}
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex gap-2 pt-4">
            <motion.div
              className="flex-1"
              whileHover={{ scale: 1.03 }}
              whileTap={{ scale: 0.97 }}
            >
              <Link
                href={`/games/${game.slug}`}
                className="flex items-center justify-center gap-2 px-3 py-2 bg-purple-600 hover:bg-purple-700 text-white text-sm rounded font-medium transition-all relative group/btn overflow-hidden"
              >
                {/* Animated glow effect on button hover */}
                <motion.span
                  className="absolute inset-0 rounded opacity-0 group-hover/btn:opacity-100 transition-opacity duration-300"
                  style={{
                    background: `radial-gradient(circle at center, ${game.primaryColor || '#a855f7'}60, transparent 70%)`,
                    filter: 'blur(8px)',
                  }}
                />
                {/* Shine effect */}
                <motion.span
                  className="absolute inset-0 -translate-x-full group-hover/btn:translate-x-full transition-transform duration-700"
                  style={{
                    background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.2), transparent)',
                  }}
                />
                <span className="relative flex items-center gap-2">
                  <Play className="w-4 h-4" />
                  {game.playFee ? (
                    <span className="flex items-center gap-1">
                      Play
                      <span className="bg-white/20 px-1.5 py-0.5 rounded text-xs font-bold">
                        {game.playFee} $DONUT
                      </span>
                    </span>
                  ) : (
                    'Play'
                  )}
                </span>
              </Link>
            </motion.div>

            {isUserGame && (
              <>
                <ActionButton
                  onClick={onMintClick}
                  disabled={isLoading}
                  icon={<Zap className="w-4 h-4" />}
                  label="Mint"
                  title="Mint as NFT on Base"
                />

                <ActionButton
                  onClick={onRegisterClick}
                  disabled={isLoading}
                  icon={<Crown className="w-4 h-4" />}
                  label="Register"
                  title="Register as IP on Story Protocol"
                />

                <ActionButton
                  onClick={() => onToggleVisibility?.(!game.private)}
                  disabled={isLoading}
                  icon={game.private ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  label={game.private ? 'Make Public' : 'Make Private'}
                  title={game.private ? 'Make public' : 'Make private'}
                  ariaLabel={game.private ? 'Make public' : 'Make private'}
                />
              </>
            )}

            {/* Settings Button Separated to be visible for Admins too */}
            {showSettings && (
              <ActionButton
                onClick={onSettingsClick}
                disabled={isLoading}
                icon={<Settings className={`w-4 h-4 ${userIsAdmin && !isUserGame ? 'text-yellow-500' : ''}`} />}
                label=""
                title="Configure Settings (Fee & Visibility & Featured)"
              />
            )}

            {/* Delete for Owner Only */}
            {isUserGame && (
              <ActionButton
                onClick={onDeleteClick}
                disabled={isLoading}
                icon={<Trash2 className="w-4 h-4" />}
                label=""
                title="Delete game"
                variant="danger"
              />
            )}
          </div>
        </div>
      </div>
    </motion.div>
  )
}

// Helper component for action buttons with consistent animations
interface ActionButtonProps {
  onClick?: () => void
  disabled?: boolean
  icon: React.ReactNode
  label: string
  title: string
  ariaLabel?: string
  variant?: 'default' | 'danger'
}

function ActionButton({ onClick, disabled, icon, label, title, ariaLabel, variant = 'default' }: ActionButtonProps) {
  const baseClasses = "flex items-center gap-2 transition-all duration-200"
  const variantClasses = variant === 'danger' 
    ? "text-red-400 hover:text-red-300 hover:border-red-400 hover:bg-red-500/10"
    : "hover:bg-gray-800"

  return (
    <motion.div
      whileHover={{ scale: 1.05 }}
      whileTap={{ scale: 0.95 }}
    >
      <Button
        variant="outline"
        size="sm"
        onClick={onClick}
        disabled={disabled}
        className={`${baseClasses} ${variantClasses}`}
        title={title}
        aria-label={ariaLabel || title}
      >
        {icon}
        {label && <span className="hidden sm:inline">{label}</span>}
      </Button>
    </motion.div>
  )
}
