/**
 * Single source of truth for chain IDs and human-friendly chain metadata
 * used across the writersarcade UI and payment strategies.
 *
 * Add new chains here, then import from this module everywhere — never
 * hard-code chain IDs in components or services.
 */

export const BASE_MAINNET_CHAIN_ID = 8453 as const
export const BASE_SEPOLIA_CHAIN_ID = 84532 as const
export const MEZO_TESTNET_CHAIN_ID = 31611 as const
export const MEZO_MAINNET_CHAIN_ID = 31612 as const

// Mezo's public gateway fronts an inconsistent node fleet — a tx can be absent
// on one backend and present on others. Validator nodes expose JSON-RPC on
// :8545 (documented in mezod). Consumers should fail over across this list; a
// null result means "try the next node", not "not found".
export const MEZO_TESTNET_RPCS = [
  'https://rpc.test.mezo.org',
  'http://mezo-node-0.test.mezo.org:8545',
  'http://mezo-node-1.test.mezo.org:8545',
  'http://mezo-node-2.test.mezo.org:8545',
  'http://mezo-node-3.test.mezo.org:8545',
  'http://mezo-node-4.test.mezo.org:8545',
] as const
export const MEZO_MAINNET_RPCS = [
  'https://rpc-http.mezo.boar.network',
  'https://rpc_evm-mezo.imperator.co',
  'https://jsonrpc-mezo.boar.network',
] as const

/** Active Mezo network — flips via NEXT_PUBLIC_MEZO_NETWORK (default testnet). */
export const MEZO_NETWORK: 'testnet' | 'mainnet' =
  process.env.NEXT_PUBLIC_MEZO_NETWORK === 'mainnet' ? 'mainnet' : 'testnet'
export const MEZO_ACTIVE_CHAIN_ID = MEZO_NETWORK === 'mainnet' ? MEZO_MAINNET_CHAIN_ID : MEZO_TESTNET_CHAIN_ID
export const MEZO_ACTIVE_EXPLORER =
  MEZO_NETWORK === 'mainnet' ? 'https://explorer.mezo.org' : 'https://explorer.test.mezo.org'

export type SupportedChainId =
  | typeof BASE_MAINNET_CHAIN_ID
  | typeof BASE_SEPOLIA_CHAIN_ID
  | typeof MEZO_TESTNET_CHAIN_ID
  | typeof MEZO_MAINNET_CHAIN_ID

/**
 * High-level "ecosystem" a chain belongs to in our app's mental model.
 * Used by UI to colour-code, group balances, and route payment flows.
 */
export type ChainEcosystem = 'base' | 'mezo'

export interface ChainInfo {
  id: number
  name: string
  shortName: string
  ecosystem: ChainEcosystem
  /** Tailwind text color class for the chain. */
  color: string
  /** Tailwind background+border classes for chips/badges. */
  bgColor: string
  /** What this chain is used for in the app. */
  purpose: string
  isTestnet: boolean
  isSupported: boolean
  /** Block explorer base URL (e.g. https://basescan.org). Append /tx/<hash> for txs. */
  blockExplorer?: string
}

const UNSUPPORTED: ChainInfo = {
  id: 0,
  name: 'Unsupported Network',
  shortName: 'Unsupported',
  ecosystem: 'base',
  color: 'text-amber-600 dark:text-amber-400',
  bgColor: 'bg-amber-50 dark:bg-amber-900/30 border-amber-200 dark:border-amber-800',
  purpose: 'Switch to a supported network',
  isTestnet: false,
  isSupported: false,
}

const CHAINS: Record<number, ChainInfo> = {
  [BASE_MAINNET_CHAIN_ID]: {
    id: BASE_MAINNET_CHAIN_ID,
    name: 'Base',
    shortName: 'Base',
    ecosystem: 'base',
    color: 'text-blue-600 dark:text-blue-400',
    bgColor: 'bg-blue-50 dark:bg-blue-900/30 border-blue-200 dark:border-blue-800',
    purpose: 'Writer coin payments',
    isTestnet: false,
    isSupported: true,
    blockExplorer: 'https://basescan.org',
  },
  [BASE_SEPOLIA_CHAIN_ID]: {
    id: BASE_SEPOLIA_CHAIN_ID,
    name: 'Base Sepolia',
    shortName: 'Base Sepolia',
    ecosystem: 'base',
    color: 'text-blue-500 dark:text-blue-300',
    bgColor: 'bg-blue-50 dark:bg-blue-900/30 border-blue-200 dark:border-blue-800',
    purpose: 'Testnet payments',
    isTestnet: true,
    isSupported: true,
  },
  [MEZO_TESTNET_CHAIN_ID]: {
    id: MEZO_TESTNET_CHAIN_ID,
    name: 'Mezo Matsnet',
    shortName: 'Mezo',
    ecosystem: 'mezo',
    color: 'text-amber-600 dark:text-amber-400',
    bgColor: 'bg-amber-50 dark:bg-amber-900/20 border-amber-300 dark:border-amber-700',
    purpose: 'MUSD payments',
    isTestnet: true,
    isSupported: true,
    blockExplorer: 'https://explorer.test.mezo.org',
  },
  [MEZO_MAINNET_CHAIN_ID]: {
    id: MEZO_MAINNET_CHAIN_ID,
    name: 'Mezo',
    shortName: 'Mezo',
    ecosystem: 'mezo',
    color: 'text-amber-600 dark:text-amber-400',
    bgColor: 'bg-amber-50 dark:bg-amber-900/20 border-amber-300 dark:border-amber-700',
    purpose: 'MUSD payments',
    isTestnet: false,
    isSupported: true,
    blockExplorer: 'https://explorer.mezo.org',
  },
}

/** Look up chain metadata by id; returns an "unsupported" stub for unknown ids. */
export function getChainInfo(chainId: number | undefined): ChainInfo {
  if (!chainId) return UNSUPPORTED
  return CHAINS[chainId] ?? UNSUPPORTED
}

/** Map a payment-token type → the chain id its strategy executes on. */
export function chainForPaymentPath(path: 'writercoin' | 'musd'): number {
  return path === 'musd' ? MEZO_ACTIVE_CHAIN_ID : BASE_MAINNET_CHAIN_ID
}
