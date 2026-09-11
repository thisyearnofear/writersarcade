/**
 * Shared Base RPC transport.
 *
 * The official `mainnet.base.org` endpoint is aggressively rate-limited and a
 * couple of popular public endpoints (`base.llamarpc.com`, `rpc.ankr.com/base`)
 * are either CORS-blocked from browsers or require an API key. This ordered
 * fallback list prefers endpoints that are CORS-enabled and reliably open.
 *
 * Env overrides (`BASE_RPC_URL` server-side, `NEXT_PUBLIC_BASE_RPC_URL` either)
 * are tried first when set.
 */
import { fallback, http, type Transport } from 'viem'

export const BASE_PUBLIC_RPC_URLS = [
  'https://base.publicnode.com',
  'https://base-mainnet.public.blastapi.io',
  'https://base.drpc.org',
  'https://1rpc.io/base',
  'https://base-pokt.nodies.app',
  'https://mainnet.base.org',
] as const

/** Ordered Base RPC URLs: env override first (when set), then the public list. */
export function baseRpcUrls(): string[] {
  const preferred = process.env.BASE_RPC_URL || process.env.NEXT_PUBLIC_BASE_RPC_URL
  const urls = preferred && !BASE_PUBLIC_RPC_URLS.includes(preferred as (typeof BASE_PUBLIC_RPC_URLS)[number])
    ? [preferred, ...BASE_PUBLIC_RPC_URLS]
    : [...BASE_PUBLIC_RPC_URLS]
  return urls
}

/** viem fallback transport across the ordered Base RPC list. */
export function baseRpcTransport(): Transport {
  return fallback(baseRpcUrls().map((url) => http(url)))
}
