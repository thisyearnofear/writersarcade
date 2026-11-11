import { describe, expect, it } from 'vitest'
import { stepFirstPerson } from '@/lib/first-person'

const bounds = { minX: -10, maxX: 10, minZ: -10, maxZ: 10 }

describe('stepFirstPerson', () => {
  it('walks toward -Z when yaw is 0', () => {
    const next = stepFirstPerson({
      x: 0,
      z: 0,
      yaw: 0,
      forward: 1,
      strafe: 0,
      delta: 1,
      speed: 4,
      ...bounds,
    })
    expect(next.x).toBeCloseTo(0)
    expect(next.z).toBeCloseTo(-4)
  })

  it('strafes toward +X when yaw is 0', () => {
    const next = stepFirstPerson({
      x: 0,
      z: 0,
      yaw: 0,
      forward: 0,
      strafe: 1,
      delta: 1,
      speed: 4,
      ...bounds,
    })
    expect(next.x).toBeCloseTo(4)
    expect(next.z).toBeCloseTo(0)
  })

  it('does not move faster on a diagonal', () => {
    const next = stepFirstPerson({
      x: 0,
      z: 0,
      yaw: 0,
      forward: 1,
      strafe: 1,
      delta: 1,
      speed: 4,
      ...bounds,
    })
    expect(Math.hypot(next.x, next.z)).toBeCloseTo(4)
  })

  it('stops at the ground disc', () => {
    const next = stepFirstPerson({
      x: 9,
      z: 0,
      yaw: 0,
      forward: 0,
      strafe: 1,
      delta: 1,
      speed: 8,
      ...bounds,
    })
    expect(next.x).toBe(10)
  })

  it('holds still when no keys are down', () => {
    const next = stepFirstPerson({
      x: 2,
      z: -3,
      yaw: 1,
      forward: 0,
      strafe: 0,
      delta: 1,
      speed: 6,
      ...bounds,
    })
    expect(next).toEqual({ x: 2, z: -3 })
  })
})
