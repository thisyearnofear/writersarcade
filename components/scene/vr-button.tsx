'use client'

import { useEffect, useState } from 'react'
import type * as THREE from 'three'

/**
 * "Enter VR" button for a diorama.
 *
 * R3F wires the XR session lifecycle itself (it swaps the render loop on
 * `sessionstart` / `sessionend`), so all this has to do is ask the browser for
 * an immersive session and hand it to the renderer.
 *
 * The button only renders when the device actually reports VR support, so
 * desktop visitors never see a dead control.
 */
export function VRButton({ renderer }: { renderer: THREE.WebGLRenderer | null }) {
  const [supported, setSupported] = useState(false)
  const [presenting, setPresenting] = useState(false)

  useEffect(() => {
    let cancelled = false
    const xr = (navigator as any).xr
    if (!xr?.isSessionSupported) return
    xr.isSessionSupported('immersive-vr')
      .then((ok: boolean) => {
        if (!cancelled) setSupported(ok)
      })
      .catch(() => { /* device has no XR runtime — leave the button hidden */ })
    return () => { cancelled = true }
  }, [])

  useEffect(() => {
    if (!renderer) return
    const onSessionChange = () => setPresenting(Boolean(renderer.xr.isPresenting))
    renderer.xr.addEventListener('sessionstart', onSessionChange)
    renderer.xr.addEventListener('sessionend', onSessionChange)
    return () => {
      renderer.xr.removeEventListener('sessionstart', onSessionChange)
      renderer.xr.removeEventListener('sessionend', onSessionChange)
    }
  }, [renderer])

  if (!supported || !renderer) return null

  const enterVR = async () => {
    try {
      const xr = (navigator as any).xr
      const session = await xr.requestSession('immersive-vr', {
        optionalFeatures: ['local-floor', 'bounded-floor', 'hand-tracking'],
      })
      await renderer.xr.setSession(session)
      setPresenting(true)
    } catch {
      // User declined, or the session request was rejected — stay on the page.
    }
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
