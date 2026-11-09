'use client'

import { useAccount, useChainId, useSwitchChain } from 'wagmi'
import { motion } from 'framer-motion'
import { Globe, AlertCircle, ArrowRightLeft } from 'lucide-react'
import { getChainInfo, MEZO_TESTNET_CHAIN_ID, BASE_MAINNET_CHAIN_ID } from '@/lib/wallet/chains'

/**
 * Network Indicator Component
 *
 * Shows the current blockchain network the user is connected to.
 * Includes a quick-switch button for Mezo when on a different chain.
 */
export function NetworkIndicator() {
  const { isConnected } = useAccount()
  const chainId = useChainId()
  const { switchChain, isPending } = useSwitchChain()
  const chainInfo = getChainInfo(chainId)

  if (!isConnected) {
    return null
  }

  const isOnMezo = chainInfo.ecosystem === 'mezo'
  const isOnBase = chainInfo.ecosystem === 'base'

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      className="flex items-center gap-1.5"
    >
      <div
        className={`
          flex items-center gap-2 px-3 py-1.5 rounded-full border text-xs font-medium
          ${chainInfo.bgColor}
          transition-colors duration-200
        `}
      >
        {chainInfo.isSupported ? (
          <>
            <Globe className={`w-3.5 h-3.5 ${chainInfo.color}`} />
            <span className={chainInfo.color}>{chainInfo.name}</span>
            {chainInfo.purpose && (
              <span className="text-muted-foreground hidden sm:inline">
                · {chainInfo.purpose}
              </span>
            )}
          </>
        ) : (
          <>
            <AlertCircle className="w-3.5 h-3.5 text-warning" />
            <span className="text-warning dark:text-warning">
              Unsupported Network
            </span>
          </>
        )}
      </div>

      {!isOnMezo && (
        <button
          onClick={() => switchChain({ chainId: MEZO_TESTNET_CHAIN_ID })}
          disabled={isPending}
          className="flex items-center gap-1 px-2 py-1.5 rounded-full border border-warning/30 bg-warning/5 text-[11px] font-medium text-warning dark:text-warning hover:bg-warning/10 hover:border-warning/50 transition-colors disabled:opacity-50"
          title="Switch to Mezo for MUSD payments"
        >
          <ArrowRightLeft className="w-3 h-3" />
          <span className="hidden sm:inline">Mezo</span>
        </button>
      )}

      {!isOnBase && (
        <button
          onClick={() => switchChain({ chainId: BASE_MAINNET_CHAIN_ID })}
          disabled={isPending}
          className="flex items-center gap-1 px-2 py-1.5 rounded-full border border-info/30 bg-info/5 text-[11px] font-medium text-info dark:text-info hover:bg-info/10 hover:border-info/50 transition-colors disabled:opacity-50"
          title="Switch to Base for Writer Coin payments"
        >
          <ArrowRightLeft className="w-3 h-3" />
          <span className="hidden sm:inline">Base</span>
        </button>
      )}
    </motion.div>
  )
}

/**
 * Compact version for mobile or tight spaces
 */
export function NetworkIndicatorCompact() {
  const { isConnected } = useAccount()
  const chainId = useChainId()
  const { switchChain, isPending } = useSwitchChain()
  const chainInfo = getChainInfo(chainId)

  if (!isConnected) {
    return null
  }

  const isOnMezo = chainInfo.ecosystem === 'mezo'
  const isOnBase = chainInfo.ecosystem === 'base'

  return (
    <div className="flex items-center gap-1.5">
      <div
        className={`
          inline-flex items-center gap-1.5 px-2 py-1 rounded-md text-xs font-medium
          ${chainInfo.bgColor}
        `}
        title={`${chainInfo.name}${chainInfo.purpose ? ` - ${chainInfo.purpose}` : ''}`}
      >
        <div className={`w-2 h-2 rounded-full ${
          !chainInfo.isSupported
            ? 'bg-warning'
            : chainInfo.ecosystem === 'mezo'
                ? 'bg-warning'
                : 'bg-info'
        }`} />
        <span className={chainInfo.color}>{chainInfo.name}</span>
      </div>

      {!isOnMezo && (
        <button
          onClick={() => switchChain({ chainId: MEZO_TESTNET_CHAIN_ID })}
          disabled={isPending}
          className="inline-flex items-center gap-1 px-1.5 py-1 rounded-md text-[10px] font-medium text-warning dark:text-warning hover:bg-warning/10 transition-colors disabled:opacity-50"
          title="Switch to Mezo"
        >
          <ArrowRightLeft className="w-2.5 h-2.5" />
        </button>
      )}

      {!isOnBase && (
        <button
          onClick={() => switchChain({ chainId: BASE_MAINNET_CHAIN_ID })}
          disabled={isPending}
          className="inline-flex items-center gap-1 px-1.5 py-1 rounded-md text-[10px] font-medium text-info dark:text-info hover:bg-info/10 transition-colors disabled:opacity-50"
          title="Switch to Base"
        >
          <ArrowRightLeft className="w-2.5 h-2.5" />
        </button>
      )}
    </div>
  )
}