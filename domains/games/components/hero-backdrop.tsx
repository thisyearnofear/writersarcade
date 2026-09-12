'use client'

import { useSyncExternalStore } from 'react'
import { motion, useReducedMotion } from 'framer-motion'
import type { SampleGame } from './hero-game-strip'

const DESKTOP_QUERY = '(min-width: 768px)'
function useIsDesktop(): boolean {
  return useSyncExternalStore(
    (onChange) => {
      const mq = window.matchMedia(DESKTOP_QUERY)
      mq.addEventListener('change', onChange)
      return () => mq.removeEventListener('change', onChange)
    },
    () => window.matchMedia(DESKTOP_QUERY).matches,
    () => false
  )
}

/**
 * Ambient hero backdrop made from the product's own output — the pitch is
 * "prose becomes film," so the field behind it should look like it.
 *
 * Priority: a real montage film (Grove URL from montageVideoUrl) as a blurred,
 * dimmed ambient video on desktop; otherwise a slow-drifting mosaic of the
 * generated covers. A heavy scrim keeps the hero text and single CTA readable —
 * the art reads as light and color, never competing imagery.
 *
 * Respects prefers-reduced-motion (static wash) and skips video on small
 * screens (a film MP4 is too heavy for mobile bandwidth).
 */
export function HeroBackdrop({ games }: { games: (SampleGame & { montageVideoUrl?: string; clipVideoUrl?: string })[] }) {
  const reduceMotion = useReducedMotion()
  const isDesktop = useIsDesktop()

  // Prefer a single ~8MB panel clip over the 40MB+ montage for ambient use.
  const film = games.find((g) => g.clipVideoUrl?.startsWith('http'))?.clipVideoUrl
    ?? games.find((g) => g.montageVideoUrl?.startsWith('http'))?.montageVideoUrl
  const covers = games.filter((g) => g.imageUrl).slice(0, 8)
  const poster = covers[0]?.imageUrl

  if (!film && covers.length === 0) return null

  return (
    <div aria-hidden className="pointer-events-none absolute inset-0 z-0 overflow-hidden">
      {film && isDesktop && !reduceMotion ? (
        <video
          src={film}
          poster={poster}
          autoPlay
          muted
          loop
          playsInline
          className="absolute inset-0 h-full w-full scale-125 object-cover opacity-[0.22] blur-2xl saturate-150 dark:opacity-[0.3]"
        />
      ) : covers.length > 0 ? (
        <motion.div
          className="absolute -inset-[15%] grid grid-cols-3 gap-6 opacity-[0.16] blur-2xl saturate-150 dark:opacity-[0.24] sm:grid-cols-4"
          animate={reduceMotion ? undefined : { x: ['0%', '-4%', '0%'], y: ['0%', '-3%', '0%'] }}
          transition={{ duration: 70, repeat: Infinity, ease: 'easeInOut' }}
        >
          {covers.map((g) => (
            <img
              key={g.slug}
              src={g.imageUrl}
              alt=""
              className="h-full w-full rounded-2xl object-cover"
              loading="lazy"
            />
          ))}
        </motion.div>
      ) : null}

      {/* Readability scrim — the CTA hierarchy must survive the art. */}
      <div className="absolute inset-0 bg-gradient-to-b from-background/80 via-background/70 to-background" />
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,transparent_0%,var(--background)_120%)] opacity-60" />
    </div>
  )
}
