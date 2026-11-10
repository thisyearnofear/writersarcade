'use client'

import { useCallback, useEffect, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'

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

const PHASES = [
  'Reading your world…',
  'Designing its zones…',
  'Placing landmarks…',
  'Weaving narrative hooks…',
  'Lighting the scene…',
]

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
 * from it. No account, no wallet, no credits — the only friction is the
 * ~40-60s the planner takes.
 */
export function WorldBuilder() {
  const router = useRouter()
  const [prompt, setPrompt] = useState('')
  const [genre, setGenre] = useState('exploration')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [worlds, setWorlds] = useState<WorldSummary[]>([])
  const [phase, setPhase] = useState(0)

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

  // Rotating captions during generation — perceived progress beats a spinner.
  useEffect(() => {
    if (!busy) return
    const t = setInterval(() => setPhase((p) => (p + 1) % PHASES.length), 4000)
    return () => clearInterval(t)
  }, [busy])

  const submit = async () => {
    const trimmed = prompt.trim()
    if (trimmed.length < 12) {
      setError('Describe a place in a bit more detail.')
      return
    }
    setError(null)
    setBusy(true)
    setPhase(0)
    try {
      const res = await fetch('/api/worlds', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt: trimmed, genre }),
      })
      const body = await res.json().catch(() => ({}))
      if (!res.ok || !body.success) {
        setError(body.error || 'Could not build that world.')
        setBusy(false)
        return
      }
      router.push(`/worlds/${body.data.slug}`)
    } catch {
      setError('Network error — please try again.')
      setBusy(false)
    }
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

        <div className="mt-8 rounded-2xl border border-border/60 bg-card/40 p-5">
          <label htmlFor="world-prompt" className="text-sm font-semibold">
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
            disabled={busy}
            className="mt-4 w-full rounded-xl bg-brand px-6 py-3.5 text-base font-semibold text-brand-foreground transition hover:bg-brand/90 disabled:opacity-60 sm:w-auto"
          >
            {busy ? PHASES[phase] : 'Build this world'}
          </button>
          {busy && (
            <p className="mt-2 text-xs text-muted-foreground">
              The set designer needs about a minute. Keep this tab open.
            </p>
          )}
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
