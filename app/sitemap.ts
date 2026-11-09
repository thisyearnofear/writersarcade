import { MetadataRoute } from 'next'
import { prisma } from '@/lib/prisma'

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://writersarcade.vercel.app'

  const staticPages: MetadataRoute.Sitemap = [
    {
      url: baseUrl,
      lastModified: new Date(),
      changeFrequency: 'daily',
      priority: 1,
    },
    {
      url: `${baseUrl}/games`,
      lastModified: new Date(),
      changeFrequency: 'daily',
      priority: 0.9,
    },
    {
      url: `${baseUrl}/writers`,
      lastModified: new Date(),
      changeFrequency: 'weekly',
      priority: 0.7,
    },
  ]

  let publicGames: { slug: string; updatedAt: Date }[] = []
  try {
    publicGames = await prisma.game.findMany({
      where: { private: false },
      select: { slug: true, updatedAt: true },
    })
  } catch (error) {
    // No reachable DB (e.g. CI builds) — serve static pages only.
    console.error('sitemap: failed to load games, serving static pages only', error)
  }

  const gamePages: MetadataRoute.Sitemap = publicGames.map((game) => ({
    url: `${baseUrl}/games/${game.slug}`,
    lastModified: game.updatedAt,
    changeFrequency: 'weekly',
    priority: 0.8,
  }))

  return [...staticPages, ...gamePages]
}
