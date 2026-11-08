'use client'

import { Component, Suspense, useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import Link from 'next/link'
import { Canvas } from '@react-three/fiber'
import { OrbitControls, Text, Billboard, useGLTF } from '@react-three/drei'
import * as THREE from 'three'
import type { ScenePlan, SceneObject } from '@/domains/games/services/scene-planner.service'
import { getSceneAsset } from '@/lib/scene-assets'

interface DioramaViewerProps {
  scene: ScenePlan
  slug: string
  /** True when GameScene.thumbnailUrl already exists — skips auto-capture. */
  hasThumbnail?: boolean
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
  dawn: { ambient: 0.55, sun: 0.9, sunColor: '#ffd9b3', sunPos: [30, 18, -20] as const },
  day: { ambient: 0.75, sun: 1.1, sunColor: '#fff4e0', sunPos: [40, 50, 30] as const },
  dusk: { ambient: 0.4, sun: 0.7, sunColor: '#ff9a5c', sunPos: [-35, 12, -25] as const },
  night: { ambient: 0.22, sun: 0.35, sunColor: '#7a9cc6', sunPos: [-20, 35, -30] as const },
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

  return (
    <>
      {obj.primitive === 'box' && <mesh {...common}><boxGeometry args={[1, 1, 1]} /><meshStandardMaterial color={color} emissive={emissive} emissiveIntensity={emissiveIntensity} /></mesh>}
      {obj.primitive === 'cylinder' && <mesh {...common}><cylinderGeometry args={[0.5, 0.5, 1, 20]} /><meshStandardMaterial color={color} emissive={emissive} emissiveIntensity={emissiveIntensity} /></mesh>}
      {obj.primitive === 'sphere' && <mesh {...common}><sphereGeometry args={[0.5, 24, 24]} /><meshStandardMaterial color={color} emissive={emissive} emissiveIntensity={emissiveIntensity} /></mesh>}
      {obj.primitive === 'cone' && <mesh {...common}><coneGeometry args={[0.5, 1, 20]} /><meshStandardMaterial color={color} emissive={emissive} emissiveIntensity={emissiveIntensity} /></mesh>}
      {obj.primitive === 'plane' && <mesh {...common} rotation={[-Math.PI / 2, 0, 0]}><planeGeometry args={[2, 2]} /><meshStandardMaterial color={color} emissive={emissive} emissiveIntensity={emissiveIntensity} side={THREE.DoubleSide} /></mesh>}
      {obj.primitive === 'torus' && <mesh {...common}><torusGeometry args={[0.5, 0.15, 16, 32]} /><meshStandardMaterial color={color} emissive={emissive} emissiveIntensity={emissiveIntensity} /></mesh>}
      {obj.primitive === 'icosahedron' && <mesh {...common}><icosahedronGeometry args={[0.5, 0]} /><meshStandardMaterial color={color} emissive={emissive} emissiveIntensity={emissiveIntensity} flatShading /></mesh>}
      {obj.primitive === 'dodecahedron' && <mesh {...common}><dodecahedronGeometry args={[0.5, 0]} /><meshStandardMaterial color={color} emissive={emissive} emissiveIntensity={emissiveIntensity} flatShading /></mesh>}
    </>
  )
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

export function DioramaViewer({ scene, slug, hasThumbnail = false }: DioramaViewerProps) {
  const [selected, setSelected] = useState<SelectedObject>(null)
  const [npcDialogue, setNpcDialogue] = useState<NpcDialogue>(null)
  const [visitedIds, setVisitedIds] = useState<Set<string>>(() => loadVisited(slug))
  const [completeDismissed, setCompleteDismissed] = useState(false)
  const [thumbState, setThumbState] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle')
  const [intro, setIntro] = useState(true)
  const glRef = useRef<THREE.WebGLRenderer | null>(null)
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
    if (!gl || thumbState === 'saving') return false
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
    if (hasThumbnail) return
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

  return (
    <div className="relative h-full w-full">
      <Canvas
        shadows
        camera={{ position: [26, 22, 30], fov: 50 }}
        gl={{ antialias: true, preserveDrawingBuffer: true }}
        onCreated={({ gl }) => { glRef.current = gl }}
        onPointerMissed={() => { setSelected(null); setNpcDialogue(null) }}
      >
        <color attach="background" args={[scene.palette.sky[0]]} />
        <fog attach="fog" args={[scene.palette.fog, 40, 110]} />
        <ambientLight intensity={lighting.ambient} />
        <directionalLight
          position={[lighting.sunPos[0], lighting.sunPos[1], lighting.sunPos[2]]}
          intensity={lighting.sun}
          color={lighting.sunColor}
          castShadow
          shadow-mapSize={[2048, 2048]}
        />
        <hemisphereLight args={[scene.palette.sky[1] ?? scene.palette.sky[0], scene.palette.ground, 0.35]} />

        {/* Ground disc */}
        <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.02, 0]} receiveShadow>
          <circleGeometry args={[45, 64]} />
          <meshStandardMaterial color={scene.palette.ground} roughness={0.95} />
        </mesh>
        {/* Subtle horizon ring in the accent color */}
        <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.01, 0]}>
          <ringGeometry args={[44.5, 45, 64]} />
          <meshBasicMaterial color={scene.palette.accent} transparent opacity={0.25} side={THREE.DoubleSide} />
        </mesh>

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
                <Text fontSize={0.35} color="#ffffff" anchorX="center" outlineWidth={0.02} outlineColor="#000000">
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
          <Billboard key={z.id} position={[z.x, 6, z.z]}>
            <Text fontSize={0.6} color={scene.palette.accent} anchorX="center" outlineWidth={0.03} outlineColor="#000000" fillOpacity={0.85}>
              {z.label}
            </Text>
          </Billboard>
        ))}

        <OrbitControls
          makeDefault
          target={[0, 1.5, 0]}
          minDistance={6}
          maxDistance={80}
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
          <div className="pointer-events-auto w-full max-w-md rounded-xl border border-emerald-400/30 bg-black/80 p-5 text-center backdrop-blur">
            <p className="text-xs font-bold uppercase tracking-[0.25em] text-emerald-400">World complete</p>
            <p className="mt-1 font-serif text-xl text-white">You&rsquo;ve traced every thread of {scene.title}.</p>
            <div className="mt-3 flex items-center justify-center gap-4">
              <Link
                href={`/games/${slug}?play=1`}
                className="rounded-lg bg-emerald-500 px-4 py-2 text-sm font-semibold text-black transition hover:bg-emerald-400"
              >
                Back to the comic
              </Link>
              <Link href={`/games/${slug}/worlds`} className="text-sm text-white/60 hover:text-white">
                All worlds →
              </Link>
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
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-xl font-bold text-white drop-shadow-lg">{scene.title}</h1>
            <p className="text-sm capitalize text-white/70 drop-shadow">{scene.mood} · {scene.ground}</p>
          </div>
          {scene.game && (
            <div className="pointer-events-auto rounded-lg bg-black/50 px-3 py-2 text-sm text-warning backdrop-blur">
              <p>Goal: {scene.game.goal}</p>
              {objectiveIds.length > 0 && (
                <p className={`mt-0.5 text-xs ${worldComplete ? 'text-emerald-400' : 'text-white/60'}`}>
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
            <button
              onClick={saveThumbnail}
              disabled={thumbState === 'saving' || thumbState === 'saved'}
              className="rounded-lg bg-white/10 px-3 py-2 text-xs font-medium text-white backdrop-blur hover:bg-white/20 disabled:opacity-50"
            >
              {thumbState === 'saving' ? 'Saving…' : thumbState === 'saved' ? 'Thumbnail saved' : thumbState === 'error' ? 'Retry thumbnail' : 'Save thumbnail'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
