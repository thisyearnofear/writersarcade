'use client'

import { createXRStore, type XRStore } from '@react-three/xr'

let store: XRStore | null = null

/**
 * Shared XR store for the diorama viewer.
 *
 * Hands are first-class input: a pinch is delivered through the same pointer
 * events a mouse click uses, so every clickable prop and NPC hitbox keeps
 * working in-headset with no input layer of its own. `offerSession` stays
 * off — the "Enter VR" button is the doorway, not an automatic prompt. The
 * DOM overlay is declined so the session never depends on a page element.
 */
export function getDioramaXRStore(): XRStore {
  if (!store) {
    store = createXRStore({
      hand: true,
      controller: true,
      foveation: 0.5,
      offerSession: false,
      domOverlay: false,
    })
  }
  return store
}
