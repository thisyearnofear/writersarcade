import { richlink, text, attachment } from 'spectrum-ts'
import { imessage, effect } from 'spectrum-ts/providers/imessage'

const API_URL = process.env.WRITERSARCADE_API_URL || 'http://localhost:3000'
const API_SECRET = process.env.IMESSAGE_API_SECRET

export const BOT_NAME = 'Flynn'

// Last generated game per conversation — powers the "film" command.
const lastGameBySpace = new Map<string, { slug: string; title: string }>()

// Per-sender generation budget — in-memory (resets on restart; the
// route-level daily cap is the durable backstop). Prevents one texter
// from burning the subsidized-generation budget.
const SENDER_DAILY_LIMIT = 5
const senderBudget = new Map<string, { count: number; resetAt: number }>()

function senderKey(message: any, space: any): string {
  const s = message?.sender
  return String(s?.id ?? s?.handle ?? s?.phone ?? space?.id ?? 'unknown')
}

function consumeSenderBudget(key: string): boolean {
  const now = Date.now()
  const entry = senderBudget.get(key)
  if (!entry || now > entry.resetAt) {
    senderBudget.set(key, { count: 1, resetAt: now + 24 * 60 * 60 * 1000 })
    return true
  }
  if (entry.count >= SENDER_DAILY_LIMIT) return false
  entry.count++
  return true
}

function inboundText(content: unknown): string | undefined {
  if (typeof content === 'string') return content
  if (content && typeof content === 'object') {
    const c = content as Record<string, unknown>
    if (typeof c.text === 'string') return c.text
    if (typeof c.markdown === 'string') return c.markdown
  }
  return undefined
}

function extractUrl(text: string): { url: string; remainder: string } | null {
  const match = text.match(/https?:\/\/[^\s]+/i)
  if (!match) return null
  const url = match[0]
  const remainder = text.replace(url, '').trim().slice(0, 200)
  return { url, remainder }
}

function extractTone(remainder: string): string | undefined {
  const cleaned = remainder
    .replace(/^[\s,:-]+/, '')
    .replace(/[\s,:-]+$/, '')
    .trim()
  return cleaned || undefined
}

const FILM_INTENT = /^\s*(film|movie|video|watch|show me the film|film it|make it a film)\b/i

interface GameResult {
  title: string
  slug?: string
  playUrl: string
}

interface GameStatus {
  generationStatus?: string
  imageUrl?: string | null
  montageVideoUrl?: string | null
  clipCount?: number
}

async function generateGame(url: string, tone?: string): Promise<GameResult> {
  if (!API_SECRET) {
    throw new Error('IMESSAGE_API_SECRET is not set')
  }

  const res = await fetch(`${API_URL}/api/imessage/generate`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${API_SECRET}`,
    },
    body: JSON.stringify({ url, tone }),
  })

  const payload = (await res.json().catch(() => ({ error: res.statusText }))) as {
    success?: boolean
    data?: GameResult
    error?: string
  }

  if (!res.ok || !payload.success || !payload.data) {
    throw new Error(payload.error || `API returned ${res.status}`)
  }

  return payload.data
}

async function getGameStatus(slug: string): Promise<GameStatus | null> {
  try {
    const res = await fetch(`${API_URL}/api/games/${slug}/status`, {
      signal: AbortSignal.timeout(15_000),
    })
    if (!res.ok) return null
    const payload = (await res.json()) as { data?: GameStatus }
    return payload.data ?? null
  } catch {
    return null
  }
}

function slugFromPlayUrl(playUrl: string, slug?: string): string | undefined {
  if (slug) return slug
  const m = playUrl.match(/\/games\/([^/?#]+)/)
  return m?.[1]
}

/** Poll until the cover image resolves (it's generated async), cap ~90s. */
async function waitForCover(slug: string): Promise<string | null> {
  const deadline = Date.now() + 90_000
  while (Date.now() < deadline) {
    const status = await getGameStatus(slug)
    if (status?.imageUrl) return status.imageUrl
    await new Promise((r) => setTimeout(r, 5_000))
  }
  return null
}

async function sendReadingNote(space: any) {
  const content = text(`${BOT_NAME} is reading this now.`)
  try {
    await space.send(effect(content, imessage.effect.message.gentle))
  } catch {
    await space.send(content)
  }
}

async function sendReveal(space: any, game: GameResult) {
  const title = text(`It became: ${game.title}`)
  try {
    await space.send(effect(title, imessage.effect.message.spotlight))
  } catch {
    await space.send(title)
  }

  // ref=flynn attributes inbound plays/creates to the agent channel.
  const playUrl = `${game.playUrl}${game.playUrl.includes('?') ? '&' : '?'}play=1&ref=flynn`
  await space.send(richlink(playUrl))

  await space.send(
    text('Read the prose. Play the story. When you finish a run, text "film it" and I\'ll cut the movie.')
  )

  // Follow up with the cover once the async image lands — the reveal is
  // visual, not just a link.
  const slug = slugFromPlayUrl(game.playUrl, game.slug)
  if (slug) {
    waitForCover(slug)
      .then(async (imageUrl) => {
        if (!imageUrl) return
        try {
          await space.send(attachment(new URL(imageUrl)))
        } catch (err) {
          console.error(`[${BOT_NAME}] cover attachment failed:`, err)
        }
      })
      .catch(() => {})
  }
}

async function sendFilm(space: any) {
  const last = space?.id ? lastGameBySpace.get(space.id) : undefined
  if (!last) {
    await space.send(
      text(`Send ${BOT_NAME} a link to an article first — play the story it becomes, then ask for the film.`)
    )
    return
  }

  const status = await getGameStatus(last.slug)
  if (status?.montageVideoUrl) {
    try {
      await space.send(attachment(new URL(status.montageVideoUrl)))
      await space.send(text(`The film of "${last.title}."`))
      return
    } catch (err) {
      console.error(`[${BOT_NAME}] film attachment failed:`, err)
    }
  }

  if (status?.clipCount && status.clipCount > 0) {
    await space.send(
      richlink(`${API_URL}/games/${last.slug}?watch=1&ref=flynn`)
    )
    await space.send(text('The film is still being cut — watch the run here.'))
    return
  }

  await space.send(
    text(`"${last.title}" has no film yet — finish a run (and animate it) first, then ask again.`)
  )
}

export async function handleMessage(space: any, message: any) {
  try {
    const textContent = inboundText(message.content)
    if (!textContent) return

    if (FILM_INTENT.test(textContent)) {
      await sendFilm(space)
      return
    }

    const extracted = extractUrl(textContent)

    if (!extracted) {
      await space.send(
        text(`${BOT_NAME} turns links into playable stories.\n\nSend a link to an article, essay, or post. You can add a few words — "make it a fable," "keep it close to the text," or "let it be strange."`)
      )
      return
    }

    const { url, remainder } = extracted
    const tone = extractTone(remainder)

    const key = senderKey(message, space)
    if (!consumeSenderBudget(key)) {
      await space.send(
        text(`That's ${SENDER_DAILY_LIMIT} stories today — Flynn needs a break. Try again tomorrow.`)
      )
      return
    }

    console.log(`${BOT_NAME} received URL:`, url, tone ? `| tone: ${tone}` : '', `| sender: ${key}`)

    await message.react?.('emphasis').catch(() => {})
    await sendReadingNote(space)
    await space.startTyping?.().catch(() => {})

    const game = await generateGame(url, tone)

    const slug = slugFromPlayUrl(game.playUrl, game.slug)
    if (space?.id && slug) lastGameBySpace.set(space.id, { slug, title: game.title })

    await sendReveal(space, game)
  } catch (err) {
    console.error(`${BOT_NAME} message handling error:`, err)
    try {
      const detail = err instanceof Error ? err.message : ''
      // Surface deliberate refusals (budget caps); stay vague on real errors.
      const reply = detail.includes('resting')
        ? detail
        : `${BOT_NAME} could not shape that link into a story. Try a different Paragraph.xyz article, or send the link again.`
      await space.send(text(reply))
    } catch (replyErr) {
      console.error('Failed to send error reply:', replyErr)
    }
  }
}
