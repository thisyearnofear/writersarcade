'use client'

import { useEffect, useRef, useState, type ReactNode } from 'react'
import { createPortal } from 'react-dom'

// Z-index convention for layered UI (keep in sync when adding layers):
//   z-50   page chrome — header, bottom nav
//   z-[70] dropdowns / popovers (user menu, balance list)
//   z-[80] modals (buy credits, lightboxes, drawers)
//   z-[90] blocking full-screen overlays (GameGenerationOverlay, SuccessModal)
//   z-[100] toasts (toaster)

let scrollLockCount = 0
let previousOverflow: string | null = null

function acquireScrollLock() {
  if (scrollLockCount === 0) {
    previousOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
  }
  scrollLockCount += 1
}

function releaseScrollLock() {
  scrollLockCount = Math.max(0, scrollLockCount - 1)
  if (scrollLockCount === 0 && previousOverflow !== null) {
    document.body.style.overflow = previousOverflow
    previousOverflow = null
  }
}

interface OverlayOptions {
  lockScroll?: boolean
  closeOnEscape?: boolean
}

export function useOverlay(
  open: boolean,
  onClose: () => void,
  { lockScroll = true, closeOnEscape = true }: OverlayOptions = {}
) {
  // Inline-arrow callers shouldn't re-trigger the lock/listener on each render.
  const onCloseRef = useRef(onClose)
  useEffect(() => {
    onCloseRef.current = onClose
  }, [onClose])
  useEffect(() => {
    if (!open) return
    if (lockScroll) acquireScrollLock()
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && closeOnEscape) onCloseRef.current()
    }
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('keydown', onKey)
      if (lockScroll) releaseScrollLock()
    }
  }, [open, lockScroll, closeOnEscape])
}

export function OverlayPortal({ children }: { children: ReactNode }) {
  const [mounted, setMounted] = useState(false)
  // eslint-disable-next-line react-hooks/set-state-in-effect -- SSR mount gate
  useEffect(() => setMounted(true), [])
  if (!mounted) return null
  return createPortal(children, document.body)
}
