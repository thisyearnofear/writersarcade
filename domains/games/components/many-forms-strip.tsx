'use client'

import { useEffect, useRef, useState, useSyncExternalStore, type RefObject } from 'react'
import Link from 'next/link'
import { useReducedMotion } from 'framer-motion'
import { ArrowUpRight } from 'lucide-react'

export interface ManyFormsCard {
  href: string
  title: string
  /** Modality label, e.g. "Interactive comic", "Animated film". */
  label: string
  /** Still frames — comic collage (up to 4) or a single image via imageUrl. */
  images?: string[]
  imageUrl?: string
  /** Motion artifact — montage film or BasePaint timelapse. */
  videoUrl?: string
  posterUrl?: string
}

export interface ManyFormsData {
  comic?: ManyFormsCard
  film?: ManyFormsCard
  world?: ManyFormsCard
  wordle?: ManyFormsCard
  daily?: ManyFormsCard
}

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

/** Mount the <video> only when the card is near the viewport. */
function useNearViewport<T extends HTMLElement>(): [RefObject<T | null>, boolean] {
  const ref = useRef<T | null>(null)
  const [near, setNear] = useState(false)
  useEffect(() => {
    const el = ref.current
    if (!el || near) return
    const io = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setNear(true)
          io.disconnect()
        }
      },
      { rootMargin: '200px' }
    )
    io.observe(el)
    return () => io.disconnect()
  }, [near])
  return [ref, near]
}

/**
 * Motion tile for the strip. Same discipline as HeroBackdrop: desktop only,
 * never on save-data, never under reduced motion, poster frame until the
 * card scrolls near. Renders the poster <img> whenever video isn't allowed
 * so the card is never empty.
 */
function ShowcaseVideo({ src, poster }: { src: string; poster?: string }) {
  const reduceMotion = useReducedMotion()
  const isDesktop = useIsDesktop()
  const [ref, near] = useNearViewport<HTMLDivElement>()
  const [saveData] = useState(
    () =>
      typeof navigator !== 'undefined' &&
      (navigator as Navigator & { connection?: { saveData?: boolean } }).connection?.saveData === true
  )

  const canPlay = isDesktop && !reduceMotion && !saveData && near

  return (
    <div ref={ref} className="absolute inset-0">
      {poster && <img src={poster} alt="" className="h-full w-full object-cover" loading="lazy" decoding="async" />}
      {canPlay && (
        <video
          src={src}
          poster={poster}
          preload="metadata"
          autoPlay
          muted
          loop
          playsInline
          className="absolute inset-0 h-full w-full object-cover"
        />
      )}
    </div>
  )
}

function CardMedia({ card }: { card: ManyFormsCard }) {
  if (card.videoUrl) {
    return <ShowcaseVideo src={card.videoUrl} poster={card.posterUrl ?? card.imageUrl} />
  }
  const images = card.images?.length ? card.images : card.imageUrl ? [card.imageUrl] : []
  if (images.length === 0) return null
  if (images.length === 1) {
    return <img src={images[0]} alt="" className="h-full w-full object-cover" loading="lazy" decoding="async" />
  }
  return (
    <div className="grid h-full w-full grid-cols-2 gap-0.5 bg-black/40 p-0.5">
      {images.slice(0, 4).map((src) => (
        <img key={src} src={src} alt="" className="h-full w-full object-cover" loading="lazy" decoding="async" />
      ))}
    </div>
  )
}

function FormsCard({ card }: { card: ManyFormsCard }) {
  return (
    <Link
      href={card.href}
      className="group flex flex-col overflow-hidden rounded-xl border border-border bg-card transition-all hover:-translate-y-0.5 hover:border-foreground/30 hover:shadow-lg focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
    >
      <div className="relative aspect-[4/3] w-full overflow-hidden bg-muted">
        <CardMedia card={card} />
      </div>
      <div className="flex items-center justify-between gap-2 px-3 py-2.5">
        <div className="min-w-0">
          <p className="text-[10px] font-bold uppercase tracking-widest text-primary">{card.label}</p>
          <p className="truncate text-sm font-medium text-foreground">{card.title}</p>
        </div>
        <ArrowUpRight className="h-4 w-4 shrink-0 text-muted-foreground transition-colors group-hover:text-foreground" />
      </div>
    </Link>
  )
}

const CARD_ORDER: (keyof ManyFormsData)[] = ['comic', 'film', 'world', 'wordle', 'daily']

/**
 * "One story, many forms" — the landing's answer to "what can it actually
 * do?". Every card is a real generated artifact deep-linked to its live
 * instance; cards with no asset are absent (homepage empty-state policy).
 * Renders nothing until at least two forms exist.
 */
export function ManyFormsStrip({ data }: { data: ManyFormsData }) {
  const cards = CARD_ORDER.map((key) => data[key]).filter((c): c is ManyFormsCard => Boolean(c))
  if (cards.length < 2) return null

  return (
    <section className="border-t border-border px-4 py-14" aria-labelledby="many-forms-heading">
      <div className="mx-auto max-w-5xl">
        <div className="mb-8 text-center">
          <h2 id="many-forms-heading" className="text-sm font-semibold uppercase tracking-wider text-foreground">
            One story, many forms
          </h2>
          <p className="mx-auto mt-2 max-w-md text-sm text-muted-foreground">
            The same article becomes a comic you play, a film, a walkable world — and tomorrow&apos;s canvas is already drawing itself.
          </p>
        </div>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {cards.map((card) => (
            <FormsCard key={card.href + card.label} card={card} />
          ))}
        </div>
      </div>
    </section>
  )
}
