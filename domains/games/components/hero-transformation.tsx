import Link from 'next/link'
import { ArrowRight } from 'lucide-react'

export interface HeroTransformationProps {
  slug: string
  title: string
  panels: string[] // panel image URLs, 3-5
  author?: string // Paragraph username
  publication?: string
}

/** Below this we render nothing — a two-panel "transformation" reads as a bug, not proof. */
const MIN_PANELS = 3
const MAX_PANELS = 5

/** Slight alternating tilt so the row reads as a comic strip rather than a logo bar. */
const TILT = [-3, 1.5, -1, 2.5, -2]

/**
 * Article → comic artifact for the hero: visual proof of the headline's
 * promise. Shows a Paragraph-style article teaser on one side and the real
 * generated panels on the other, joined by an arrow. Stacks vertically on
 * mobile. Silent when under-populated, per the homepage empty-state policy.
 *
 * Server component — statically rendered with the page's first paint.
 */
export function HeroTransformation({ slug, title, panels, author, publication }: HeroTransformationProps) {
  if (panels.length < MIN_PANELS) return null

  return (
    <div className="mt-8 flex flex-col items-center gap-3 animate-slide-up [animation-delay:150ms] [animation-fill-mode:both] motion-reduce:animate-none">
      <div className="flex flex-col items-center gap-3 sm:flex-row sm:gap-5">
        {/* Article teaser — styled like a Paragraph doc so it reads as "an
            article" without real prose. */}
        <div className="w-40 shrink-0 rounded-lg border border-border bg-card p-3 text-left shadow-sm">
          <p className="truncate text-[9px] font-semibold uppercase tracking-widest text-muted-foreground">
            {publication ?? 'paragraph.xyz'}
          </p>
          <p className="mt-1.5 line-clamp-2 font-serif text-[11px] font-semibold leading-snug text-foreground">
            {title}
          </p>
          {author && (
            <p className="mt-1 truncate text-[10px] text-muted-foreground/60">@{author}</p>
          )}
          <div className="mt-2 space-y-1.5" aria-hidden="true">
            <div className="h-1.5 w-full rounded-full bg-muted" />
            <div className="h-1.5 w-3/4 rounded-full bg-muted" />
          </div>
        </div>

        {/* Points right on desktop, down on mobile. */}
        <ArrowRight
          className="h-5 w-5 shrink-0 rotate-90 text-muted-foreground/60 sm:rotate-0"
          aria-hidden="true"
        />

        {/* The real generated panels, framed like printed comic cells. */}
        <ul className="flex flex-wrap items-center justify-center gap-2 sm:gap-2.5">
          {panels.slice(0, MAX_PANELS).map((src, index) => (
            <li key={src}>
              <Link
                href={`/games/${slug}`}
                title={title}
                className="group block overflow-hidden rounded-md border-2 border-white/90 shadow-md transition-all hover:z-10 hover:-translate-y-1 hover:shadow-lg focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
                style={{ rotate: `${TILT[index % TILT.length]}deg` }}
              >
                {/* Plain img: remote panel URLs aren't in next/image domains. */}
                <img
                  src={src}
                  alt=""
                  width={64}
                  height={64}
                  loading="eager"
                  decoding="async"
                  fetchPriority={index < 3 ? 'high' : undefined}
                  className="h-14 w-14 object-cover transition-transform duration-500 group-hover:scale-105 sm:h-16 sm:w-16"
                />
                <span className="sr-only">{title}</span>
              </Link>
            </li>
          ))}
        </ul>
      </div>
      <p className="text-[11px] text-muted-foreground">
        From a real Paragraph article{author ? ` — @${author}` : ''}
      </p>
    </div>
  )
}
