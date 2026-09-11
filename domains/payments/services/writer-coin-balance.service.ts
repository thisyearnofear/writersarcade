import { createPublicClient } from 'viem'
import { base } from 'viem/chains'
import { getWriterCoinById } from '@/lib/writer-coins'
import { baseRpcTransport } from '@/lib/base-rpc'

export interface WriterCoinBalanceResponse {
  success: true
  data: {
    wallet: string
    coin: string
    balance: string
    decimals: number
    symbol: string
    formattedBalance: string
  }
}

const balanceCache = new Map<string, { data: WriterCoinBalanceResponse['data']; timestamp: number }>()
const CACHE_DURATION = 15000

function formatBalance(balance: bigint, decimals: number) {
  const divisor = BigInt(10 ** decimals)
  const whole = (balance / divisor).toString()
  const remainder = (balance % divisor).toString().padStart(decimals, '0')
  const trimmed = remainder.slice(0, 6).replace(/0+$/, '')
  return trimmed ? `${whole}.${trimmed}` : whole
}

export async function fetchWriterCoinBalance(wallet: string, coinId = 'avc'): Promise<WriterCoinBalanceResponse> {
  if (!wallet) {
    throw new Error('Wallet address required')
  }

  if (!wallet.match(/^0x[a-fA-F0-9]{40}$/)) {
    throw new Error('Invalid wallet address format')
  }

  const coin = getWriterCoinById(coinId)
  if (!coin) {
    throw new Error(`Unknown writer coin: ${coinId}`)
  }

  const cacheKey = `${wallet.toLowerCase()}-${coinId}`
  const cached = balanceCache.get(cacheKey)
  if (cached && Date.now() - cached.timestamp < CACHE_DURATION) {
    return { success: true, data: cached.data }
  }

  const client = createPublicClient({
    chain: base,
    transport: baseRpcTransport(),
  })

  const abi = [{
    name: 'balanceOf',
    type: 'function',
    stateMutability: 'view',
    inputs: [{ name: 'account', type: 'address' }],
    outputs: [{ name: 'balance', type: 'uint256' }],
  }] as const

  const balance = await client.readContract({
    address: coin.address as `0x${string}`,
    abi,
    functionName: 'balanceOf',
    args: [wallet as `0x${string}`],
  })

  const data = {
    wallet,
    coin: coinId,
    balance: balance.toString(),
    decimals: coin.decimals,
    symbol: coin.symbol,
    formattedBalance: formatBalance(balance, coin.decimals),
  }

  balanceCache.set(cacheKey, { data, timestamp: Date.now() })
  return { success: true, data }
}

export function clearWriterCoinBalanceCache() {
  balanceCache.clear()
}
