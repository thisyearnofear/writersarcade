import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { ArrowRight, Gamepad2, Sparkles, Home } from 'lucide-react'

interface ArcadeFunnelCTAsProps {
  /** Primary action — defaults to arcade browse */
  primaryHref?: string
  primaryLabel?: string
  /** Show create + home links below primary */
  showSecondary?: boolean
  className?: string
  layout?: 'row' | 'stack'
}

export function ArcadeFunnelCTAs({
  primaryHref = '/games',
  primaryLabel = 'Browse the arcade',
  showSecondary = true,
  className = '',
  layout = 'row',
}: ArcadeFunnelCTAsProps) {
  const stack = layout === 'stack'

  return (
    <div
      className={`flex ${stack ? 'flex-col' : 'flex-col sm:flex-row'} items-center justify-center gap-3 ${className}`}
    >
      <Button asChild variant="brand" className="h-auto w-full gap-2 rounded-lg px-6 py-3 font-semibold sm:w-auto">
        <Link href={primaryHref}>
          <Gamepad2 className="h-5 w-5" />
          {primaryLabel}
          <ArrowRight className="h-4 w-4" />
        </Link>
      </Button>

      {showSecondary && (
        <>
          <Link
            href="/generate"
            className="inline-flex items-center justify-center gap-2 rounded-lg border border-border bg-card px-6 py-3 font-semibold text-foreground transition-colors hover:bg-muted w-full sm:w-auto"
          >
            <Sparkles className="h-5 w-5" />
            Create a game
          </Link>
          <Link
            href="/"
            className="inline-flex items-center justify-center gap-1.5 text-sm text-muted-foreground transition-colors hover:text-brand"
          >
            <Home className="h-4 w-4" />
            Home
          </Link>
        </>
      )}
    </div>
  )
}
