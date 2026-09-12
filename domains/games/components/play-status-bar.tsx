'use client'

import { MoreHorizontal, Spade } from 'lucide-react'
import { PlayPaceTimer } from '@/components/daily-challenge/daily-gameplay-hud'
import {
  getModifierCategoryForPanel,
  MODIFIER_CATEGORY_LABEL,
  MODIFIER_CATEGORY_COLOR,
} from '@/lib/daily-challenge/daily-challenge-ui'

const MAX_COMIC_PANELS = 5

function PanelBeatMeter({
  current,
  total = MAX_COMIC_PANELS,
  accent,
}: {
  current: number
  total?: number
  accent: string
}) {
  const clamped = Math.min(current, total)
  return (
    <div
      className="flex items-center gap-2"
      aria-label={`Panel ${clamped} of ${total}`}
    >
      <div className="flex gap-1" aria-hidden="true">
        {Array.from({ length: total }, (_, index) => (
          <span
            key={index}
            className="h-2.5 w-6 rounded-[1px] border"
            style={{
              backgroundColor: index < clamped ? accent : 'transparent',
              borderColor: index < clamped ? accent : 'rgba(255,255,255,0.22)',
              transform: `rotate(${index % 2 === 0 ? -2 : 2}deg)`,
            }}
          />
        ))}
      </div>
      <span className="text-xs tabular-nums text-white/60">
        {clamped} / {total}
      </span>
    </div>
  )
}

interface PlayStatusBarProps {
  current: number
  accent: string
  isDailyActive: boolean
  /** 0-based index of the panel currently in play (for the category chip). */
  dailyPanelIndex: number
  panelStartTime: number | null
  sessionStartTime: number | null
  /** Panels shaped so far, for the hidden-hand chip (daily only). */
  hiddenHandPanelsDone?: number
  onOpenDetails: () => void
}

/**
 * The single ambient line during play: progress beats + (daily) the modifier
 * category, pace timer, and hidden-hand count — everything else lives behind
 * the details button. Replaces the old sidebar stack and stacked info strips.
 */
export function PlayStatusBar({
  current,
  accent,
  isDailyActive,
  dailyPanelIndex,
  panelStartTime,
  sessionStartTime,
  hiddenHandPanelsDone,
  onOpenDetails,
}: PlayStatusBarProps) {
  const category = getModifierCategoryForPanel(Math.max(0, dailyPanelIndex))
  const categoryColor = MODIFIER_CATEGORY_COLOR[category]
  const categoryLabel = MODIFIER_CATEGORY_LABEL[category]

  return (
    <div className="mb-4 flex w-full max-w-5xl items-center justify-between gap-3">
      <div className="flex items-center gap-3">
        <PanelBeatMeter current={current} accent={accent} />
        {isDailyActive && (
          <>
            <span
              className="hidden sm:inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wider"
              style={{ borderColor: `${categoryColor}40`, color: categoryColor, backgroundColor: `${categoryColor}10` }}
            >
              {categoryLabel} · {Math.min(dailyPanelIndex + 1, MAX_COMIC_PANELS)}/{MAX_COMIC_PANELS}
            </span>
            <PlayPaceTimer
              panelStartTime={panelStartTime}
              sessionStartTime={sessionStartTime}
              panelNumber={Math.min(Math.max(current, 1), MAX_COMIC_PANELS)}
              primaryColor={accent}
            />
            {typeof hiddenHandPanelsDone === 'number' && (
              <span className="hidden md:inline-flex items-center gap-1 text-[10px] text-purple-300/80">
                <Spade className="h-3 w-3" aria-hidden />
                {Math.min(hiddenHandPanelsDone, MAX_COMIC_PANELS)}/{MAX_COMIC_PANELS}
              </span>
            )}
          </>
        )}
      </div>
      <button
        type="button"
        onClick={onOpenDetails}
        className="inline-flex items-center gap-1.5 rounded-full border border-white/10 bg-white/5 px-3 py-1.5 text-[11px] text-muted-foreground transition-colors hover:bg-white/10 hover:text-foreground"
        aria-label="Story details"
      >
        <MoreHorizontal className="h-3.5 w-3.5" aria-hidden />
        Details
      </button>
    </div>
  )
}
