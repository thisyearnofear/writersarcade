'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

interface SceneGateProps {
  slug: string
  status: 'idle' | 'pending' | 'failed' | string
  error?: string | null
}

export function SceneGate({ slug, status, error }: SceneGateProps) {
  const router = useRouter()
  const [busy, setBusy] = useState(false)
  const [message, setMessage] = useState<string | null>(null)

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
      {status === 'pending' ? (
        <>
          <div className="h-10 w-10 animate-spin rounded-full border-2 border-warning border-t-transparent" />
          <p className="text-white/80">Your diorama is being generated…</p>
          <button onClick={() => router.refresh()} className="text-sm text-warning underline">Refresh</button>
        </>
      ) : (
        <>
          <h2 className="text-2xl font-bold text-white">
            {status === 'failed' ? 'Scene generation failed' : 'Enter the world'}
          </h2>
          <p className="max-w-md text-sm text-white/70">
            {status === 'failed'
              ? (error || 'Something went wrong. Your credits were refunded — try again.')
              : 'Explore this story as a walkable 3D diorama — every panel becomes a place you can visit.'}
          </p>
          <button
            onClick={generate}
            disabled={busy}
            className="rounded-lg bg-warning px-6 py-3 font-semibold text-black transition hover:bg-warning disabled:opacity-50"
          >
            {busy ? 'Generating…' : status === 'failed' ? 'Retry scene (20 credits)' : 'Generate diorama (20 credits)'}
          </button>
          {message && <p className="text-sm text-destructive">{message}</p>}
        </>
      )}
    </div>
  )
}
