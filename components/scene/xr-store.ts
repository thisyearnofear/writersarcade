'use client'

import { createXRStore, type XRStore } from '@react-three/xr'

const GLOBAL_KEY = '__writersArcadeXRStore' as const

type XRGlobal = typeof globalThis & { [GLOBAL_KEY]?: XRStore }

/**
 * Shared XR store for the diorama viewer.
 *
 * Hands are first-class input: a pinch is delivered through the same pointer
 * events a mouse click uses, so every clickable prop and NPC hitbox keeps
 * working in-headset with no input layer of its own. `offerSession` stays
 * off — the "Enter VR" button is the doorway, not an automatic prompt. The
 * DOM overlay is declined so the session never depends on a page element.
 *
 * The store lives on `globalThis`, not a module-local: dev bundlers can load
 * this module twice (button chunk vs viewer chunk), which would hand the
 * Enter VR button and the `<XR>` tree two different stores — the session
 * would exist while the renderer never binds.
 */
export function getDioramaXRStore(): XRStore {
  const holder = globalThis as XRGlobal
  if (!holder[GLOBAL_KEY]) {
    holder[GLOBAL_KEY] = createXRStore({
      hand: true,
      controller: true,
      foveation: 0.5,
      offerSession: false,
      domOverlay: false,
      // Localhost emulation mirrors the product: hands first, controllers as
      // fallback. Without it there is no way to smoke-test the session path.
      emulate: { type: 'metaQuest3', primaryInputMode: 'hand' },
    })
    // Desktop Chrome ships a deviceless native navigator.xr, which makes IWER
    // refuse to install its emulated runtime — sessions become impossible even
    // though the emulator device exists. Once the device lands on the store,
    // force-install the emulated runtime over the native one.
    const store = holder[GLOBAL_KEY]!
    const forceInstallRuntime = () => {
      const device = store.getState().emulator
      if (!device) return false
      try {
        device.installRuntime({ forceInstall: true })
      } catch {
        // Already installed or unrecoverable — the support check falls back.
      }
      return true
    }
    if (!forceInstallRuntime()) {
      const unsubscribe = store.subscribe(() => {
        if (forceInstallRuntime()) unsubscribe()
      })
    }
    // Dev aid for emulator verification.
    ;(window as unknown as { __dioramaXR?: XRStore }).__dioramaXR = store
  }
  return holder[GLOBAL_KEY]
}
