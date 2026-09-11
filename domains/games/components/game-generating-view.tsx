'use client'

import { useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import { Loader2, AlertTriangle, RefreshCw } from 'lucide-react'

const STAGES = [
  'Reading the article…',
  'Finding the story inside it…',
  'Designing the choices…',
  'Writing your panels…',
  'Polishing the details…',
]

/**
 * Shown while a record-first game is `generationStatus: 'generating'`. Polls
 * /status until 'ready', then refreshes the server component so the real
 * artifact/play view renders. 'failed' surfaces a retry that re-queues the
 * async pipeline without a second charge.
 */
export function GameGeneratingView({
  slug,
  title,
  initialStatus,
  initialError,
}: {
  slug: string
  title: string
  initialStatus?: string
  initialError?: string | null
}) {
  const router = useRouter()
  const [stage, setStage] = useState(0)
  const [failed, setFailed] = useState<string | null>(
    initialStatus === 'failed' ? initialError || 'Generation failed.' : null
  )
  const [retrying, setRetrying] = useState(false)
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const stageRef = useRef<ReturnType<typeof setInterval> | null>(null)

  useEffect(() => {
    if (failed) return
    stageRef.current = setInterval(() => {
      setStage((s) => (s + 1) % STAGES.length)
    }, 3200)

    pollRef.current = setInterval(async () => {
      try {
        const res = await fetch(`/api/games/${slug}/status`, { cache: 'no-store' })
        if (res.status === 404) {
          setFailed('Generation record was removed.')
          return
        }
        const json = await res.json()
        const status = json?.data?.generationStatus
        if (status === 'ready') {
          if (pollRef.current) clearInterval(pollRef.current)
          if (stageRef.current) clearInterval(stageRef.current)
          router.refresh()
        } else if (status === 'failed') {
          if (pollRef.current) clearInterval(pollRef.current)
          if (stageRef.current) clearInterval(stageRef.current)
          setFailed(json?.data?.generationError || 'Generation failed.')
        }
      } catch {
        // transient — keep polling
      }
    }, 2500)

    return () => {
      if (pollRef.current) clearInterval(pollRef.current)
      if (stageRef.current) clearInterval(stageRef.current)
    }
  }, [slug, router, failed])

  const handleRetry = async () => {
    setRetrying(true)
    try {
      const res = await fetch(`/api/games/${slug}/retry`, { method: 'POST' })
      if (res.ok) {
        setFailed(null)
        router.refresh()
      } else {
        const json = await res.json().catch(() => null)
        setFailed(json?.error || 'Could not retry generation.')
      }
    } finally {
      setRetrying(false)
    }
  }

  return (
    <div className="min-h-screen bg-black flex items-center justify-center px-4">
      <div className="max-w-md w-full text-center space-y-6">
        {failed ? (
          <>
            <AlertTriangle className="h-10 w-10 text-amber-400 mx-auto" />
            <div className="space-y-2">
              <h1 className="font-serif text-2xl font-bold text-white">
                The story stalled
              </h1>
              <p className="text-sm text-zinc-400 leading-relaxed">
                {failed}
              </p>
            </div>
            <button
              type="button"
              onClick={handleRetry}
              disabled={retrying}
              className="inline-flex items-center gap-2 rounded-xl bg-white px-6 py-3 text-sm font-bold uppercase tracking-widest text-black transition-opacity hover:opacity-90 disabled:opacity-50"
            >
              <RefreshCw className={`h-4 w-4 ${retrying ? 'animate-spin' : ''}`} />
              {retrying ? 'Retrying…' : 'Retry — no extra charge'}
            </button>
          </>
        ) : (
          <>
            <Loader2 className="h-10 w-10 text-purple-400 animate-spin mx-auto" />
            <div className="space-y-2">
              <h1 className="font-serif text-2xl font-bold text-white">
                {title || 'Your story'}
              </h1>
              <AnimatePresence mode="wait">
                <motion.p
                  key={stage}
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -6 }}
                  transition={{ duration: 0.3 }}
                  className="text-sm text-zinc-400"
                >
                  {STAGES[stage]}
                </motion.p>
              </AnimatePresence>
            </div>
            <div className="flex justify-center gap-1.5">
              {STAGES.map((_, i) => (
                <span
                  key={i}
                  className={`h-1 w-8 rounded-full transition-colors ${
                    i <= stage ? 'bg-purple-400' : 'bg-zinc-800'
                  }`}
                />
              ))}
            </div>
            <p className="text-xs text-zinc-600">
              You&apos;ll start playing as soon as it&apos;s ready.
            </p>
          </>
        )}
      </div>
    </div>
  )
}
