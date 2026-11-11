'use client'

import { Component, Suspense, useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import Link from 'next/link'
import { Canvas, useThree } from '@react-three/fiber'
import { OrbitControls, Text, Billboard, useGLTF, Environment, Lightformer, ContactShadows } from '@react-three/drei'
import * as THREE from 'three'
import type { ScenePlan, SceneObject } from '@/domains/games/services/scene-planner.service'
import { getSceneAsset } from '@/lib/scene-assets'
import { VRButton } from '@/components/scene/vr-button'

interface DioramaViewerProps {
  scene: ScenePlan
  slug: string
  /** True when GameScene.thumbnailUrl already exists — skips auto-capture. */
  hasThumbnail?: boolean
  /**
   * Standalone mode — used by the prompt-to-world surface.
   *
   * A world has no owning game, so the comic links, the thumbnail save and
   * the game-scoped progress key are all suppressed, and the VR affordance is
   * surfaced instead.
   */
  standalone?: boolean
  /** The prompt that produced this world, shown in the overlay. */
  prompt?: string
}

type SelectedObject = { label: string; narrativeHook?: string; action?: string } | null
type NpcDialogue = { name: string; persona: string; dilemma?: string } | null

const visitedStorageKey = (slug: string) => `wa-world-visited-${slug}`

function loadVisited(slug: string): Set<string> {
  if (typeof window === 'undefined') return new Set()
  try {
    const raw = window.localStorage.getItem(visitedStorageKey(slug))
    return new Set(raw ? (JSON.parse(raw) as string[]) : [])
  } catch {
    return new Set()
  }
}

const moodLighting = {
  dawn: { ambient: 0.9, sun: 1.2, sunColor: '#ffd9b3', sunPos: [30, 18, -20] as const },
  day: { ambient: 1.05, sun: 1.4, sunColor: '#fff4e0', sunPos: [40, 50, 30] as const },
  dusk: { ambient: 0.85, sun: 1.05, sunColor: '#ff9a5c', sunPos: [-35, 12, -25] as const },
  night: { ambient: 0.7, sun: 0.75, sunColor: '#a8c4e8', sunPos: [-20, 35, -30] as const },
} as const

const categoryFallbackColor: Record<SceneObject['category'], string> = {
  landmark: '#ffcc00',
  structure: '#8a8f98',
  prop: '#a89f8d',
  flora: '#5d8a4e',
  npc: '#c46a8a',
  interactable: '#ffcc00',
}

function hashHue(id: string): number {
  let h = 0
  for (let i = 0; i < id.length; i++) h = (h * 31 + id.charCodeAt(i)) | 0
  return Math.abs(h) % 360
}

/**
 * Lighten a hex colour toward white by `amount` (0-1).
 *
 * Night and dusk palettes are legitimately near-black; used raw, large
 * surfaces (the ground disc) swallow the whole lower half of the frame.
 */
function liftColor(hex: string, amount: number): string {
  const m = /^#([0-9a-f]{6})$/i.exec(hex)
  if (!m) return hex
  const num = parseInt(m[1], 16)
  const r = (num >> 16) & 0xff
  const g = (num >> 8) & 0xff
  const b = num & 0xff
  const lift = (c: number) => Math.round(c + (255 - c) * amount)
  return `#${((lift(r) << 16) | (lift(g) << 8) | lift(b)).toString(16).padStart(6, '0')}`
}

function objectColor(obj: SceneObject, palette: ScenePlan['palette']): string {
  if (obj.color) return obj.color
  if (obj.category === 'interactable' || obj.category === 'landmark') return palette.accent
  if (obj.category === 'flora') return categoryFallbackColor.flora
  // Deterministic muted variation for set dressing, biased toward palette tones.
  return `hsl(${hashHue(obj.id) % 40 + 20}, 18%, ${obj.category === 'structure' ? 38 : 52}%)`
}

/** Falls back to `fallback` if the GLB fails to load/parse. */
class AssetBoundary extends Component<{ fallback: ReactNode; children: ReactNode }, { failed: boolean }> {
  state = { failed: false }
  static getDerivedStateFromError() { return { failed: true } }
  render() { return this.state.failed ? this.props.fallback : this.props.children }
}

function AssetMesh({ src, onSelect, clickable }: { src: string; onSelect: () => void; clickable: boolean }) {
  const gltf = useGLTF(src)
  const object = useMemo(() => {
    const cloned = gltf.scene.clone(true)
    cloned.traverse((node) => {
      if (node instanceof THREE.Mesh) {
        node.castShadow = true
        node.receiveShadow = true
      }
    })
    return cloned
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [src])
  return (
    <primitive
      object={object}
      onClick={clickable ? (e: { stopPropagation: () => void }) => { e.stopPropagation(); onSelect() } : undefined}
      onPointerOver={clickable ? () => { document.body.style.cursor = 'pointer' } : undefined}
      onPointerOut={clickable ? () => { document.body.style.cursor = 'default' } : undefined}
    />
  )
}

function PrimitiveShape({ obj, color, isObjective, visited, onSelect }: {
  obj: SceneObject
  color: string
  isObjective: boolean
  visited: boolean
  onSelect: (o: SceneObject) => void
}) {
  const clickable = Boolean(obj.interactable) || isObjective
  const emissive = visited ? '#34d399' : isObjective ? '#ffcc00' : clickable ? color : '#000000'
  const emissiveIntensity = visited ? 0.3 : isObjective ? 0.35 : clickable ? 0.18 : 0
  const common = {
    castShadow: true,
    receiveShadow: true,
    onClick: clickable ? (e: { stopPropagation: () => void }) => { e.stopPropagation(); onSelect(obj) } : undefined,
    onPointerOver: clickable ? () => { document.body.style.cursor = 'pointer' } : undefined,
    onPointerOut: clickable ? () => { document.body.style.cursor = 'default' } : undefined,
  }
  const material = (
    <meshStandardMaterial
      color={color}
      emissive={emissive}
      emissiveIntensity={emissiveIntensity}
      roughness={0.72}
      metalness={0.05}
    />
  )

  // Primitives are the fallback when no curated asset matches. Proportions
  // vary by category so a fallback scene reads as designed blocks rather than
  // a row of identical unit cubes.
  //
  // Dimensions are deliberately near-unit: the parent group already applies
  // `obj.scale`, so large base dimensions would compound into oversized
  // geometry (a "landmark" cylinder at scale 3 became a 13-unit tower).
  const dims = (() => {
    switch (obj.category) {
      case 'landmark': return { w: 0.9, h: 1.7, d: 0.9 }
      case 'structure': return { w: 1.0, h: 0.9, d: 1.0 }
      case 'flora': return { w: 0.3, h: 1.0, d: 0.3 }
      case 'npc': return { w: 0.3, h: 0.8, d: 0.3 }
      case 'interactable': return { w: 0.45, h: 0.45, d: 0.45 }
      default: return { w: 0.55, h: 0.55, d: 0.55 }
    }
  })()

  return (
    <>
      {obj.primitive === 'box' && (
        <mesh {...common} position={[0, dims.h / 2, 0]}>
          <boxGeometry args={[dims.w, dims.h, dims.d]} />
          {material}
        </mesh>
      )}
      {obj.primitive === 'cylinder' && (
        <mesh {...common} position={[0, dims.h / 2, 0]}>
          <cylinderGeometry args={[dims.w / 2, dims.w / 2, dims.h, 20]} />
          {material}
        </mesh>
      )}
      {obj.primitive === 'sphere' && (
        <mesh {...common} position={[0, dims.h / 2, 0]}>
          <sphereGeometry args={[dims.w / 2, 24, 24]} />
          {material}
        </mesh>
      )}
      {obj.primitive === 'cone' && (
        <mesh {...common} position={[0, dims.h / 2, 0]}>
          <coneGeometry args={[dims.w / 2, dims.h, 20]} />
          {material}
        </mesh>
      )}
      {obj.primitive === 'plane' && (
        <mesh {...common} position={[0, 0.02, 0]} rotation={[-Math.PI / 2, 0, 0]}>
          <planeGeometry args={[dims.w * 2, dims.d * 2]} />
          <meshStandardMaterial
            color={color}
            emissive={emissive}
            emissiveIntensity={emissiveIntensity}
            roughness={0.85}
            side={THREE.DoubleSide}
          />
        </mesh>
      )}
      {obj.primitive === 'torus' && (
        <mesh {...common} position={[0, dims.h / 2, 0]} rotation={[Math.PI / 2, 0, 0]}>
          <torusGeometry args={[dims.w / 2, dims.w / 5, 16, 32]} />
          {material}
        </mesh>
      )}
      {obj.primitive === 'icosahedron' && (
        <mesh {...common} position={[0, dims.h / 2, 0]}>
          <icosahedronGeometry args={[dims.w / 2, 0]} />
          <meshStandardMaterial
            color={color}
            emissive={emissive}
            emissiveIntensity={emissiveIntensity}
            roughness={0.8}
            flatShading
          />
        </mesh>
      )}
      {obj.primitive === 'dodecahedron' && (
        <mesh {...common} position={[0, dims.h / 2, 0]}>
          <dodecahedronGeometry args={[dims.w / 2, 0]} />
          <meshStandardMaterial
            color={color}
            emissive={emissive}
            emissiveIntensity={emissiveIntensity}
            roughness={0.8}
            flatShading
          />
        </mesh>
      )}
    </>
  )
}

/**
 * Positions the camera to frame the scene in the ACTUAL viewport.
 *
 * The camera distance has to satisfy two constraints at once: the content
 * must fit vertically (aspect-independent) and horizontally (which depends on
 * the viewport). Only the canvas knows the real aspect ratio, so the solve
 * happens here rather than in the parent.
 */
function CameraRig({
  framing,
  controlsRef,
}: {
  framing: {
    center: THREE.Vector3
    dir: THREE.Vector3
    right: THREE.Vector3
    up: THREE.Vector3
    tanV: number
    points: THREE.Vector3[]
    distance: number
  }
  controlsRef: React.RefObject<any>
}) {
  const { camera, size } = useThree()

  useEffect(() => {
    const aspect = size.width / Math.max(1, size.height)
    const tanH = framing.tanV * aspect

    let distance = 12
    for (const p of framing.points) {
      const v = p.clone().sub(framing.center)
      const x = Math.abs(v.dot(framing.right))
      const y = Math.abs(v.dot(framing.up))
      const z = v.dot(framing.dir)
      distance = Math.max(distance, z + x / tanH, z + y / framing.tanV)
    }
    distance = Math.min(110, distance * 1.08)

    camera.position.copy(framing.center).add(framing.dir.clone().multiplyScalar(distance))
    camera.lookAt(framing.center)
    camera.updateProjectionMatrix()

    // OrbitControls keeps its own target; point it at the scene centre so
    // orbiting pivots around the content, not the world origin.
    const controls = controlsRef.current
    if (controls) {
      controls.target.copy(framing.center)
      controls.update()
    }
  }, [camera, size.width, size.height, framing, controlsRef])

  return null
}

function SceneObjectMesh({ obj, color, isObjective, visited, onSelect }: {
  obj: SceneObject
  color: string
  isObjective: boolean
  visited: boolean
  onSelect: (o: SceneObject) => void
}) {
  const asset = getSceneAsset(obj.assetKey)
  const clickable = Boolean(obj.interactable) || isObjective
  const position: [number, number, number] = [obj.position.x, obj.position.y, obj.position.z]

  return (
    <group position={position} rotation={[0, obj.rotationY, 0]} scale={obj.scale}>
      {asset ? (
        <AssetBoundary
          fallback={<PrimitiveShape obj={obj} color={color} isObjective={isObjective} visited={visited} onSelect={onSelect} />}
        >
          <Suspense fallback={null}>
            <AssetMesh
              src={asset.src}
              clickable={clickable}
              onSelect={() => onSelect(obj)}
            />
          </Suspense>
        </AssetBoundary>
      ) : (
        <PrimitiveShape obj={obj} color={color} isObjective={isObjective} visited={visited} onSelect={onSelect} />
      )}
      {visited && clickable && (
        <Billboard position={[0, 2.6, 0]}>
          <Text fontSize={0.45} color="#34d399" anchorX="center" outlineWidth={0.03} outlineColor="#000000">
            ✓
          </Text>
        </Billboard>
      )}
    </group>
  )
}

export function DioramaViewer({ scene, slug, hasThumbnail = false, standalone = false, prompt }: DioramaViewerProps) {
  const [selected, setSelected] = useState<SelectedObject>(null)
  const [npcDialogue, setNpcDialogue] = useState<NpcDialogue>(null)
  const [visitedIds, setVisitedIds] = useState<Set<string>>(() => loadVisited(slug))
  const [completeDismissed, setCompleteDismissed] = useState(false)
  const [thumbState, setThumbState] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle')
  const [intro, setIntro] = useState(true)
  const glRef = useRef<THREE.WebGLRenderer | null>(null)
  const controlsRef = useRef<any>(null)
  const [renderer, setRenderer] = useState<THREE.WebGLRenderer | null>(null)
  const lighting = moodLighting[scene.mood] ?? moodLighting.day
  const objectiveIds = useMemo(() => scene.game?.objectiveIds ?? [], [scene.game])
  const objectiveIdSet = useMemo(() => new Set(objectiveIds), [objectiveIds])
  const objectivesFound = objectiveIds.filter((id) => visitedIds.has(id)).length
  const worldComplete = objectiveIds.length > 0 && objectivesFound === objectiveIds.length

  // Persist discovered threads per slug so returning to the world keeps progress.
  useEffect(() => {
    try {
      window.localStorage.setItem(visitedStorageKey(slug), JSON.stringify([...visitedIds]))
    } catch { /* storage unavailable — progress stays in-memory */ }
  }, [visitedIds, slug])

  const handleSelect = (o: SceneObject) => {
    setNpcDialogue(null)
    setVisitedIds((prev) => (prev.has(o.id) ? prev : new Set(prev).add(o.id)))
    setSelected({
      label: o.label,
      narrativeHook: o.interactable?.narrativeHook ?? (objectiveIdSet.has(o.id) ? 'A thread of this story — found.' : undefined),
      action: o.interactable?.action,
    })
  }

  // Reveal: slow camera sweep + title card for the first ~3.5s, then hands
  // control to the user. Any pointer interaction skips the intro early.
  useEffect(() => {
    const t = setTimeout(() => setIntro(false), 3500)
    return () => clearTimeout(t)
  }, [])

  const captureThumbnail = async () => {
    const gl = glRef.current
    if (!gl || thumbState === 'saving' || standalone) return false
    setThumbState('saving')
    try {
      const dataUrl = gl.domElement.toDataURL('image/jpeg', 0.85)
      const res = await fetch(`/api/games/${slug}/scene/thumbnail`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ image: dataUrl }),
      })
      setThumbState(res.ok ? 'saved' : 'error')
      return res.ok
    } catch {
      setThumbState('error')
      return false
    }
  }

  // Auto-capture once per scene so every viewer generates the share artifact;
  // skipped entirely when a thumbnail already exists server-side.
  useEffect(() => {
    if (hasThumbnail || standalone) return
    const t = setTimeout(() => { void captureThumbnail() }, 3000)
    return () => clearTimeout(t)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const saveThumbnail = () => { void captureThumbnail() }

  const zoneCentroids = useMemo(() => {
    const map = new Map<string, { x: number; z: number; count: number; label: string }>()
    for (const zone of scene.zones) map.set(zone.id, { x: 0, z: 0, count: 0, label: zone.label })
    for (const obj of scene.objects) {
      const z = map.get(obj.zoneId)
      if (z) { z.x += obj.position.x; z.z += obj.position.z; z.count++ }
    }
    return [...map.entries()]
      .filter(([, v]) => v.count > 0)
      .map(([id, v]) => ({ id, label: v.label, x: v.x / v.count, z: v.z / v.count }))
  }, [scene.zones, scene.objects])

  // Frame the camera on the actual content. A fixed camera leaves small
  // scenes lost in the middle of the ground disc and large scenes cropped.
  //
  // The distance is solved in screen space: for a chosen view direction we
  // project every object's bounds onto the camera's right/up axes and solve
  // for the smallest distance that keeps them all inside the frustum. A
  // bounding-sphere approximation over-shoots badly for flat scenes (a
  // subway platform is long but low), which leaves the world tiny on screen.
  const framing = useMemo(() => {
    // Frame on the bulk of the scene, not its extremes. One far-flung prop
    // would otherwise push the camera back until everything looked like a
    // speck. Percentile clipping keeps the outliers visible at the edges
    // without letting them dictate the framing.
    const pts = scene.objects.map((o) => o.position)
    const quantile = (arr: number[], q: number) => {
      if (arr.length === 0) return 0
      const sorted = [...arr].sort((a, b) => a - b)
      const idx = Math.min(sorted.length - 1, Math.max(0, Math.round((sorted.length - 1) * q)))
      return sorted[idx]
    }
    const xs = pts.map((p) => p.x)
    const ys = pts.map((p) => p.y)
    const zs = pts.map((p) => p.z)
    const lo = 0.06
    const hi = 0.94
    const minX = quantile(xs, lo); const maxX = quantile(xs, hi)
    const minY = quantile(ys, lo); const maxY = quantile(ys, hi)
    const minZ = quantile(zs, lo); const maxZ = quantile(zs, hi)

    const points: THREE.Vector3[] = []
    for (const obj of scene.objects) {
      const half = Math.max(1.0, obj.scale * 0.6)
      points.push(
        new THREE.Vector3(
          THREE.MathUtils.clamp(obj.position.x, minX - half, maxX + half),
          THREE.MathUtils.clamp(obj.position.y, minY, maxY + half),
          THREE.MathUtils.clamp(obj.position.z, minZ - half, maxZ + half),
        ),
      )
    }
    if (points.length === 0) {
      return {
        center: new THREE.Vector3(0, 1.5, 0),
        radius: 45,
        dir: new THREE.Vector3(0.72, 0.62, 0.72).normalize(),
        right: new THREE.Vector3(1, 0, 0),
        up: new THREE.Vector3(0, 1, 0),
        tanV: Math.tan(25 * (Math.PI / 180)),
        points: [],
        distance: 45,
        position: new THREE.Vector3(26, 22, 30),
      }
    }

    const box = new THREE.Box3().setFromPoints(points)
    const center = box.getCenter(new THREE.Vector3())
    // Keep the orbit target a little above the ground plane so the scene
    // does not sit low in the frame.
    center.y = Math.max(1.5, center.y)
    // The ground disc is sized to the content — a fixed 45-unit disc makes a
    // 20-unit scene look like a handful of props lost in an empty field.
    const radius = Math.max(10, box.getSize(new THREE.Vector3()).length() / 2 + 4)

    // View direction: 45° azimuth, ~38° elevation.
    const dir = new THREE.Vector3(0.72, 0.62, 0.72).normalize()
    const right = new THREE.Vector3().crossVectors(dir, new THREE.Vector3(0, 1, 0)).normalize()
    const up = new THREE.Vector3().crossVectors(right, dir).normalize()

    const fov = 50
    const tanV = Math.tan((fov / 2) * (Math.PI / 180))

    // The camera distance depends on the viewport aspect, which is only known
    // once the canvas is measured — <CameraRig> solves for it and positions
    // the camera. Here we only solve for the VERTICAL fit, which is
    // aspect-independent, and let the rig tighten it horizontally.
    let distance = 12
    for (const p of points) {
      const v = p.clone().sub(center)
      const y = Math.abs(v.dot(up))
      const z = v.dot(dir)
      distance = Math.max(distance, z + y / tanV)
    }
    distance = Math.min(110, distance * 1.12)

    return {
      center,
      radius,
      dir,
      right,
      up,
      tanV,
      points,
      distance,
      position: center.clone().add(dir.clone().multiplyScalar(distance)),
    }
  }, [scene.objects])

  const camera = useMemo(
    () => ({
      position: framing.position.toArray() as [number, number, number],
      fov: 50,
    }),
    [framing],
  )

  // Keep the orbit target on the scene's centre rather than the origin.
  const orbitTarget = useMemo<[number, number, number]>(
    () => [framing.center.x, framing.center.y, framing.center.z],
    [framing],
  )

  // Zone labels are world-space text, so they must scale with the scene or
  // they swallow the frame once the camera moves in close. Text width grows
  // with the label's length, so the size is kept small.
  const labelSize = Math.max(0.16, Math.min(0.38, framing.radius * 0.016))
  const labelHeight = Math.max(3, framing.radius * 0.42)

  return (
    <div className="relative h-full w-full">
      <Canvas
        shadows
        camera={camera}
        gl={{ antialias: true, preserveDrawingBuffer: true }}
        onCreated={({ gl }) => { glRef.current = gl; setRenderer(gl) }}
        onPointerMissed={() => { setSelected(null); setNpcDialogue(null) }}
      >
        <CameraRig framing={framing} controlsRef={controlsRef} />

        <color attach="background" args={[scene.palette.sky[0]]} />
        {/* Fog tuned to the scene so the ground dissolves into the sky at the
            horizon instead of ending on a hard rim. */}
        <fog attach="fog" args={[scene.palette.fog, framing.radius * 0.9, framing.radius * 2.8]} />

        {/* Gradient sky dome — the palette's sky is a 2-3 stop ramp, and a flat
            background colour wastes it. Rendered on the inside of a large
            sphere so it reads as atmosphere rather than a backdrop. */}
        <mesh scale={[-1, 1, 1]} frustumCulled={false}>
          <sphereGeometry args={[framing.radius * 12, 32, 16]} />
          <shaderMaterial
            side={THREE.BackSide}
            depthWrite={false}
            fog={false}
            uniforms={{
              topColor: { value: new THREE.Color(scene.palette.sky[2] ?? scene.palette.sky[0]) },
              midColor: { value: new THREE.Color(scene.palette.sky[0]) },
              bottomColor: { value: new THREE.Color(scene.palette.sky[1] ?? scene.palette.sky[0]) },
            }}
            vertexShader={`
              varying vec3 vWorld;
              void main() {
                vWorld = (modelMatrix * vec4(position, 1.0)).xyz;
                gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
              }
            `}
            fragmentShader={`
              uniform vec3 topColor;
              uniform vec3 midColor;
              uniform vec3 bottomColor;
              varying vec3 vWorld;
              void main() {
                float h = normalize(vWorld).y;
                vec3 c = h > 0.0
                  ? mix(midColor, topColor, pow(h, 0.65))
                  : mix(midColor, bottomColor, pow(-h, 0.8));
                gl_FragColor = vec4(c, 1.0);
                #include <colorspace_fragment>
              }
            `}
          />
        </mesh>

        {/* Image-based lighting rendered locally from lightformers — no HDR
            download, so it works offline and in a judging sandbox. Without
            this, PBR materials have no environment to reflect and the scene
            reads flat and muddy. */}
        <Environment resolution={128} frames={1}>
          <Lightformer
            form="circle"
            intensity={2.2}
            color={lighting.sunColor}
            position={[12, 14, 8]}
            scale={16}
            target={[0, 0, 0]}
          />
          <Lightformer
            form="circle"
            intensity={0.9}
            color={scene.palette.sky[1] ?? scene.palette.sky[0]}
            position={[-14, 9, -10]}
            scale={20}
            target={[0, 0, 0]}
          />
          <Lightformer
            form="rect"
            intensity={0.5}
            color={scene.palette.ground}
            position={[0, -8, 0]}
            scale={[40, 40, 1]}
            rotation={[Math.PI / 2, 0, 0]}
          />
        </Environment>

        <ambientLight intensity={lighting.ambient} />
        <directionalLight
          position={[lighting.sunPos[0], lighting.sunPos[1], lighting.sunPos[2]]}
          intensity={lighting.sun}
          color={lighting.sunColor}
          castShadow
          shadow-mapSize={[2048, 2048]}
          shadow-camera-near={1}
          shadow-camera-far={120}
          shadow-camera-left={-framing.radius * 1.6}
          shadow-camera-right={framing.radius * 1.6}
          shadow-camera-top={framing.radius * 1.6}
          shadow-camera-bottom={-framing.radius * 1.6}
        />
        <hemisphereLight args={[scene.palette.sky[1] ?? scene.palette.sky[0], scene.palette.ground, 0.55]} />
        {/* Fill light from the opposite side so shadowed faces are readable. */}
        <directionalLight
          position={[-lighting.sunPos[0], lighting.sunPos[1] * 0.5, -lighting.sunPos[2]]}
          intensity={lighting.sun * 0.35}
          color={scene.palette.sky[1] ?? scene.palette.sky[0]}
        />

        {/* Ground disc — sized to the scene so the world fills the frame.
            The palette's ground colour is often near-black (night scenes),
            so it is lifted a little toward the fog tone and given a faint
            emissive floor. The lift is kept small: a large lift turns the
            disc into a flat, over-bright mass with no depth.
            A 'void' ground means there is no ground — the scene floats, so
            no disc and no horizon ring. */}
        {scene.ground !== 'void' && (
          <mesh
            rotation={[-Math.PI / 2, 0, 0]}
            position={[framing.center.x, -0.02, framing.center.z]}
            receiveShadow
          >
            <circleGeometry args={[framing.radius, 64]} />
            <meshStandardMaterial
              color={liftColor(scene.palette.ground, 0.07)}
              roughness={0.95}
              metalness={0}
              emissive={scene.palette.fog}
              emissiveIntensity={0.12}
            />
          </mesh>
        )}
        {/* Subtle horizon ring in the accent color */}
        {scene.ground !== 'void' && (
          <mesh rotation={[-Math.PI / 2, 0, 0]} position={[framing.center.x, -0.01, framing.center.z]}>
            <ringGeometry args={[framing.radius - 0.5, framing.radius, 64]} />
            <meshBasicMaterial color={scene.palette.accent} transparent opacity={0.25} side={THREE.DoubleSide} />
          </mesh>
        )}

        {/* Contact shadows — grounds the objects so they do not float on the
            ground disc. Cheaper and softer than shadow-mapping alone. */}
        <ContactShadows
          position={[framing.center.x, 0.01, framing.center.z]}
          scale={framing.radius * 2.2}
          far={framing.radius * 0.9}
          blur={2.4}
          opacity={0.45}
          resolution={512}
          frames={1}
          color="#000000"
        />

        {scene.objects.map((obj) => (
          <SceneObjectMesh
            key={obj.id}
            obj={obj}
            color={objectColor(obj, scene.palette)}
            isObjective={objectiveIdSet.has(obj.id)}
            visited={visitedIds.has(obj.id)}
            onSelect={handleSelect}
          />
        ))}

        {scene.npcs.map((npc) => {
          const npcAsset = getSceneAsset(npc.assetKey)
          return (
            <group key={npc.id} position={[npc.position.x, npc.position.y, npc.position.z]}>
              {npcAsset ? (
                <AssetBoundary fallback={
                  <mesh castShadow position={[0, 0.9, 0]}>
                    <capsuleGeometry args={[0.35, 1.1, 8, 16]} />
                    <meshStandardMaterial color={scene.palette.accent} roughness={0.6} />
                  </mesh>
                }>
                  <Suspense fallback={null}>
                    <AssetMesh src={npcAsset.src} clickable={false} onSelect={() => {}} />
                  </Suspense>
                </AssetBoundary>
              ) : (
                <mesh castShadow position={[0, 0.9, 0]}>
                  <capsuleGeometry args={[0.35, 1.1, 8, 16]} />
                  <meshStandardMaterial color={scene.palette.accent} roughness={0.6} />
                </mesh>
              )}
              <Billboard position={[0, 2.1, 0]}>
                <Text
                  fontSize={labelSize * 0.6}
                  color="#ffffff"
                  anchorX="center"
                  outlineWidth={labelSize * 0.03}
                  outlineColor="#000000"
                >
                  {npc.name}
                </Text>
              </Billboard>
              {/* Invisible hitbox — NPCs are talkable even though the capsule
                  fallback has no clickable flag of its own. */}
              <mesh
                position={[0, 1.1, 0]}
                onClick={(e) => {
                  e.stopPropagation()
                  setSelected(null)
                  setNpcDialogue({ name: npc.name, persona: npc.persona, dilemma: npc.dilemma })
                }}
                onPointerOver={() => { document.body.style.cursor = 'pointer' }}
                onPointerOut={() => { document.body.style.cursor = 'default' }}
              >
                <cylinderGeometry args={[0.9, 0.9, 2.4, 8]} />
                <meshBasicMaterial visible={false} />
              </mesh>
            </group>
          )
        })}

        {zoneCentroids.map((z) => (
          <Billboard key={z.id} position={[z.x, labelHeight, z.z]}>
            <Text
              fontSize={labelSize}
              color={scene.palette.accent}
              anchorX="center"
              outlineWidth={labelSize * 0.05}
              outlineColor="#000000"
              fillOpacity={0.85}
            >
              {z.label}
            </Text>
          </Billboard>
        ))}

        <OrbitControls
          makeDefault
          ref={controlsRef}
          target={orbitTarget}
          minDistance={6}
          maxDistance={110}
          maxPolarAngle={Math.PI / 2.05}
          autoRotate={intro}
          autoRotateSpeed={0.7}
          onStart={() => setIntro(false)}
        />
      </Canvas>

      {/* Reveal title card — fades out as the camera sweep ends */}
      <div
        className={`pointer-events-none absolute inset-0 flex items-center justify-center transition-opacity duration-700 ${intro ? 'opacity-100' : 'opacity-0'}`}
        aria-hidden={!intro}
      >
        <div className="text-center">
          <p className="text-xs font-bold uppercase tracking-[0.3em] text-white/60">A walkable diorama</p>
          <h2 className="mt-2 font-serif text-4xl font-bold text-white drop-shadow-lg sm:text-5xl">{scene.title}</h2>
          <p className="mt-3 text-sm capitalize text-white/70">{scene.mood} · {scene.ground}</p>
        </div>
      </div>

      {/* World-complete moment — every objective thread discovered. */}
      {worldComplete && !completeDismissed && !intro && (
        <div className="pointer-events-none absolute inset-x-0 bottom-28 flex justify-center px-4">
          <div className="pointer-events-auto w-full max-w-md rounded-xl border border-success/30 bg-black/80 p-5 text-center backdrop-blur">
            <p className="text-xs font-bold uppercase tracking-[0.25em] text-success">World complete</p>
            <p className="mt-1 font-serif text-xl text-white">You&rsquo;ve traced every thread of {scene.title}.</p>
            <div className="mt-3 flex items-center justify-center gap-4">
              {standalone ? (
                <Link
                  href="/worlds"
                  className="rounded-lg bg-success px-4 py-2 text-sm font-semibold text-black transition hover:bg-success/90"
                >
                  Describe another world
                </Link>
              ) : (
                <>
                  <Link
                    href={`/games/${slug}?play=1`}
                    className="rounded-lg bg-success px-4 py-2 text-sm font-semibold text-black transition hover:bg-success/90"
                  >
                    Back to the comic
                  </Link>
                  <Link href={`/games/${slug}/worlds`} className="text-sm text-white/60 hover:text-white">
                    All worlds →
                  </Link>
                </>
              )}
            </div>
            <button
              onClick={() => setCompleteDismissed(true)}
              className="mt-3 text-xs text-white/40 hover:text-white/70"
            >
              Keep exploring
            </button>
          </div>
        </div>
      )}

      {/* Overlay UI */}
      <div className="pointer-events-none absolute inset-0 flex flex-col justify-between p-4">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h1 className="text-xl font-bold text-white drop-shadow-lg">{scene.title}</h1>
            <p className="text-sm capitalize text-white/70 drop-shadow">{scene.mood} · {scene.ground}</p>
            {standalone && prompt && (
              <p className="mt-1 max-w-md text-xs italic text-white/60 drop-shadow">“{prompt}”</p>
            )}
          </div>
          {scene.game && (
            <div className="pointer-events-auto rounded-lg bg-black/50 px-3 py-2 text-sm text-warning backdrop-blur">
              <p>Goal: {scene.game.goal}</p>
              {objectiveIds.length > 0 && (
                <p className={`mt-0.5 text-xs ${worldComplete ? 'text-success' : 'text-white/60'}`}>
                  Threads found {objectivesFound}/{objectiveIds.length}{worldComplete ? ' — world complete' : ''}
                </p>
              )}
            </div>
          )}
        </div>
        <div className="flex items-end justify-between gap-3">
          <p className="text-xs text-white/60 drop-shadow">
            Drag to orbit · scroll to zoom · click glowing objects{scene.npcs.length > 0 ? ' · click characters to talk' : ''}
          </p>
          <div className="pointer-events-auto flex items-center gap-2">
            {npcDialogue && (
              <div className="max-w-sm rounded-lg border border-white/10 bg-black/70 p-4 text-white backdrop-blur">
                <p className="font-semibold text-warning">{npcDialogue.name}</p>
                <p className="mt-1 text-sm italic text-white/85">“{npcDialogue.persona}”</p>
                {npcDialogue.dilemma && (
                  <p className="mt-2 text-xs text-white/60">At stake: {npcDialogue.dilemma}</p>
                )}
              </div>
            )}
            {selected && !npcDialogue && (
              <div className="max-w-sm rounded-lg border border-white/10 bg-black/70 p-4 text-white backdrop-blur">
                <p className="font-semibold text-warning">{selected.action ? `${selected.action}: ` : ''}{selected.label}</p>
                {selected.narrativeHook && <p className="mt-1 text-sm text-white/85">{selected.narrativeHook}</p>}
              </div>
            )}
            {!standalone && (
              <button
                onClick={saveThumbnail}
                disabled={thumbState === 'saving' || thumbState === 'saved'}
                className="rounded-lg bg-white/10 px-3 py-2 text-xs font-medium text-white backdrop-blur hover:bg-white/20 disabled:opacity-50"
              >
                {thumbState === 'saving' ? 'Saving…' : thumbState === 'saved' ? 'Thumbnail saved' : thumbState === 'error' ? 'Retry thumbnail' : 'Save thumbnail'}
              </button>
            )}
            <VRButton renderer={renderer} />
          </div>
        </div>
      </div>
    </div>
  )
}
