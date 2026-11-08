import { notFound } from 'next/navigation'
import Link from 'next/link'
import { prisma } from '@/lib/prisma'
import { config } from '@/lib/config'
import { ThemeWrapper } from '@/components/layout/ThemeWrapper'
import { Header } from '@/components/layout/header'
import { Footer } from '@/components/layout/footer'
import { DioramaLoader } from '@/components/scene/diorama-loader'
import { SceneGate } from '@/components/scene/scene-gate'
import type { ScenePlan } from '@/domains/games/services/scene-planner.service'

export const dynamic = 'force-dynamic'

interface ScenePageProps {
  params: Promise<{ slug: string }>
}

export default async function GameScenePage({ params }: ScenePageProps) {
  const { slug } = await params

  if (!config.features.sceneDiorama) notFound()

  const game = await prisma.game.findUnique({
    where: { slug },
    include: { scene: true },
  })
  if (!game) notFound()

  const scene = game.scene
  const ready = scene?.status === 'completed' && scene.sceneJson

  return (
    <ThemeWrapper theme="arcade">
      <Header />
      <main className="flex h-[calc(100vh-4rem)] flex-col">
        <div className="border-b border-white/10 px-4 py-2">
          <Link href={`/games/${slug}`} className="text-sm text-white/60 hover:text-white">
            ← Back to {game.title}
          </Link>
        </div>
        <div className="min-h-0 flex-1 bg-black">
          {ready ? (
            <DioramaLoader scene={scene.sceneJson as unknown as ScenePlan} slug={slug} />
          ) : (
            <SceneGate slug={slug} status={scene?.status ?? 'idle'} error={scene?.error} />
          )}
        </div>
      </main>
      <Footer />
    </ThemeWrapper>
  )
}
