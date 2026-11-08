'use client'

import dynamic from 'next/dynamic'
import type { ScenePlan } from '@/domains/games/services/scene-planner.service'

// Three.js/R3F is a heavy client-only bundle — dynamic-import keeps it out of
// the initial chunk and out of SSR entirely.
const DioramaViewer = dynamic(
  () => import('@/components/scene/diorama-viewer').then((m) => m.DioramaViewer),
  { ssr: false, loading: () => <div className="flex h-full items-center justify-center text-white/60">Loading diorama…</div> }
)

export function DioramaLoader({ scene }: { scene: ScenePlan }) {
  return <DioramaViewer scene={scene} />
}
