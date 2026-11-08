'use client'

import { Component, Suspense, useMemo, useRef, useState, type ReactNode } from 'react'
import { Canvas } from '@react-three/fiber'
import { OrbitControls, Text, Billboard, useGLTF } from '@react-three/drei'
import * as THREE from 'three'
import type { ScenePlan, SceneObject } from '@/domains/games/services/scene-planner.service'
import { getSceneAsset } from '@/lib/scene-assets'

interface DioramaViewerProps {
  scene: ScenePlan
  slug: string
}

type SelectedObject = { label: string; narrativeHook?: string; action?: string } | null

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

function PrimitiveShape({ obj, color, isObjective, onSelect }: {
  obj: SceneObject
  color: string
  isObjective: boolean
  onSelect: (o: SceneObject) => void
}) {
  const clickable = Boolean(obj.interactable)
  const emissive = isObjective ? '#ffcc00' : clickable ? color : '#000000'
  const common = {
    castShadow: true,
    receiveShadow: true,
    onClick: clickable ? (e: { stopPropagation: () => void }) => { e.stopPropagation(); onSelect(obj) } : undefined,
    onPointerOver: clickable ? () => { document.body.style.cursor = 'pointer' } : undefined,
    onPointerOut: clickable ? () => { document.body.style.cursor = 'default' } : undefined,
  }

  return (
    <>
      {obj.primitive === 'box' && <mesh {...common}><boxGeometry args={[1, 1, 1]} /><meshStandardMaterial color={color} emissive={emissive} emissiveIntensity={isObjective ? 0.35 : clickable ? 0.18 : 0} /></mesh>}
      {obj.primitive === 'cylinder' && <mesh {...common}><cylinderGeometry args={[0.5, 0.5, 1, 20]} /><meshStandardMaterial color={color} emissive={emissive} emissiveIntensity={isObjective ? 0.35 : clickable ? 0.18 : 0} /></mesh>}
      {obj.primitive === 'sphere' && <mesh {...common}><sphereGeometry args={[0.5, 24, 24]} /><meshStandardMaterial color={color} emissive={emissive} emissiveIntensity={isObjective ? 0.35 : clickable ? 0.18 : 0} /></mesh>}
      {obj.primitive === 'cone' && <mesh {...common}><coneGeometry args={[0.5, 1, 20]} /><meshStandardMaterial color={color} emissive={emissive} emissiveIntensity={isObjective ? 0.35 : clickable ? 0.18 : 0} /></mesh>}
      {obj.primitive === 'plane' && <mesh {...common} rotation={[-Math.PI / 2, 0, 0]}><planeGeometry args={[2, 2]} /><meshStandardMaterial color={color} emissive={emissive} emissiveIntensity={isObjective ? 0.35 : clickable ? 0.18 : 0} side={THREE.DoubleSide} /></mesh>}
      {obj.primitive === 'torus' && <mesh {...common}><torusGeometry args={[0.5, 0.15, 16, 32]} /><meshStandardMaterial color={color} emissive={emissive} emissiveIntensity={isObjective ? 0.35 : clickable ? 0.18 : 0} /></mesh>}
      {obj.primitive === 'icosahedron' && <mesh {...common}><icosahedronGeometry args={[0.5, 0]} /><meshStandardMaterial color={color} emissive={emissive} emissiveIntensity={isObjective ? 0.35 : clickable ? 0.18 : 0} flatShading /></mesh>}
      {obj.primitive === 'dodecahedron' && <mesh {...common}><dodecahedronGeometry args={[0.5, 0]} /><meshStandardMaterial color={color} emissive={emissive} emissiveIntensity={isObjective ? 0.35 : clickable ? 0.18 : 0} flatShading /></mesh>}
    </>
  )
}

function SceneObjectMesh({ obj, color, isObjective, onSelect }: {
  obj: SceneObject
  color: string
  isObjective: boolean
  onSelect: (o: SceneObject) => void
}) {
  const asset = getSceneAsset(obj.assetKey)
  const clickable = Boolean(obj.interactable)
  const position: [number, number, number] = [obj.position.x, obj.position.y, obj.position.z]

  return (
    <group position={position} rotation={[0, obj.rotationY, 0]} scale={obj.scale}>
      {asset ? (
        <AssetBoundary
          fallback={<PrimitiveShape obj={obj} color={color} isObjective={isObjective} onSelect={onSelect} />}
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
        <PrimitiveShape obj={obj} color={color} isObjective={isObjective} onSelect={onSelect} />
      )}
    </group>
  )
}

export function DioramaViewer({ scene, slug }: DioramaViewerProps) {
  const [selected, setSelected] = useState<SelectedObject>(null)
  const [thumbState, setThumbState] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle')
  const glRef = useRef<THREE.WebGLRenderer | null>(null)
  const lighting = moodLighting[scene.mood] ?? moodLighting.day
  const objectiveIds = useMemo(() => new Set(scene.game?.objectiveIds ?? []), [scene.game])

  const saveThumbnail = async () => {
    const gl = glRef.current
    if (!gl || thumbState === 'saving') return
    setThumbState('saving')
    try {
      const dataUrl = gl.domElement.toDataURL('image/jpeg', 0.85)
      const res = await fetch(`/api/games/${slug}/scene/thumbnail`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ image: dataUrl }),
      })
      setThumbState(res.ok ? 'saved' : 'error')
    } catch {
      setThumbState('error')
    }
  }

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
        onPointerMissed={() => setSelected(null)}
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
            isObjective={objectiveIds.has(obj.id)}
            onSelect={(o) => setSelected({ label: o.label, narrativeHook: o.interactable?.narrativeHook, action: o.interactable?.action })}
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
        />
      </Canvas>

      {/* Overlay UI */}
      <div className="pointer-events-none absolute inset-0 flex flex-col justify-between p-4">
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-xl font-bold text-white drop-shadow-lg">{scene.title}</h1>
            <p className="text-sm capitalize text-white/70 drop-shadow">{scene.mood} · {scene.ground}</p>
          </div>
          {scene.game && (
            <div className="pointer-events-auto rounded-lg bg-black/50 px-3 py-2 text-sm text-warning backdrop-blur">
              Goal: {scene.game.goal}
            </div>
          )}
        </div>
        <div className="flex items-end justify-between">
          <p className="text-xs text-white/60 drop-shadow">Drag to orbit · scroll to zoom · click glowing objects</p>
          <div className="pointer-events-auto flex items-center gap-2">
            {selected && (
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
