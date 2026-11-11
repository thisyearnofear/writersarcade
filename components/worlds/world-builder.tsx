'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { TitleSequence, type TitleCard } from '@/components/generation/title-sequence'
import { SHOWCASE_WORLD } from '@/lib/showcase-world'

interface WorldSummary {
  slug: string
  title: string
  prompt: string
  genre: string
  createdAt: string
}

interface WorldListResponse {
  success: boolean
  data?: { worlds: WorldSummary[]; genres: string[] }
  error?: string
}

interface TitleCardsResponse {
  success: boolean
  data?: { cards: TitleCard[] }
}

const GENRES = [
  'exploration',
  'mystery',
  'fantasy',
  'sci-fi',
  'horror',
  'post-apocalyptic',
  'cozy',
  'noir',
]

const EXAMPLES = [
  'A lighthouse keeper on a storm-battered cliff who must relight the beacon before the shipwreck',
  'An abandoned subway station where the trains still arrive on schedule, but for ghosts',
  'A floating library of glass domes drifting above a violet ocean',
  'A desert monastery built inside the ribs of a dead colossus',
]

/**
 * Prompt-to-world surface.
 *
 * The visitor describes a place; the server plans an explorable 3D diorama
 * from it. No account, no wallet, no credits.
 */
export function WorldBuilder() {
  const router = useRouter()
  const [prompt, setPrompt] = useState('')
  const [genre, setGenre] = useState('exploration')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [worlds, setWorlds] = useState<WorldSummary[]>([])
  const [cards, setCards] = useState<TitleCard[]>([])
  const buildAbort = useRef<AbortController | null>(null)

  const loadWorlds = useCallback(async () => {
    try {
      const res = await fetch('/api/worlds?limit=12')
      const body = (await res.json()) as WorldListResponse
      if (body.success && body.data) setWorlds(body.data.worlds)
    } catch {
      /* gallery is best-effort */
    }
  }, [])

  useEffect(() => {
    // Fetching the gallery on mount — the response is not needed for render.
    // eslint-disable-next-line react-hooks/set-state-in-effect -- async gallery fetch
    void loadWorlds()
  }, [loadWorlds])

  // Title cards for the loading reel: real artefact covers from the corpus.
  useEffect(() => {
    let cancelled = false
    fetch('/api/title-cards')
      .then((r) => r.json())
      .then((body: TitleCardsResponse) => {
        if (!cancelled && body.success && body.data?.cards?.length) {
          setCards(body.data.cards)
        }
      })
      .catch(() => { /* the reel falls back to typographic cards */ })
    return () => { cancelled = true }
  }, [])

  const submit = async () => {
    const trimmed = prompt.trim()
    if (trimmed.length < 12) {
      setError('Describe a place in a bit more detail.')
      return
    }
    setError(null)
    setBusy(true)
    const controller = new AbortController()
    buildAbort.current = controller
    const timer = window.setTimeout(() => controller.abort(), 100_000)
    try {
      const res = await fetch('/api/worlds', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt: trimmed, genre }),
        signal: controller.signal,
      })
      const body = await res.json().catch(() => ({}))
      if (!res.ok || !body.success) {
        setError(body.error || 'Could not build that world. Your description is still here.')
        setBusy(false)
        return
      }
      router.push(`/worlds/${body.data.slug}`)
    } catch (err) {
      const aborted = err instanceof DOMException && err.name === 'AbortError'
      setError(
        aborted
          ? 'That build was cancelled or took too long. Your description is still here.'
          : 'Network error — your description is still here. Please try again.',
      )
      setBusy(false)
    } finally {
      window.clearTimeout(timer)
      if (buildAbort.current === controller) buildAbort.current = null
    }
  }

  if (busy) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-black px-4 py-12">
        <div className="w-full max-w-2xl">
          <TitleSequence cards={cards} />
          <p className="mt-6 text-center text-sm text-white/70">
            <span className="font-semibold text-white">Building your world…</span>
          </p>
          <p className="mx-auto mt-2 max-w-lg text-center text-sm italic text-white/55">“{prompt.trim()}”</p>
          <p className="mt-1 text-center text-xs text-white/45">
            The set designer needs about a minute. Keep this tab open.
          </p>
          <button
            onClick={() => buildAbort.current?.abort()}
            className="mt-6 block w-full text-center text-xs text-white/40 hover:text-white/70"
          >
            Cancel and keep this description
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background text-foreground">
      <header className="border-b border-border/60">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-4 py-3">
          <Link href="/" className="text-sm text-muted-foreground hover:text-foreground">
            ← writersarcade
          </Link>
          <span className="text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground">
            Prompt&nbsp;→&nbsp;World
          </span>
        </div>
      </header>

      <main className="mx-auto max-w-5xl px-4 py-10">
        <div className="max-w-2xl">
          <h1 className="font-serif text-4xl font-bold leading-tight sm:text-5xl">
            Describe a place.
            <br />
            <span className="text-brand">Walk into it.</span>
          </h1>
          <p className="mt-4 text-base text-muted-foreground">
            Type a scene in plain language. An AI set designer turns it into an
            explorable 3D world with places to visit, characters to talk to, and
            a thread to follow. No account, no wallet, no credits.
          </p>
        </div>

        <Link
          href={`/worlds/${SHOWCASE_WORLD.slug}`}
          className="mt-8 block rounded-2xl border border-brand/40 bg-brand/10 p-5 transition hover:border-brand hover:bg-brand/15"
        >
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-brand">Walk in now</p>
          <p className="mt-2 font-serif text-2xl font-bold">{SHOWCASE_WORLD.title}</p>
          <p className="mt-2 text-sm italic text-muted-foreground">“{SHOWCASE_WORLD.prompt}”</p>
          <p className="mt-3 text-sm text-foreground/80">
            Step in and walk it. Read and Watch are the same story, already waiting.
          </p>
        </Link>

        <div className="mt-8 rounded-2xl border border-border/60 bg-card/40 p-5">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground">
            Or describe your own
          </p>
          <label htmlFor="world-prompt" className="sr-only">
            Your world
          </label>
          <textarea
            id="world-prompt"
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) void submit()
            }}
            rows={3}
            maxLength={1200}
            placeholder="A lighthouse keeper on a storm-battered cliff who must relight the beacon before the shipwreck…"
            className="mt-2 w-full resize-y rounded-xl border border-border bg-background px-4 py-3 text-base outline-none transition focus:border-brand/60 focus:ring-2 focus:ring-brand/20"
          />

          <div className="mt-3 flex flex-wrap items-center gap-2">
            {GENRES.map((g) => (
              <button
                key={g}
                onClick={() => setGenre(g)}
                className={`rounded-full border px-3 py-1 text-xs font-medium capitalize transition ${
                  genre === g
                    ? 'border-brand bg-brand text-brand-foreground'
                    : 'border-border text-muted-foreground hover:border-foreground/30 hover:text-foreground'
                }`}
              >
                {g}
              </button>
            ))}
          </div>

          {error && <p className="mt-3 text-sm text-destructive">{error}</p>}

          <button
            onClick={submit}
            className="mt-4 w-full rounded-xl bg-brand px-6 py-3.5 text-base font-semibold text-brand-foreground transition hover:bg-brand/90 sm:w-auto"
          >
            Build this world
          </button>
        </div>

        <div className="mt-6">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground">
            Try one of these
          </p>
          <div className="mt-3 grid gap-2 sm:grid-cols-2">
            {EXAMPLES.map((ex) => (
              <button
                key={ex}
                onClick={() => {
                  setPrompt(ex)
                  setError(null)
                }}
                className="rounded-xl border border-border/60 px-4 py-3 text-left text-sm text-muted-foreground transition hover:border-foreground/25 hover:text-foreground"
              >
                {ex}
              </button>
            ))}
          </div>
        </div>

        {worlds.length > 0 && (
          <div className="mt-12">
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground">
              Recently built
            </p>
            <div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {worlds.map((w) => (
                <Link
                  key={w.slug}
                  href={`/worlds/${w.slug}`}
                  className="group rounded-xl border border-border/60 p-4 transition hover:border-brand/50 hover:bg-card/40"
                >
                  <p className="font-semibold group-hover:text-brand">{w.title}</p>
                  <p className="mt-1 line-clamp-2 text-xs text-muted-foreground">{w.prompt}</p>
                  <p className="mt-2 text-[11px] capitalize text-muted-foreground/70">{w.genre}</p>
                </Link>
              ))}
            </div>
          </div>
        )}
      </main>
    </div>
  )
}
