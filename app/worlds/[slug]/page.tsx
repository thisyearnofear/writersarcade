import { notFound } from 'next/navigation'
import Link from 'next/link'
import type { Metadata } from 'next'
import { prisma } from '@/lib/prisma'
import { DioramaLoader } from '@/components/scene/diorama-loader'
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
      <header className="flex items-center justify-between border-b border-white/10 px-4 py-2">
        <Link href="/worlds" className="text-sm text-white/60 hover:text-white">
          ← All worlds
        </Link>
        <div className="min-w-0 text-center">
          <p className="truncate text-sm font-semibold text-white">{world.title}</p>
          {world.prompt && (
            <p className="truncate text-xs italic text-white/50">{world.prompt}</p>
          )}
        </div>
        <span className="shrink-0 text-xs capitalize text-white/50">{world.genre}</span>
      </header>

      <main className="min-h-0 flex-1">
        {ready ? (
          <DioramaLoader
            scene={world.sceneJson as unknown as ScenePlan}
            slug={`world-${world.slug}`}
            standalone
            prompt={world.prompt}
          />
        ) : (
          <div className="flex h-full flex-col items-center justify-center gap-3 p-8 text-center">
            {world.status === 'failed' ? (
              <>
                <h2 className="text-2xl font-bold text-white">That world failed to build</h2>
                <p className="max-w-md text-sm text-white/60">{world.error ?? 'Unknown error.'}</p>
                <Link
                  href="/worlds"
                  className="mt-2 rounded-lg bg-brand px-5 py-2.5 text-sm font-semibold text-brand-foreground"
                >
                  Try another description
                </Link>
              </>
            ) : (
              <>
                <div className="h-10 w-10 animate-spin rounded-full border-2 border-warning border-t-transparent" />
                <p className="text-white/80">Building your world…</p>
                <p className="text-xs text-white/50">This takes about a minute. Refresh in a moment.</p>
              </>
            )}
          </div>
        )}
      </main>
    </div>
  )
}
