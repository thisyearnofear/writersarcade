'use client'

import { useLayoutEffect, useMemo } from 'react'
import { useTexture } from '@react-three/drei'
import * as THREE from 'three'
import type { ScenePlan } from '@/domains/games/services/scene-planner.service'

/**
 * Tileable PBR grounds made in PBRgen (Pro, commercial use).
 *
 * The color map is multiplied by a mood tint so a night scene does not sit
 * on a noon lawn. Missing biomes fall back to the flat palette disc.
 */

interface GroundMaps {
  col: string
  rough: string
  nrm: string
  /** World units per tile. Smaller means a finer repeat. */
  tile: number
  roughness: number
  metalness: number
}

const GROUNDS: Partial<Record<ScenePlan['ground'], GroundMaps>> = {
  meadow: {
    col: '/assets/scene/grounds/meadow-col.webp',
    rough: '/assets/scene/grounds/meadow-rough.webp',
    nrm: '/assets/scene/grounds/meadow-nrm.webp',
    tile: 4,
    roughness: 1,
    metalness: 0,
  },
  grass: {
    col: '/assets/scene/grounds/grass-col.webp',
    rough: '/assets/scene/grounds/grass-rough.webp',
    nrm: '/assets/scene/grounds/grass-nrm.webp',
    tile: 3.2,
    roughness: 1,
    metalness: 0,
  },
  sand: {
    col: '/assets/scene/grounds/sand-col.webp',
    rough: '/assets/scene/grounds/sand-rough.webp',
    nrm: '/assets/scene/grounds/sand-nrm.webp',
    tile: 3,
    roughness: 1,
    metalness: 0,
  },
  stone: {
    col: '/assets/scene/grounds/stone-col.webp',
    rough: '/assets/scene/grounds/stone-rough.webp',
    nrm: '/assets/scene/grounds/stone-nrm.webp',
    tile: 6,
    roughness: 1,
    metalness: 0,
  },
  snow: {
    col: '/assets/scene/grounds/snow-col.webp',
    rough: '/assets/scene/grounds/snow-rough.webp',
    nrm: '/assets/scene/grounds/snow-nrm.webp',
    tile: 4,
    roughness: 1,
    metalness: 0,
  },
  water: {
    col: '/assets/scene/grounds/water-col.webp',
    rough: '/assets/scene/grounds/water-rough.webp',
    nrm: '/assets/scene/grounds/water-nrm.webp',
    tile: 5,
    roughness: 0.35,
    metalness: 0.08,
  },
}

useTexture.preload([
  '/assets/scene/grounds/meadow-col.webp',
  '/assets/scene/grounds/meadow-rough.webp',
  '/assets/scene/grounds/meadow-nrm.webp',
  '/assets/scene/grounds/grass-col.webp',
  '/assets/scene/grounds/grass-rough.webp',
  '/assets/scene/grounds/grass-nrm.webp',
  '/assets/scene/grounds/sand-col.webp',
  '/assets/scene/grounds/sand-rough.webp',
  '/assets/scene/grounds/sand-nrm.webp',
  '/assets/scene/grounds/stone-col.webp',
  '/assets/scene/grounds/stone-rough.webp',
  '/assets/scene/grounds/stone-nrm.webp',
  '/assets/scene/grounds/snow-col.webp',
  '/assets/scene/grounds/snow-rough.webp',
  '/assets/scene/grounds/snow-nrm.webp',
  '/assets/scene/grounds/water-col.webp',
  '/assets/scene/grounds/water-rough.webp',
  '/assets/scene/grounds/water-nrm.webp',
])

const MOOD_TINT: Record<ScenePlan['mood'], string> = {
  dawn: '#ffe6cc',
  day: '#ffffff',
  dusk: '#ffc8a4',
  night: '#8fa4c4',
}

export function hasGroundMaps(ground: ScenePlan['ground']): boolean {
  return ground in GROUNDS
}

export function FlatGround({
  radius,
  center,
  color,
  fog,
}: {
  radius: number
  center: { x: number; z: number }
  color: string
  fog: string
}) {
  return (
    <mesh rotation={[-Math.PI / 2, 0, 0]} position={[center.x, -0.02, center.z]} receiveShadow>
      <circleGeometry args={[radius, 64]} />
      <meshStandardMaterial color={color} roughness={0.95} metalness={0} emissive={fog} emissiveIntensity={0.12} />
    </mesh>
  )
}

export function TexturedGround({
  ground,
  radius,
  center,
  mood,
  fog,
}: {
  ground: ScenePlan['ground']
  radius: number
  center: { x: number; z: number }
  mood: ScenePlan['mood']
  fog: string
}) {
  const spec = GROUNDS[ground]
  if (!spec) return null
  return <MappedGround spec={spec} radius={radius} center={center} mood={mood} fog={fog} />
}

function MappedGround({
  spec,
  radius,
  center,
  mood,
  fog,
}: {
  spec: GroundMaps
  radius: number
  center: { x: number; z: number }
  mood: ScenePlan['mood']
  fog: string
}) {
  const [col, rough, nrm] = useTexture([spec.col, spec.rough, spec.nrm])
  const normalScale = useMemo(() => new THREE.Vector2(1.1, 1.1), [])

  useLayoutEffect(() => {
    const repeat = Math.max(4, (radius * 2) / spec.tile)
    for (const tex of [col, rough, nrm]) {
      tex.wrapS = tex.wrapT = THREE.RepeatWrapping
      tex.repeat.set(repeat, repeat)
      tex.anisotropy = 8
      tex.needsUpdate = true
    }
    col.colorSpace = THREE.SRGBColorSpace
    rough.colorSpace = THREE.NoColorSpace
    nrm.colorSpace = THREE.NoColorSpace
  }, [col, rough, nrm, radius, spec.tile])

  return (
    <mesh rotation={[-Math.PI / 2, 0, 0]} position={[center.x, -0.02, center.z]} receiveShadow>
      <circleGeometry args={[radius, 96]} />
      <meshStandardMaterial
        map={col}
        roughnessMap={rough}
        normalMap={nrm}
        normalScale={normalScale}
        color={MOOD_TINT[mood]}
        roughness={spec.roughness}
        metalness={spec.metalness}
        emissive={fog}
        emissiveIntensity={mood === 'night' ? 0.06 : 0.04}
      />
    </mesh>
  )
}
