'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { TitleSequence, type TitleCard } from '@/components/generation/title-sequence'

interface SceneGateProps {
  slug: string
  status: 'idle' | 'pending' | 'failed' | string
  error?: string | null
  /** True when the scene was bundled into generate-game — retries are free. */
  bundled?: boolean
}

// Rotating captions during the ~30-60s generation window — perceived
// progress beats a bare spinner.
const GEN_PHASES = [
  'Reading the story…',
  'Designing zones…',
  'Placing landmarks…',
  'Weaving narrative hooks…',
  'Critique pass…',
  'Lighting the world…',
]

export function SceneGate({ slug, status, error, bundled = false }: SceneGateProps) {
  const router = useRouter()
  const [busy, setBusy] = useState(false)
  const [message, setMessage] = useState<string | null>(null)
  const [phase, setPhase] = useState(0)
  const [titleCards, setTitleCards] = useState<TitleCard[]>([])

  // Title cards for the loading reel — real artefact covers.
  useEffect(() => {
    let cancelled = false
    fetch('/api/title-cards')
      .then((r) => r.json())
      .then((body: { success?: boolean; data?: { cards?: TitleCard[] } }) => {
        if (!cancelled && body?.success && body.data?.cards?.length) {
          setTitleCards(body.data.cards)
        }
      })
      .catch(() => { /* reel falls back to typographic cards */ })
    return () => { cancelled = true }
  }, [])

  const isPending = status === 'pending' || busy
  useEffect(() => {
    if (!isPending) return
    const t = setInterval(() => setPhase((p) => (p + 1) % GEN_PHASES.length), 3500)
    return () => clearInterval(t)
  }, [isPending])

  const generate = async () => {
    setBusy(true)
    setMessage(null)
    try {
      const res = await fetch(`/api/games/${slug}/scene`, { method: 'POST' })
      const body = await res.json().catch(() => ({}))
      if (!res.ok) {
        setMessage(body.error || `Request failed (${res.status})`)
        return
      }
      if (body.data?.pending) {
        setMessage('Scene is already being generated — refresh in a moment.')
        return
      }
      router.refresh()
    } catch {
      setMessage('Network error — please try again.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="flex h-full flex-col items-center justify-center gap-4 p-8 text-center">
      {isPending ? (
        <>
          <div className="w-full max-w-xl">
            <TitleSequence cards={titleCards} intervalMs={1800} />
          </div>
          <p className="mt-1 text-sm text-white/80">{GEN_PHASES[phase]}</p>
          <p className="text-xs text-white/50">Usually under a minute</p>
          <button onClick={() => router.refresh()} className="text-sm text-warning underline">Refresh</button>
        </>
      ) : (
        <>
          <h2 className="text-2xl font-bold text-white">
            {status === 'failed' ? 'Scene generation failed' : 'Enter the world'}
          </h2>
          <p className="max-w-md text-sm text-white/70">
            {status === 'failed'
              ? (error || (bundled
                  ? 'Something went wrong — it was included with your story, so retry anytime.'
                  : 'Something went wrong. Your credits were refunded — try again.'))
              : bundled
                ? 'Your story’s walkable 3D world is included — every panel becomes a place you can visit.'
                : 'Explore this story as a walkable 3D world — every panel becomes a place you can visit.'}
          </p>
          <button
            onClick={generate}
            disabled={busy}
            className="rounded-lg bg-warning px-6 py-3 font-semibold text-black transition hover:bg-warning/90 disabled:opacity-50"
          >
            {busy
              ? 'Generating…'
              : bundled
                ? (status === 'failed' ? 'Retry — included with your story' : 'Build your world — included')
                : (status === 'failed' ? 'Retry scene (20 credits)' : 'Generate 3D world (20 credits)')}
          </button>
          {message && <p className="text-sm text-destructive">{message}</p>}
        </>
      )}
    </div>
  )
}
