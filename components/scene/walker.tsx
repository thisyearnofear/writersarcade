'use client'

import { useEffect, useRef } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import { stepFirstPerson } from '@/lib/first-person'

const EYE_HEIGHT = 1.6
const WALK_SPEED = 6
const SPRINT_SPEED = 11
const LOOK_SENSITIVITY = 0.0022
const PITCH_LIMIT = 1.15

interface WalkerProps {
  active: boolean
  center: { x: number; z: number }
  radius: number
  onExit: () => void
}

/**
 * Desktop first-person rig.
 *
 * Pointer lock is requested by the "Step in" button (a user gesture). This
 * component only runs while that lock is held: WASD moves across the ground
 * disc, the mouse looks, and clicks raycast from the crosshair so the same
 * object and character handlers keep working.
 */
export function Walker({ active, center, radius, onExit }: WalkerProps) {
  const camera = useThree((state) => state.camera)
  const gl = useThree((state) => state.gl)
  const get = useThree((state) => state.get)
  const setEvents = useThree((state) => state.setEvents)
  const pressed = useRef(new Set<string>())
  const keys = useRef({ forward: 0, strafe: 0, sprint: false })
  const yaw = useRef(0)
  const pitch = useRef(0)
  const onExitRef = useRef(onExit)
  onExitRef.current = onExit

  useEffect(() => {
    if (!active) return
    const distance = Math.min(Math.max(radius * 0.28, 3), 10)
    camera.position.set(center.x + distance, EYE_HEIGHT, center.z + distance)
    camera.lookAt(center.x, 1.2, center.z)
    camera.rotation.order = 'YXZ'
    yaw.current = camera.rotation.y
    pitch.current = camera.rotation.x
  }, [active, camera, center.x, center.z, radius])

  useEffect(() => {
    if (!active) return
    const previous = get().events.compute
    setEvents({
      compute(_event, state) {
        const x = state.size.width / 2
        const y = state.size.height / 2
        state.pointer.set((x / state.size.width) * 2 - 1, -(y / state.size.height) * 2 + 1)
        state.raycaster.setFromCamera(state.pointer, state.camera)
      },
    })
    return () => {
      setEvents({ compute: previous })
    }
  }, [active, get, setEvents])

  useEffect(() => {
    if (!active) return
    const canvas = gl.domElement

    const syncKeys = () => {
      const has = (code: string) => pressed.current.has(code)
      keys.current.forward = (has('KeyW') ? 1 : 0) - (has('KeyS') ? 1 : 0)
      keys.current.strafe = (has('KeyD') ? 1 : 0) - (has('KeyA') ? 1 : 0)
      keys.current.sprint = has('ShiftLeft') || has('ShiftRight')
    }

    const onKey = (event: KeyboardEvent) => {
      if (event.type === 'keydown') pressed.current.add(event.code)
      else pressed.current.delete(event.code)
      syncKeys()
      if (
        event.type === 'keydown' &&
        (event.code === 'KeyW' || event.code === 'KeyA' || event.code === 'KeyS' || event.code === 'KeyD')
      ) {
        event.preventDefault()
      }
    }

    const onMouse = (event: MouseEvent) => {
      if (document.pointerLockElement !== canvas) return
      yaw.current -= event.movementX * LOOK_SENSITIVITY
      pitch.current = Math.min(PITCH_LIMIT, Math.max(-PITCH_LIMIT, pitch.current - event.movementY * LOOK_SENSITIVITY))
    }

    let sawLock = false
    const onLockChange = () => {
      if (document.pointerLockElement === canvas) sawLock = true
      else if (sawLock) onExitRef.current()
    }
    const onEscape = (event: KeyboardEvent) => {
      if (event.code === 'Escape') onExitRef.current()
    }

    window.addEventListener('keydown', onKey)
    window.addEventListener('keyup', onKey)
    window.addEventListener('keydown', onEscape)
    window.addEventListener('mousemove', onMouse)
    document.addEventListener('pointerlockchange', onLockChange)
    return () => {
      window.removeEventListener('keydown', onKey)
      window.removeEventListener('keyup', onKey)
      window.removeEventListener('keydown', onEscape)
      window.removeEventListener('mousemove', onMouse)
      document.removeEventListener('pointerlockchange', onLockChange)
      pressed.current.clear()
      keys.current = { forward: 0, strafe: 0, sprint: false }
    }
  }, [active, gl])

  useFrame((_, delta) => {
    if (!active) return
    const dt = Math.min(delta, 0.05)
    if (pressed.current.has('KeyQ')) yaw.current += 1.6 * dt
    if (pressed.current.has('KeyE')) yaw.current -= 1.6 * dt
    const pad = Math.max(4, radius * 0.9)
    const next = stepFirstPerson({
      x: camera.position.x,
      z: camera.position.z,
      yaw: yaw.current,
      forward: keys.current.forward,
      strafe: keys.current.strafe,
      delta: dt,
      speed: keys.current.sprint ? SPRINT_SPEED : WALK_SPEED,
      minX: center.x - pad,
      maxX: center.x + pad,
      minZ: center.z - pad,
      maxZ: center.z + pad,
    })
    camera.position.set(next.x, EYE_HEIGHT, next.z)
    camera.rotation.order = 'YXZ'
    camera.rotation.y = yaw.current
    camera.rotation.x = pitch.current
    camera.rotation.z = 0
  })

  return null
}
