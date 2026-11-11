'use client'

import { useEffect, useMemo, useState } from 'react'
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion'

/**
 * "Title sequence" loading state.
 *
 * Generation takes 40-60s, and a spinner for that long is dead time. Instead
 * we flick through a sequence of title cards — the artefact covers the
 * platform can produce — so the wait reads as a reel being assembled rather
 * than a stall. The cards are real product surfaces (comic, 3D world, film),
 * not abstract animation, so the loading state doubles as a preview of what
 * the platform makes.
 *
 * Each card is a short, hard cut with a slight scale punch — closer to a
 * film title card than a cross-fade. Under `prefers-reduced-motion` the
 * sequence becomes a still card with the same copy.
 */

export interface TitleCard {
  /** The cover image for this artefact. */
  imageUrl?: string | null
  /** Primary line — the artefact's title. */
  title: string
  /** Secondary line — the modality, e.g. "3D world". */
  label?: string
  /** Optional accent colour for the rule under the title. */
  accent?: string
}

interface TitleSequenceProps {
  cards: TitleCard[]
  /** Milliseconds per card. */
  intervalMs?: number
  className?: string
}

/** Hard-cut timing: fast in, hold, fast out. */
const CUT = { duration: 0.42, ease: [0.16, 1, 0.3, 1] as const }

export function TitleSequence({ cards, intervalMs = 1500, className }: TitleSequenceProps) {
  const reduced = useReducedMotion()
  const [index, setIndex] = useState(0)

  const list = useMemo(() => cards.filter((c) => c.title), [cards])

  useEffect(() => {
    if (list.length <= 1) return
    const t = setInterval(() => setIndex((i) => (i + 1) % list.length), intervalMs)
    return () => clearInterval(t)
  }, [list.length, intervalMs])

  if (list.length === 0) return null
  const card = list[index % list.length]

  return (
    <div className={className}>
      <div className="relative aspect-[16/9] w-full overflow-hidden rounded-2xl bg-black/70 ring-1 ring-white/10">
        <AnimatePresence mode="popLayout" initial={false}>
          <motion.figure
            key={`${card.title}-${index}`}
            initial={reduced ? { opacity: 0 } : { opacity: 0, scale: 1.12, filter: 'blur(8px)' }}
            animate={reduced ? { opacity: 1 } : { opacity: 1, scale: 1, filter: 'blur(0px)' }}
            exit={reduced ? { opacity: 0 } : { opacity: 0, scale: 0.96, filter: 'blur(6px)' }}
            transition={CUT}
            className="absolute inset-0"
          >
            {card.imageUrl ? (
              // Covers are remote CDN images — a plain <img> avoids next/image
              // domain allowlist churn for arbitrary fal/Pinata hosts.
              //
              // Eager, not lazy: the cards swap in and out on a timer, and a
              // lazily-loaded image usually arrives after its card has already
              // been cut away, leaving an empty frame.
              <img
                src={card.imageUrl}
                alt=""
                className="h-full w-full object-cover"
                decoding="async"
                draggable={false}
              />
            ) : (
              <div
                className="h-full w-full"
                style={{
                  background: `radial-gradient(120% 90% at 50% 0%, ${card.accent ?? '#3b2f63'}55, transparent 70%), #0b0a12`,
                }}
              />
            )}
            {/* Darken so the type always reads over the artwork, but keep
                enough of the cover visible that the reel feels like a reel. */}
            <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/15 to-black/30" />
          </motion.figure>
        </AnimatePresence>

        {/* Title block — a film title card. */}
        <div className="absolute inset-x-0 bottom-0 p-5 sm:p-7">
          {card.label && (
            <p
              className="text-[11px] font-bold uppercase tracking-[0.35em]"
              style={{ color: card.accent ?? '#ffcc00' }}
            >
              {card.label}
            </p>
          )}
          <h2 className="mt-1 font-serif text-2xl font-bold leading-tight text-white drop-shadow-lg sm:text-4xl">
            {card.title}
          </h2>
          <div
            className="mt-3 h-px w-24"
            style={{ background: card.accent ?? '#ffcc00' }}
          />
        </div>
      </div>

      {/* Progress ticks — one per card, so the sequence reads as a timeline. */}
      {list.length > 1 && (
        <div className="mt-3 flex items-center gap-1.5">
          {list.map((c, i) => (
            <span
              key={`${c.title}-tick`}
              className="h-0.5 flex-1 rounded-full transition-colors duration-300"
              style={{
                background: i === index ? (card.accent ?? '#ffcc00') : 'rgba(255,255,255,0.15)',
              }}
            />
          ))}
        </div>
      )}
    </div>
  )
}
