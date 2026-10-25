'use client'

import { useState } from 'react'
import { ArrowRight, Loader2 } from 'lucide-react'

interface SimpleGameFormProps {
  onGenerate: (url: string) => void
  isGenerating: boolean
}

/**
 * Command-bar entry form for the landing page hero.
 *
 * One centered pill: a borderless URL input with an icon-circle submit at its
 * right edge. The circle stays ghost-muted while the input is empty and fills
 * once there's a URL — it reads as "armed", never as a disabled button.
 * All complexity (wallet, payment path, chain) lives on /generate.
 */
export function SimpleGameForm({ onGenerate, isGenerating }: SimpleGameFormProps) {
  const [url, setUrl] = useState('')
  const hasUrl = url.trim().length > 0

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (hasUrl) {
      onGenerate(url.trim())
    }
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="mx-auto flex w-full max-w-lg items-center rounded-full border border-border bg-card pr-1.5 shadow-sm transition-colors focus-within:border-foreground/30"
    >
      <input
        type="url"
        required
        value={url}
        onChange={(e) => setUrl(e.target.value)}
        placeholder="https://paragraph.xyz/... (paste any article)"
        aria-label="Paragraph article URL"
        className="h-12 min-w-0 flex-1 bg-transparent pl-5 pr-2 text-sm text-foreground outline-none placeholder:text-muted-foreground"
      />
      <button
        type="submit"
        disabled={isGenerating}
        title="Generate a game from this article"
        aria-label="Generate a game from this article"
        className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full transition-colors ${
          hasUrl
            ? 'bg-foreground text-background hover:opacity-90'
            : 'bg-muted/50 text-muted-foreground'
        }`}
      >
        {isGenerating ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : (
          <ArrowRight className="h-4 w-4" />
        )}
      </button>
    </form>
  )
}
