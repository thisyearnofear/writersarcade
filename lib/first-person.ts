/**
 * One step of desktop first-person movement.
 *
 * Yaw matches a Three.js camera with `rotation.order = 'YXZ'`: yaw 0 looks
 * down -Z, and positive yaw turns toward -X. Strafe is the camera's right.
 * Diagonal input is normalised so it is not faster than walking straight.
 * The result is clamped to the ground disc so a visitor cannot walk off it.
 */

export interface FirstPersonStep {
  x: number
  z: number
  yaw: number
  /** +1 forward, -1 back, 0 idle. */
  forward: number
  /** +1 right, -1 left, 0 idle. */
  strafe: number
  delta: number
  speed: number
  minX: number
  maxX: number
  minZ: number
  maxZ: number
}

export function stepFirstPerson(step: FirstPersonStep): { x: number; z: number } {
  const magnitude = Math.hypot(step.forward, step.strafe)
  if (magnitude === 0 || step.delta <= 0 || step.speed <= 0) {
    return {
      x: clamp(step.x, step.minX, step.maxX),
      z: clamp(step.z, step.minZ, step.maxZ),
    }
  }

  const forward = step.forward / magnitude
  const strafe = step.strafe / magnitude
  const sin = Math.sin(step.yaw)
  const cos = Math.cos(step.yaw)
  const distance = step.speed * step.delta

  return {
    x: clamp(step.x + (-sin * forward + cos * strafe) * distance, step.minX, step.maxX),
    z: clamp(step.z + (-cos * forward - sin * strafe) * distance, step.minZ, step.maxZ),
  }
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value))
}
