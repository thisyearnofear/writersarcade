import { randomBytes } from 'crypto'
import { prisma } from '@/lib/prisma'
import { config } from '@/lib/config'
import {
  VideoGenerationService,
  type VideoStyle,
} from '@/domains/games/services/video-generation.service'
import { persistMediaUrl } from '@/domains/story/services/media-upload'
import { generateHeroStill } from '@/domains/games/services/video-hero-still.service'
import { assembleMontageFilm } from '@/domains/games/services/montage-film.service'
import type { Game, GameArtifactPanel } from '@prisma/client'

export interface PanelClipResult {
  id: string
  panelIndex: number
  status: string
  videoUrl: string | null
}

export interface MontageRunResult {
  attempted: number
  anyCompleted: boolean
  anyPending: boolean
  overallStatus: 'idle' | 'pending' | 'completed' | 'failed'
  panelResults: PanelClipResult[]
}

/**
 * Shared per-panel clip generation for the montage film. Sequential (no
 * fan-out), per-panel idempotent: panels with a final `videoUrl` are skipped,
 * a `videoStatus:'pending'` guard prevents a second job starting on one panel.
 * Each clip's `end_image_url` is the NEXT panel's still, so the sequence reads
 * as one continuous film.
 *
 * Used by the paid montage route (after its debit) and by the subsidized
 * auto-film path (after a completed run). Never debits credits itself.
 */
export async function runPanelClipGeneration(params: {
  game: Pick<Game, 'id' | 'genre' | 'primaryColor'>
  panels: GameArtifactPanel[]
  slug: string
  style: VideoStyle
}): Promise<MontageRunResult> {
  const { game, panels, slug, style } = params
  let attempted = 0
  let anyCompleted = false
  let anyPending = false
  const panelResults: PanelClipResult[] = []

  for (const panel of panels) {
    // Idempotent: already has a final clip.
    if (panel.videoUrl) {
      panelResults.push({ id: panel.id, panelIndex: panel.panelIndex, status: panel.videoStatus ?? 'completed', videoUrl: panel.videoUrl })
      anyCompleted = true
      continue
    }
    // In-flight on a previous attempt.
    if (panel.videoStatus === 'pending' && panel.videoJobId) {
      panelResults.push({ id: panel.id, panelIndex: panel.panelIndex, status: 'pending', videoUrl: null })
      anyPending = true
      continue
    }

    const jobKey = `montage-${randomBytes(6).toString('hex')}`
    const reserved = await prisma.gameArtifactPanel.updateMany({
      where: { id: panel.id, videoStatus: { in: ['idle', 'failed'] } },
      data: { videoStatus: 'pending', videoJobId: jobKey, videoProvider: null, videoModel: null, videoError: null, videoPolledAt: null },
    })
    if (reserved.count !== 1) {
      panelResults.push({ id: panel.id, panelIndex: panel.panelIndex, status: panel.videoStatus ?? 'pending', videoUrl: panel.videoUrl })
      if (panel.videoStatus === 'pending') anyPending = true
      continue
    }

    attempted += 1
    // Prefer a locked still (Stage 1); fall back to the frozen comic panel.
    let motionFrameUrl = panel.videoStillUrl ?? panel.imageUrl
    let panelStillUrl: string | null = panel.videoStillUrl
    if (!motionFrameUrl && process.env.VIDEO_PRE_PRODUCTION_STILL !== 'false') {
      try {
        const still = await generateHeroStill({ narrative: panel.narrativeText ?? '', genre: game.genre, primaryColor: game.primaryColor ?? undefined })
        if (still.imageUrl) {
          motionFrameUrl = still.imageUrl
          panelStillUrl = (await persistMediaUrl(still.imageUrl, `writersarcade-${slug}-panel${panel.panelIndex}.mp4-still.jpg`)) ?? still.imageUrl
        }
      } catch (error) {
        console.warn('[Montage] still pre-production failed for a panel; using comic frame', { error: error instanceof Error ? error.message : 'Unknown error' })
      }
    }
    if (!motionFrameUrl) {
      await prisma.gameArtifactPanel.update({ where: { id: panel.id }, data: { videoStatus: 'failed', videoJobId: null, videoError: 'No source frame to animate.' } })
      panelResults.push({ id: panel.id, panelIndex: panel.panelIndex, status: 'failed', videoUrl: null })
      continue
    }

    let result
    try {
      // Continuous-film chaining: this clip resolves into the next panel's
      // still (H3 end_image_url), so the sequence hands off seamlessly.
      const nextPanel = panels[panels.indexOf(panel) + 1]
      const endImageUrl = nextPanel
        ? (nextPanel.videoStillUrl ?? nextPanel.imageUrl ?? undefined)
        : undefined

      result = await VideoGenerationService.generate({
        imageUrl: motionFrameUrl,
        endImageUrl,
        narrative: panel.narrativeText ?? '',
        genre: game.genre,
        panelIndex: panel.panelIndex,
        primaryColor: game.primaryColor ?? undefined,
        style,
        aspectRatio: '9:16',
      })
    } catch (error) {
      await prisma.gameArtifactPanel.update({
        where: { id: panel.id },
        data: { videoStatus: 'failed', videoJobId: null, videoError: error instanceof Error ? error.message : 'Panel animation error' },
      })
      panelResults.push({ id: panel.id, panelIndex: panel.panelIndex, status: 'failed', videoUrl: null })
      continue
    }

    const persistenceFailed = result.status === 'completed' && !result.videoUrl
    const effectiveResult = persistenceFailed
      ? { ...result, status: 'failed' as const, videoUrl: null, error: 'Durable media storage is not configured.' }
      : result
    const persistentUrl = effectiveResult.status === 'completed' && effectiveResult.videoUrl
      ? await persistMediaUrl(effectiveResult.videoUrl, `writersarcade-${slug}-panel${panel.panelIndex}.mp4`)
      : null

    await prisma.gameArtifactPanel.update({
      where: { id: panel.id },
      data: {
        videoStatus: effectiveResult.status,
        videoProvider: effectiveResult.provider,
        videoModel: effectiveResult.model,
        videoJobId: effectiveResult.providerJobId,
        videoStyle: style,
        videoError: effectiveResult.error ?? null,
        videoUrl: persistentUrl ?? effectiveResult.videoUrl ?? null,
        videoStillUrl: panelStillUrl,
        videoPolledAt: null,
      },
    })

    if (effectiveResult.status === 'completed') anyCompleted = true
    else if (effectiveResult.status === 'pending') anyPending = true

    panelResults.push({ id: panel.id, panelIndex: panel.panelIndex, status: effectiveResult.status, videoUrl: persistentUrl ?? effectiveResult.videoUrl ?? null })
  }

  const overallStatus = anyCompleted ? 'completed' : anyPending ? 'pending' : attempted ? 'failed' : 'idle'
  return { attempted, anyCompleted, anyPending, overallStatus, panelResults }
}

/**
 * Subsidized auto-film: queue the montage pipeline for free after a completed
 * run. Gift-the-artifact, charge-for-ownership (mint) — the shareable film
 * becomes the default, monetization sits on claiming it.
 *
 * Guards:
 * - videoPipeline feature flag + AUTO_FILM_DAILY_CAP env (default 20, 0=off)
 * - story games only, ≥2 saved panels
 * - no prior video purchase activity (videoUpsoldAt) — never collide with a
 *   paid hero/montage flow
 * - filmAutoQueuedAt atomic reservation — one auto-film per game, ever
 * - durable daily cap across serverless instances
 */
export async function queueAutoFilmIfEligible(gameId: string): Promise<void> {
  if (!config.features.videoPipeline) return
  const dailyCap = Number(process.env.AUTO_FILM_DAILY_CAP ?? 20)
  if (dailyCap <= 0) return

  const game = await prisma.game.findUnique({
    where: { id: gameId },
    select: { id: true, slug: true, mode: true, montageVideoUrl: true, videoUpsoldAt: true },
  })
  if (!game || game.mode !== 'story' || game.montageVideoUrl || game.videoUpsoldAt) return

  const since = new Date(Date.now() - 24 * 60 * 60 * 1000)
  const queuedToday = await prisma.game.count({
    where: { filmAutoQueuedAt: { gte: since } },
  })
  if (queuedToday >= dailyCap) return

  // Atomic reservation — exactly one caller wins.
  const reserved = await prisma.game.updateMany({
    where: { id: game.id, filmAutoQueuedAt: null, montageVideoUrl: null, videoUpsoldAt: null },
    data: { filmAutoQueuedAt: new Date() },
  })
  if (reserved.count !== 1) return

  const full = await prisma.game.findUnique({
    where: { id: game.id },
    include: { artifactPanels: { orderBy: { panelIndex: 'asc' } } },
  })
  if (!full || full.artifactPanels.length < 2) return

  const result = await runPanelClipGeneration({
    game: full,
    panels: full.artifactPanels,
    slug: full.slug,
    style: 'cinematic',
  })

  // If every clip landed inline, assemble immediately; otherwise the
  // /video/status poll assembles when the last clip completes.
  const allClipsReady =
    full.artifactPanels.length >= 2 &&
    result.panelResults.every((p) => p.videoUrl)
  if (allClipsReady) {
    try {
      await assembleMontageFilm(full.id, full.slug)
    } catch (err) {
      console.error('[AutoFilm] montage assembly failed:', err)
    }
  }
}
