'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

const SUGGESTIONS = [
  'Make it night',
  'Add a wrecked ship',
  'The keeper has vanished',
]

/**
 * Follow-up prompt for a world that already exists.
 *
 * The current scene stays on screen until a revised plan comes back. A
 * failure tells the visitor the world they are looking at did not change.
 */
export function ReshapeBar({ slug }: { slug: string }) {
  const router = useRouter()
  const [instruction, setInstruction] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [note, setNote] = useState<string | null>(null)

  const submit = async (text: string) => {
    const trimmed = text.trim()
    if (trimmed.length < 8) {
      setError('Say what to change in a few more words.')
      return
    }
    setError(null)
    setNote(null)
    setBusy(true)
    const controller = new AbortController()
    const timer = window.setTimeout(() => controller.abort(), 100_000)
    try {
      const res = await fetch(`/api/worlds/${slug}/revise`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ instruction: trimmed }),
        signal: controller.signal,
      })
      const body = await res.json().catch(() => ({}))
      if (!res.ok || !body.success) {
        setError(body.error || 'Could not reshape this world. It is unchanged.')
        setBusy(false)
        return
      }
      setInstruction('')
      setNote('World updated.')
      router.refresh()
      setBusy(false)
    } catch {
      setError('The reshape did not finish. This world is unchanged — try again.')
      setBusy(false)
    } finally {
      window.clearTimeout(timer)
    }
  }

  return (
    <form
      className="border-b border-white/10 bg-black/80 px-4 py-2"
      onSubmit={(event) => {
        event.preventDefault()
        if (!busy) void submit(instruction)
      }}
    >
      <div className="mx-auto flex max-w-5xl flex-col gap-2 sm:flex-row sm:items-center">
        <label htmlFor="reshape-instruction" className="shrink-0 text-xs font-semibold uppercase tracking-[0.16em] text-white/50">
          Change this world
        </label>
        <input
          id="reshape-instruction"
          value={instruction}
          disabled={busy}
          onChange={(event) => setInstruction(event.target.value)}
          maxLength={400}
          placeholder="Make it night and add the missing ship"
          className="min-w-0 flex-1 rounded-lg border border-white/15 bg-white/5 px-3 py-2 text-sm text-white outline-none placeholder:text-white/30 focus:border-brand/60 disabled:opacity-60"
        />
        <button
          type="submit"
          disabled={busy}
          className="rounded-lg bg-brand px-4 py-2 text-sm font-semibold text-brand-foreground transition hover:bg-brand/90 disabled:opacity-60"
        >
          {busy ? 'Reshaping…' : 'Reshape'}
        </button>
      </div>
      <div className="mx-auto mt-2 flex max-w-5xl flex-wrap items-center gap-2">
        {SUGGESTIONS.map((suggestion) => (
          <button
            key={suggestion}
            type="button"
            disabled={busy}
            onClick={() => {
              setInstruction(suggestion)
              void submit(suggestion)
            }}
            className="rounded-full border border-white/15 px-2.5 py-1 text-[11px] text-white/70 transition hover:border-white/40 hover:text-white disabled:opacity-50"
          >
            {suggestion}
          </button>
        ))}
        {busy && (
          <span className="text-[11px] text-white/50">About a minute. This world stays until the new one is ready.</span>
        )}
        {error && <span className="text-[11px] text-red-300">{error}</span>}
        {note && !busy && !error && <span className="text-[11px] text-emerald-300">{note}</span>}
      </div>
    </form>
  )
}
