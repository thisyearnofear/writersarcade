'use client'

import { useState, useEffect, useCallback, useRef } from 'react'

export type VideoPanelStatus = {
  id: string
  panelIndex: number
  videoStatus: 'idle' | 'pending' | 'completed' | 'failed'
  videoUrl: string | null
  videoProvider?: string | null
  videoError?: string | null
  videoStillUrl?: string | null
  videoCompanionUrl?: string | null
  videoCompanionStatus?: 'idle' | 'pending' | 'completed' | 'failed'
  videoDraftUrl?: string | null
  videoDraftStatus?: 'idle' | 'pending' | 'completed' | 'failed'
}

export interface UseVideoStatusResult {
  enabled: boolean
  status: 'idle' | 'pending' | 'completed' | 'failed'
  panels: VideoPanelStatus[]
  montageVideoUrl: string | null
  isLoading: boolean
  error: string | null
  mutate: () => Promise<void>
}

export function useVideoStatus(
  slug: string,
  enabled = process.env.NEXT_PUBLIC_FEATURE_VIDEO_PIPELINE === 'true',
): UseVideoStatusResult {
  const [status, setStatus] = useState<UseVideoStatusResult['status']>('idle')
  const [panels, setPanels] = useState<VideoPanelStatus[]>([])
  const [montageVideoUrl, setMontageVideoUrl] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const intervalRef = useRef<NodeJS.Timeout | null>(null)

  const fetchStatus = useCallback(async () => {
    const response = await fetch(`/api/games/${slug}/video/status`)
    const json = (await response.json()) as {
      success: boolean
      data?: { status: UseVideoStatusResult['status']; mode?: 'hero' | 'full'; heroPanelId?: string | null; montageVideoUrl?: string | null; panels: VideoPanelStatus[] }
      error?: string
    }

    if (!response.ok || !json.success) {
      throw new Error(json.error || 'Failed to fetch video status')
    }

    setStatus(json.data?.status ?? 'idle')
    setPanels(json.data?.panels ?? [])
    if (json.data?.montageVideoUrl) setMontageVideoUrl(json.data.montageVideoUrl)
  }, [slug])

  const mutate = useCallback(async () => {
    setIsLoading(true)
    setError(null)
    try {
      await fetchStatus()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error')
    } finally {
      setIsLoading(false)
    }
  }, [fetchStatus])

  useEffect(() => {
    if (!enabled) return

    void mutate()

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current)
        intervalRef.current = null
      }
    }
  }, [enabled, fetchStatus, mutate])

  // Poll only while generation is in flight — once the status reaches a
  // terminal state (idle/completed/failed), further polling is pure waste.
  // Exception: when every clip just completed, the montage film is assembling
  // server-side — keep polling briefly (bounded) so the film URL arrives.
  const montageWaitPolls = useRef(0)
  useEffect(() => {
    if (!enabled) return
    const allClipsReady = panels.length >= 2 && panels.every((p) => p.videoUrl)
    const awaitingMontage =
      status === 'completed' && allClipsReady && !montageVideoUrl && montageWaitPolls.current < 8
    if (status !== 'pending' && !awaitingMontage) return
    if (status === 'pending') montageWaitPolls.current = 0

    intervalRef.current = setInterval(() => {
      montageWaitPolls.current += 1
      void fetchStatus()
    }, 5000)

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current)
        intervalRef.current = null
      }
    }
  }, [enabled, status, panels, montageVideoUrl, fetchStatus])

  return { enabled, status, panels, montageVideoUrl, isLoading, error, mutate }
}
