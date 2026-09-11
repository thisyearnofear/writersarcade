'use client'

import { useMemo } from 'react'
import { useAccount, useReadContract } from 'wagmi'
import { erc20Abi, formatUnits } from 'viem'
import { base } from 'viem/chains'
import { getWriterCoinById } from '@/lib/writer-coins'

export interface BalanceData {
  balance: string
  decimals: number
  symbol: string
  formattedBalance: string
}

/**
 * Read a writer coin ERC-20 balance directly from Base.
 *
 * Previously this called the Fastify backend, but that added an extra hop,
 * required the backend to be healthy, and caused 502s in production. Reading
 * on-chain from the client removes the dependency and lets wagmi batch/cache.
 */
export function useWriterCoinBalance(coinId = 'avc') {
  const { address, isConnected } = useAccount()
  const writerCoin = useMemo(() => getWriterCoinById(coinId), [coinId])

  const { data, isLoading, error, refetch } = useReadContract({
    chainId: base.id,
    address: (writerCoin?.address as `0x${string}`) ?? undefined,
    abi: erc20Abi,
    functionName: 'balanceOf',
    args: address ? [address] : undefined,
    query: {
      enabled: isConnected && !!address && !!writerCoin && !!coinId,
    },
  })

  const balance: BalanceData | null = useMemo(() => {
    if (writerCoin === undefined || data === undefined) return null
    return {
      balance: data.toString(),
      decimals: writerCoin.decimals,
      symbol: writerCoin.symbol,
      formattedBalance: formatUnits(data, writerCoin.decimals),
    }
  }, [data, writerCoin])

  // When no coinId is provided (e.g. MUSD or credits path) return a no-op shape
  // without changing hook count.
  if (!coinId || !writerCoin) {
    return { balance: null, isLoading: false, error: null, refresh: async () => {} }
  }

  return {
    balance,
    isLoading,
    error: error ? (error instanceof Error ? error.message : 'Failed to fetch balance') : null,
    refresh: refetch,
  }
}
