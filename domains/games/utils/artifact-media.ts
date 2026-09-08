import type { SavedGamePanel } from '../types'

export type PanelMedia =
  | { kind: 'video'; src: string }
  | { kind: 'image'; src: string; reuseCover?: boolean }
  | { kind: 'poster' }

const COVER_FOCAL = [
  'object-[18%_28%]',
  'object-[82%_22%]',
  'object-[48%_72%]',
  'object-[12%_82%]',
  'object-[88%_58%]',
] as const

export function getPanelMedia(
  panel: Pick<SavedGamePanel, 'imageUrl' | 'videoUrl' | 'videoStillUrl' | 'videoDraftUrl'>,
  coverUrl?: string | null,
): PanelMedia {
  const video = panel.videoUrl || panel.videoDraftUrl
  if (video) return { kind: 'video', src: video }
  if (panel.videoStillUrl) return { kind: 'image', src: panel.videoStillUrl }
  if (panel.imageUrl) return { kind: 'image', src: panel.imageUrl }
  if (coverUrl) return { kind: 'image', src: coverUrl, reuseCover: true }
  return { kind: 'poster' }
}

export function coverFocalClass(panelIndex: number): string {
  return COVER_FOCAL[panelIndex % COVER_FOCAL.length]
}
