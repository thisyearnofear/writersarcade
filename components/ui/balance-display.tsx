'use client'

import { useWriterCoinBalance } from '@/hooks/useWriterCoinBalance'
import { useAccount } from 'wagmi'
import { Coins, Loader2 } from 'lucide-react'

/**
 * Header balance display showing user's AVC token balance
 * Only visible when wallet is connected
 */
export function BalanceDisplay() {
  const { isConnected } = useAccount()
  const { balance, isLoading } = useWriterCoinBalance()

  if (!isConnected) {
    return null
  }

  return (
    <div className="flex items-center space-x-2 px-3 py-2 rounded-lg bg-purple-600/10 border border-purple-500/30 text-sm">
      {isLoading ? (
        <>
          <Loader2 className="w-4 h-4 text-purple-400 animate-spin" />
          <span className="text-gray-400">Loading...</span>
        </>
      ) : balance ? (
        <>
          <Coins className="w-4 h-4 text-purple-400" />
          <span className="text-white font-medium">{balance.formattedBalance}</span>
          <span className="text-gray-400">{balance.symbol}</span>
        </>
      ) : (
        <>
          <Coins className="w-4 h-4 text-gray-500" />
          <span className="text-gray-400">0 AVC</span>
        </>
      )}
    </div>
  )
}
