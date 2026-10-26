/**
 * Third-party libs (viem/RainbowKit ENS avatar resolution) default to
 * https://ipfs.io, which serves no CORS headers — every avatar fetch fails in
 * the browser and spams the console. Rewrite those requests to the Pinata
 * gateway, which serves the same content with ACAO:*.
 */

const IPFS_IO = 'https://ipfs.io'
const GATEWAY = process.env.NEXT_PUBLIC_IPFS_GATEWAY || 'https://gateway.pinata.cloud'

function rewrite(url: string): string | null {
  return url.startsWith(`${IPFS_IO}/`) ? `${GATEWAY}${url.slice(IPFS_IO.length)}` : null
}

export function installIpfsGatewayShim() {
  if (typeof window === 'undefined') return
  const w = window as unknown as { __ipfsGatewayShim?: boolean }
  if (w.__ipfsGatewayShim) return
  w.__ipfsGatewayShim = true

  const original = window.fetch.bind(window)
  window.fetch = (input: RequestInfo | URL, init?: RequestInit) => {
    if (typeof input === 'string') {
      const rewritten = rewrite(input)
      if (rewritten) return original(rewritten, init)
    } else {
      const url = input instanceof URL ? input.href : input.url
      const rewritten = url ? rewrite(url) : null
      if (rewritten) return original(new Request(rewritten, input instanceof Request ? input : undefined), init)
    }
    return original(input, init)
  }
}
