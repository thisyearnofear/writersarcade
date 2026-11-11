import Link from 'next/link'

const VIEWS = [
  { id: 'walk', label: 'Walk', href: (slug: string) => `/worlds/${slug}` },
  { id: 'read', label: 'Read', href: (slug: string) => `/worlds/${slug}/comic` },
  { id: 'watch', label: 'Watch', href: (slug: string) => `/worlds/${slug}/film` },
] as const

export type StoryView = (typeof VIEWS)[number]['id']

/**
 * Walk, Read, and Watch are three views of one saved world.
 * Pending and failed worlds stay on the back link until a scene exists.
 */
export function WorldStoryHeader({
  slug,
  title,
  prompt,
  genre,
  ready,
  active,
}: {
  slug: string
  title: string
  prompt: string
  genre: string
  ready: boolean
  active: StoryView
}) {
  return (
    <header className="flex items-center justify-between gap-3 border-b border-white/10 px-4 py-2">
      <Link href="/worlds" className="shrink-0 text-sm text-white/60 hover:text-white">
        ← All worlds
      </Link>
      <div className="min-w-0 text-center">
        <p className="truncate text-sm font-semibold text-white">{title}</p>
        {prompt && <p className="truncate text-xs italic text-white/50">{prompt}</p>}
      </div>
      <div className="flex shrink-0 items-center gap-3">
        {ready && (
          <nav className="flex items-center gap-1" aria-label="Story views">
            {VIEWS.map((view) => {
              const current = view.id === active
              return (
                <Link
                  key={view.id}
                  href={view.href(slug)}
                  aria-current={current ? 'page' : undefined}
                  className={
                    current
                      ? 'rounded-lg bg-brand/20 px-3 py-1.5 text-xs font-semibold text-brand'
                      : 'rounded-lg px-3 py-1.5 text-xs font-semibold text-white/60 hover:text-white'
                  }
                >
                  {view.label}
                </Link>
              )
            })}
          </nav>
        )}
        <span className="text-xs capitalize text-white/50">{genre}</span>
      </div>
    </header>
  )
}

export function WorldStoryPending({ status, error }: { status: string; error: string | null }) {
  if (status === 'failed') {
    return (
      <div className="flex h-full flex-col items-center justify-center gap-3 p-8 text-center">
        <h2 className="text-2xl font-bold text-white">That world failed to build</h2>
        <p className="max-w-md text-sm text-white/60">{error ?? 'Unknown error.'}</p>
        <Link
          href="/worlds"
          className="mt-2 rounded-lg bg-brand px-5 py-2.5 text-sm font-semibold text-brand-foreground"
        >
          Try another description
        </Link>
      </div>
    )
  }

  return (
    <div className="flex h-full flex-col items-center justify-center gap-3 p-8 text-center">
      <div className="h-10 w-10 animate-spin rounded-full border-2 border-warning border-t-transparent" />
      <p className="text-white/80">Building your world…</p>
      <p className="text-xs text-white/50">This takes about a minute. Refresh in a moment.</p>
    </div>
  )
}
