'use client'

import { useEffect, useState } from 'react'
import { getDioramaXRStore } from '@/components/scene/xr-store'

/**
 * "Enter VR" button for a diorama.
 *
 * The shared XR store owns the session lifecycle and the renderer binding
 * (its <XR> component lives inside the Canvas), so the button only has to
 * ask for the session. Hand tracking is requested by the store itself.
 *
 * The button only renders when the device actually reports VR support, so
 * desktop visitors never see a dead control.
 */
export function VRButton() {
  const [supported, setSupported] = useState(false)
  const [presenting, setPresenting] = useState(false)

  useEffect(() => {
    let cancelled = false
    const markSupported = () => {
      if (!cancelled) setSupported(true)
    }
    // Emulated runtimes land on the store asynchronously (localhost dev,
    // sandboxed judging) — real support detection alone would hide the button.
    const unsubscribe = getDioramaXRStore().subscribe((s) => {
      if (s.emulator) markSupported()
    })
    if (getDioramaXRStore().getState().emulator) markSupported()
    const xr = (navigator as any).xr
    if (xr?.isSessionSupported) {
      xr.isSessionSupported('immersive-vr')
        .then((ok: boolean) => { if (ok) markSupported() })
        .catch(() => { /* device has no XR runtime — rely on emulation state */ })
    }
    return () => {
      cancelled = true
      unsubscribe()
    }
  }, [])

  useEffect(
    () => getDioramaXRStore().subscribe((s) => setPresenting(Boolean(s.session))),
    [],
  )

  if (!supported) return null

  const enterVR = () => {
    void getDioramaXRStore()
      .enterVR()
      .catch(() => { /* user declined, or the session request was rejected */ })
  }

  return (
    <button
      onClick={enterVR}
      disabled={presenting}
      className="flex items-center gap-2 rounded-lg bg-brand px-3 py-2 text-xs font-semibold text-brand-foreground backdrop-blur transition hover:bg-brand/90 disabled:opacity-60"
      title="Step into this world in VR"
    >
      <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
        <path d="M2 8.5A2.5 2.5 0 0 1 4.5 6h15A2.5 2.5 0 0 1 22 8.5v4a2.5 2.5 0 0 1-2.5 2.5H16l-2.5-3h-3L8 15H4.5A2.5 2.5 0 0 1 2 12.5z" />
      </svg>
      {presenting ? 'In VR' : 'Enter VR'}
    </button>
  )
}
