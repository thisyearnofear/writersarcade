import { notFound } from 'next/navigation'
import type { Metadata } from 'next'
import { prisma } from '@/lib/prisma'
import { DioramaLoader } from '@/components/scene/diorama-loader'
import { ReshapeBar } from '@/components/worlds/reshape-bar'
import { WorldStoryHeader, WorldStoryPending } from '@/components/worlds/world-story-header'
import type { ScenePlan } from '@/domains/games/services/scene-planner.service'

export const dynamic = 'force-dynamic'

interface WorldPageProps {
  params: Promise<{ slug: string }>
}

export async function generateMetadata({ params }: WorldPageProps): Promise<Metadata> {
  const { slug } = await params
  const world = await prisma.world.findUnique({
    where: { slug },
    select: { title: true, prompt: true },
  })
  if (!world) return {}
  return {
    title: `${world.title} — a writersarcade world`,
    description: world.prompt.slice(0, 200),
  }
}

export default async function WorldPage({ params }: WorldPageProps) {
  const { slug } = await params
  const world = await prisma.world.findUnique({ where: { slug } })
  if (!world) notFound()

  const ready = world.status === 'completed' && world.sceneJson

  return (
    <div className="flex h-screen flex-col bg-black">
      <WorldStoryHeader
        slug={world.slug}
        title={world.title}
        prompt={world.prompt}
        genre={world.genre}
        ready={Boolean(ready)}
        active="walk"
      />

      {ready && <ReshapeBar slug={world.slug} />}

      <main className="min-h-0 flex-1">
        {ready ? (
          <DioramaLoader
            key={world.updatedAt.toISOString()}
            scene={world.sceneJson as unknown as ScenePlan}
            slug={`world-${world.slug}`}
            standalone
            prompt={world.prompt}
          />
        ) : (
          <WorldStoryPending status={world.status} error={world.error} />
        )}
      </main>
    </div>
  )
}
