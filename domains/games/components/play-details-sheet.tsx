'use client'

import { ShieldCheck } from 'lucide-react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog'
import { MoodIndicator } from '@/components/game/MoodIndicator'
import { HiddenHandTeaser } from './hidden-hand-teaser'
import {
  getModifierCategoryForPanel,
  MODIFIER_CATEGORY_LABEL,
  MODIFIER_CATEGORY_HINT,
  MODIFIER_CATEGORY_COLOR,
} from '@/lib/daily-challenge/daily-challenge-ui'
import type { ChatEntry } from '../hooks/use-game-session'

const MAX_COMIC_PANELS = 5

interface PlayDetailsSheetProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  messages: ChatEntry[]
  worldMood: { tension: number; chaos: number; hope: number }
  isDailyActive: boolean
  /** Panels completed so far (for the hidden-hand card). */
  panelsDone: number
  dailyModifierHandles?: string[]
  dailyScoreHandle?: string | null
  dailyPlayerCount?: number
  dailyAverageScore?: number | null
  dailyTopScore?: number | null
}

function truncateHandle(handle: string): string {
  return handle.length > 18 ? `${handle.slice(0, 10)}…${handle.slice(-6)}` : handle
}

/**
 * Everything that isn't the current decision, one tap away: world mood,
 * story map, keyboard hints, and — for daily runs — the on-chain hidden hand.
 * Handles are shown after their meaning, never as the headline.
 */
export function PlayDetailsSheet({
  open,
  onOpenChange,
  messages,
  worldMood,
  isDailyActive,
  panelsDone,
  dailyModifierHandles,
  dailyScoreHandle,
  dailyPlayerCount = 0,
  dailyAverageScore = null,
  dailyTopScore = null,
}: PlayDetailsSheetProps) {
  const panelMessages = messages.filter((m) => m.role === 'assistant' && !m.id.startsWith('epilogue-'))

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[85vh] overflow-y-auto bg-zinc-950 border-white/10">
        <DialogHeader>
          <DialogTitle className="text-white">Story details</DialogTitle>
          <DialogDescription className="text-muted-foreground">
            Ambient context — nothing here needs action.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 pt-2">
          <section>
            <h3 className="mb-2 text-xs font-bold uppercase tracking-widest text-white/70">World Mood</h3>
            <MoodIndicator mood={worldMood} />
            <p className="mt-2 text-xs text-muted-foreground">
              Your choices signal the story&apos;s emotional direction.
            </p>
          </section>

          <section>
            <h3 className="mb-2 text-xs font-bold uppercase tracking-widest text-white/70">Story Map</h3>
            <div className="flex flex-wrap gap-2">
              {panelMessages.map((m, idx) => (
                <div
                  key={m.id}
                  className={`flex h-8 w-8 items-center justify-center rounded-full border text-xs font-bold ${
                    idx === panelMessages.length - 1
                      ? 'border-white/40 bg-white/20 text-white'
                      : 'border-white/10 bg-white/5 text-muted-foreground'
                  }`}
                >
                  {idx + 1}
                </div>
              ))}
              {Array.from({ length: Math.max(0, MAX_COMIC_PANELS - panelMessages.length) }).map((_, i) => (
                <div
                  key={`empty-${i}`}
                  className="flex h-8 w-8 items-center justify-center rounded-full border border-dashed border-white/10 text-xs text-white/20"
                >
                  {panelMessages.length + i + 1}
                </div>
              ))}
            </div>
          </section>

          <section>
            <h3 className="mb-2 text-xs font-bold uppercase tracking-widest text-white/70">Keyboard</h3>
            <ul className="space-y-2 text-xs text-muted-foreground">
              <li>
                <kbd className="mr-1 rounded bg-white/10 px-1.5 py-0.5 font-mono text-white/70">1-4</kbd>
                Choose option
              </li>
              <li>
                <kbd className="mr-1 rounded bg-white/10 px-1.5 py-0.5 font-mono text-white/70">V</kbd>
                View comic when the story completes
              </li>
            </ul>
          </section>

          {isDailyActive && (
            <section className="space-y-4 rounded-xl border border-purple-500/20 bg-purple-950/15 p-4">
              <HiddenHandTeaser panelsDone={panelsDone} />

              <div>
                <h3 className="mb-2 flex items-center gap-1.5 text-xs font-bold uppercase tracking-widest text-purple-300/90">
                  <ShieldCheck className="h-3.5 w-3.5" aria-hidden />
                  On-chain encrypted
                </h3>
                <p className="mb-3 text-xs leading-relaxed text-muted-foreground">
                  Each panel is shaped by a hidden card that stays encrypted on Base (Inco
                  confidential compute) until the finale. The hex below is the ciphertext
                  handle — proof it exists, not the card itself.
                </p>
                <ul className="space-y-1.5 text-[11px]">
                  {dailyModifierHandles?.map((handle, i) => {
                    const cat = getModifierCategoryForPanel(i)
                    return (
                      <li key={i} className="flex items-center justify-between gap-3">
                        <span className="flex items-center gap-1.5" style={{ color: MODIFIER_CATEGORY_COLOR[cat] }}>
                          {MODIFIER_CATEGORY_LABEL[cat]}
                          <span className="text-muted-foreground/70 normal-case">— {MODIFIER_CATEGORY_HINT[cat]}</span>
                        </span>
                        <code className="font-mono text-muted-foreground/80">{truncateHandle(handle)}</code>
                      </li>
                    )
                  })}
                  {dailyScoreHandle && (
                    <li className="flex items-center justify-between gap-3 border-t border-white/10 pt-1.5">
                      <span className="text-muted-foreground">Encrypted score</span>
                      <code className="font-mono text-muted-foreground/80">{truncateHandle(dailyScoreHandle)}</code>
                    </li>
                  )}
                </ul>
              </div>

              {dailyPlayerCount > 0 && (
                <p className="text-xs text-muted-foreground">
                  {dailyPlayerCount} {dailyPlayerCount === 1 ? 'player' : 'players'} today
                  {dailyAverageScore !== null && ` · avg ${dailyAverageScore}`}
                  {dailyTopScore !== null && ` · top ${dailyTopScore}`}
                </p>
              )}

              <p className="text-[11px] text-muted-foreground/80">
                No countdown — read carefully. Your choices shape the story and your
                encrypted score, not your speed.
              </p>
            </section>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}
