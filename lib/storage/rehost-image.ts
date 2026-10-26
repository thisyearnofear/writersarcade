import { config, logger } from '@/lib/config'

/**
 * Re-host an image on IPFS via Pinata — accepts http(s) URLs and data: URIs.
 * Returns the gateway URL on success, or null so callers keep the original
 * (graceful degradation when Pinata is unconfigured or unreachable).
 */
export async function rehostRemoteImage(url: string): Promise<string | null> {
  const jwt = config.ipfs.pinataJwt
  if (!jwt) return null
  try {
    let blob: Blob
    if (url.startsWith('data:')) {
      const res = await fetch(url)
      blob = await res.blob()
    } else if (url.startsWith('http')) {
      const res = await fetch(url)
      if (!res.ok) return null
      blob = await res.blob()
    } else {
      return null
    }
    const form = new FormData()
    form.append('file', blob, 'image.png')
    const res = await fetch('https://api.pinata.cloud/pinning/pinFileToIPFS', {
      method: 'POST',
      headers: { Authorization: `Bearer ${jwt}` },
      body: form,
    })
    if (!res.ok) return null
    const data = await res.json()
    if (!data.IpfsHash) return null
    const gateway = process.env.IPFS_GATEWAY || 'https://gateway.pinata.cloud'
    return `${gateway}/ipfs/${data.IpfsHash}`
  } catch (err) {
    logger.warn('[rehost] IPFS re-host failed', { error: err instanceof Error ? err.message : String(err) })
    return null
  }
}
