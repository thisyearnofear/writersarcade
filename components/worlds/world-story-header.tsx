import Link from 'next/link'

const VIEWS = [
  { id: 'walk', label: 'Walk', hint: 'Step into the place', href: (slug: string) => `/worlds/${slug}` },
  { id: 'read', label: 'Read', hint: 'The story as panels', href: (slug: string) => `/worlds/${slug}/comic` },
  { id: 'watch', label: 'Watch', hint: 'The same beats as cards', href: (slug: string) => `/worlds/${slug}/film` },
] as const

export type StoryView = (typeof VIEWS)[number]['id']

/**
 * One story, three ways in. The switcher stays in the same place on every view
 * so Walk, Read, and Watch feel like one place rather than three products.
 */
export function WorldStoryHeader({
  slug,
  title,
  prompt,
  ready,
  active,
}: {
  slug: string
  title: string
  prompt: string
  ready: boolean
  active: StoryView
}) {
  return (
    <header className="border-b border-white/10">
      <div className="flex items-center gap-3 px-3 py-2 sm:px-4">
        <Link href="/worlds" className="shrink-0 text-sm text-white/60 hover:text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand">
          ← Worlds
        </Link>
        <div className="min-w-0 flex-1 text-center">
          <p className="truncate text-sm font-semibold text-white">{title}</p>
          {prompt && <p className="truncate text-xs text-white/45">{prompt}</p>}
        </div>
        <span className="hidden w-16 shrink-0 sm:block" aria-hidden="true" />
      </div>
      {ready && (
        <nav className="flex justify-center px-3 pb-2" aria-label="This story">
          <div className="flex rounded-full bg-white/10 p-0.5 ring-1 ring-white/10">
            {VIEWS.map((view) => {
              const current = view.id === active
              return (
                <Link
                  key={view.id}
                  href={view.href(slug)}
                  aria-current={current ? 'page' : undefined}
                  aria-label={`${view.label}. ${view.hint}`}
                  className={
                    current
                      ? 'rounded-full bg-white px-4 py-1.5 text-xs font-semibold text-black'
                      : 'rounded-full px-4 py-1.5 text-xs font-semibold text-white/70 hover:text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand'
                  }
                >
                  {view.label}
                </Link>
              )
            })}
          </div>
        </nav>
      )}
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
