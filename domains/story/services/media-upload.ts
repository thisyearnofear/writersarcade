import { config, logger } from '@/lib/config'

const GROVE_API_URL = 'https://api.grove.storage'
const MAX_MEDIA_BYTES = 100 * 1024 * 1024
const GROVE_PROPAGATION_ATTEMPTS = 4
const GROVE_PROPAGATION_DELAY_MS = 2_000

/**
 * Copy a generated media URL to durable storage so temporary provider URLs are
 * not used as permanent public artifacts. Returns null when upload fails.
 *
 * Primary: Grove (Lens storage) — keyless immutable uploads anchored to
 * GROVE_CHAIN_ID (Base mainnet 8453 — never a testnet, which has weaker
 * retention). Fallback: Pinata when PINATA_JWT is configured.
 */
export function isDurableMediaPersistenceAvailable(): boolean {
  // Grove needs no credential — durable persistence is always available.
  return true
}

export async function persistMediaUrl(mediaUrl: string, fileName: string): Promise<string | null> {
  const controller = new AbortController()
  const timeoutId = setTimeout(() => controller.abort(), 30_000)

  try {
    const mediaResponse = await fetch(mediaUrl, {
      signal: controller.signal,
      headers: { Accept: 'video/mp4,video/*,application/octet-stream' },
    })
    if (!mediaResponse.ok) throw new Error(`Media download failed: ${mediaResponse.status}`)

    const contentLength = Number(mediaResponse.headers.get('content-length') || 0)
    if (contentLength > MAX_MEDIA_BYTES) {
      throw new Error('Generated media exceeds the 100MB persistence limit')
    }

    const buffer = await mediaResponse.arrayBuffer()
    if (buffer.byteLength > MAX_MEDIA_BYTES) {
      throw new Error('Generated media exceeds the 100MB persistence limit')
    }

    return await persistMediaBuffer(
      buffer,
      fileName,
      mediaResponse.headers.get('content-type') || 'video/mp4'
    )
  } catch (error) {
    logger.warn('Generated media persistence failed; retaining provider URL', {
      error: error instanceof Error ? error.message : 'Unknown error',
      type: 'hero-video',
    })
    return null
  } finally {
    clearTimeout(timeoutId)
  }
}

/**
 * Pin raw bytes directly — for media already in memory (e.g. the montage MP4
 * assembled by the VPS concat worker, which never has a public URL to copy).
 */
export async function persistMediaBuffer(
  buffer: ArrayBuffer | Uint8Array,
  fileName: string,
  contentType = 'video/mp4'
): Promise<string | null> {
  if (buffer.byteLength > MAX_MEDIA_BYTES) return null
  try {
    const groveUrl = await uploadToGrove(buffer, fileName, contentType)
    if (groveUrl) return groveUrl
  } catch (error) {
    logger.warn('Grove media persistence failed; trying Pinata', {
      error: error instanceof Error ? error.message : 'Unknown error',
      type: 'hero-video',
    })
  }
  if (config.ipfs.pinataJwt) {
    try {
      return await pinToPinata(buffer, fileName, contentType)
    } catch (error) {
      logger.warn('Pinata media persistence failed', {
        error: error instanceof Error ? error.message : 'Unknown error',
        type: 'hero-video',
      })
    }
  }
  return null
}

interface GroveUploadResponse {
  storage_key?: string
  gateway_url?: string
  uri?: string
  status_url?: string
}

/**
 * One-step immutable Grove upload: raw bytes POSTed with chain_id selecting the
 * ACL/retention anchor. No credential required for immutable content.
 * 202 = accepted, propagating to underlying storage asynchronously — wait
 * briefly so the returned gateway URL is actually fetchable.
 */
async function uploadToGrove(
  buffer: ArrayBuffer | Uint8Array,
  fileName: string,
  contentType: string
): Promise<string | null> {
  const chainId = Number.isFinite(config.ipfs.groveChainId) ? config.ipfs.groveChainId : 8453
  const response = await fetch(`${GROVE_API_URL}/?chain_id=${chainId}`, {
    method: 'POST',
    headers: { 'Content-Type': contentType },
    body: new Uint8Array(buffer),
  })
  if (!response.ok && response.status !== 202) {
    const body = await response.text().catch(() => '')
    throw new Error(`Grove upload failed: ${response.status}${body ? ` - ${body.slice(0, 200)}` : ''}`)
  }

  const data = (await response.json()) as GroveUploadResponse | GroveUploadResponse[]
  const result = Array.isArray(data) ? data[0] : data
  if (!result?.gateway_url) {
    throw new Error('Grove upload failed: response did not include gateway_url')
  }

  if (response.status === 202) {
    await waitForGrovePropagation(result.gateway_url)
  }

  logger.ipfs('Persisted generated media', {
    uri: result.gateway_url,
    storageKey: result.storage_key,
    fileName,
    type: 'hero-video',
  })
  return result.gateway_url
}

async function waitForGrovePropagation(gatewayUrl: string): Promise<void> {
  for (let attempt = 0; attempt < GROVE_PROPAGATION_ATTEMPTS; attempt++) {
    try {
      const probe = await fetch(gatewayUrl, { method: 'HEAD' })
      if (probe.ok) return
    } catch {
      // Propagation in progress; retry.
    }
    await new Promise((resolve) => setTimeout(resolve, GROVE_PROPAGATION_DELAY_MS))
  }
  // Not fatal — the URL is allocated and will serve once propagation lands.
  logger.warn('Grove media still propagating; returning gateway URL anyway', { uri: gatewayUrl })
}

async function pinToPinata(
  buffer: ArrayBuffer | Uint8Array,
  fileName: string,
  contentType: string
): Promise<string> {
  const form = new FormData()
  form.append('file', new Blob([new Uint8Array(buffer)], { type: contentType }), fileName)
  form.append('pinataMetadata', JSON.stringify({ name: fileName, keyvalues: { type: 'hero-video' } }))

  const uploadResponse = await fetch('https://api.pinata.cloud/pinning/pinFileToIPFS', {
    method: 'POST',
    headers: { Authorization: `Bearer ${config.ipfs.pinataJwt}` },
    body: form,
  })
  if (!uploadResponse.ok) throw new Error(`Pinata media upload failed: ${uploadResponse.status}`)

  const data = await uploadResponse.json() as { IpfsHash?: string }
  if (!data.IpfsHash) throw new Error('Pinata media upload did not return an IPFS hash')

  const gateway = process.env.IPFS_GATEWAY || 'https://gateway.pinata.cloud/ipfs'
  const durableUrl = `${gateway.replace(/\/$/, '')}/${data.IpfsHash}`
  logger.ipfs('Persisted generated media', { uri: durableUrl, type: 'hero-video' })
  return durableUrl
}
