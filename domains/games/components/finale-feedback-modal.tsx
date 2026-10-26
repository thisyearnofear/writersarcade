'use client'

import { PostGameFeedback } from '@/domains/games/components/post-game-feedback'
import { disableFeedbackPrompts } from './feedback-prompt'
import { useOverlay, OverlayPortal } from '@/components/ui/overlay'

interface FinaleFeedbackModalProps {
  show: boolean
  onClose: () => void
}

/**
 * Post-game NPS feedback modal.
 * Extracted from ComicBookFinale to isolate the feedback submission logic.
 */
export function FinaleFeedbackModal({ show, onClose }: FinaleFeedbackModalProps) {
  useOverlay(show, onClose)

  if (!show) return null

  return (
    <OverlayPortal>
      <div
        className="fixed inset-0 z-[80] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm"
        role="dialog"
        aria-modal="true"
      >
        <div className="w-full max-w-lg max-h-[calc(100dvh-2rem)] overflow-y-auto overscroll-contain">
          <PostGameFeedback
            onSubmit={async (feedback) => {
              try {
                const slug = window.location.pathname.split('/').pop() || ''
                const response = await fetch(`/api/games/${slug}/feedback`, {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({
                    npsScore: feedback.npsScore,
                    npsComment: feedback.comment,
                  }),
                })
                if (!response.ok) {
                  throw new Error('Failed to submit feedback')
                }
              } catch (error) {
                console.error('Error submitting feedback:', error)
                // Don't throw, let user close anyway
              }
            }}
            onSkip={onClose}
            onDisable={() => {
              disableFeedbackPrompts()
              onClose()
            }}
          />
        </div>
      </div>
    </OverlayPortal>
  )
}
