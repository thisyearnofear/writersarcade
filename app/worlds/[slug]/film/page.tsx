import { notFound } from 'next/navigation'
import type { Metadata } from 'next'
import { prisma } from '@/lib/prisma'
import { asStorySource, beatsFromScene } from '@/lib/story-beats'
import { WorldStoryHeader, WorldStoryPending } from '@/components/worlds/world-story-header'
import { StoryFilm } from '@/components/worlds/story-film'

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
    title: `${world.title} — watch`,
    description: world.prompt.slice(0, 200),
  }
}

export default async function WorldFilmPage({ params }: WorldPageProps) {
  const { slug } = await params
  const world = await prisma.world.findUnique({ where: { slug } })
  if (!world) notFound()

  const source = world.status === 'completed' ? asStorySource(world.sceneJson) : null
  const ready = Boolean(source)

  return (
    <div className="flex h-screen flex-col bg-black">
      <WorldStoryHeader
        slug={world.slug}
        title={world.title}
        prompt={world.prompt}
        genre={world.genre}
        ready={ready}
        active="watch"
      />
      <main className="min-h-0 flex-1 overflow-y-auto">
        {source ? (
          <StoryFilm slug={world.slug} beats={beatsFromScene(source, { prompt: world.prompt })} />
        ) : (
          <WorldStoryPending status={world.status} error={world.error} />
        )}
      </main>
    </div>
  )
}
