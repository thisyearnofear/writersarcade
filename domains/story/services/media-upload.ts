import { config, logger } from '@/lib/config'

/**
 * Copy a generated media URL to Pinata so temporary provider URLs are not used
 * as permanent public artifacts. Returns null when durable upload is unavailable.
 */
export function isDurableMediaPersistenceAvailable(): boolean {
  return Boolean(config.ipfs.pinataJwt)
}

export async function persistMediaUrl(mediaUrl: string, fileName: string): Promise<string | null> {
  if (!config.ipfs.pinataJwt) return null

  const controller = new AbortController()
  const timeoutId = setTimeout(() => controller.abort(), 30_000)

  try {
    const mediaResponse = await fetch(mediaUrl, {
      signal: controller.signal,
      headers: { Accept: 'video/mp4,video/*,application/octet-stream' },
    })
    if (!mediaResponse.ok) throw new Error(`Media download failed: ${mediaResponse.status}`)

    const contentLength = Number(mediaResponse.headers.get('content-length') || 0)
    if (contentLength > 100 * 1024 * 1024) {
      throw new Error('Generated media exceeds the 100MB persistence limit')
    }

    const buffer = await mediaResponse.arrayBuffer()
    if (buffer.byteLength > 100 * 1024 * 1024) {
      throw new Error('Generated media exceeds the 100MB persistence limit')
    }

    return await pinBuffer(buffer, fileName, mediaResponse.headers.get('content-type') || 'video/mp4')
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
  if (!config.ipfs.pinataJwt) return null
  if (buffer.byteLength > 100 * 1024 * 1024) return null
  try {
    return await pinBuffer(buffer, fileName, contentType)
  } catch (error) {
    logger.warn('Media buffer persistence failed', {
      error: error instanceof Error ? error.message : 'Unknown error',
      type: 'hero-video',
    })
    return null
  }
}

async function pinBuffer(
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
