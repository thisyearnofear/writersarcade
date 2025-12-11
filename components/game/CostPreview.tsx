'use client'

import { useEffect, useMemo, useState } from 'react'
import { type WriterCoin } from '@/lib/writerCoins'
import { PaymentCostService } from '@/domains/payments/services/payment-cost.service'
import type { PaymentAction } from '@/domains/payments/types'

interface CostPreviewProps {
  writerCoin: WriterCoin
  action: PaymentAction
  showBreakdown?: boolean
}

export function CostPreview({ writerCoin, action, showBreakdown = true }: CostPreviewProps) {
  const [cost, setCost] = useState(() => PaymentCostService.calculateCostSync(writerCoin.id, action))
  useEffect(() => {
    let canceled = false
    ;(async () => {
      try {
        const c = await PaymentCostService.calculateCost(writerCoin.id, action)
        if (!canceled) setCost(c)
      } catch {
        if (!canceled) setCost(PaymentCostService.calculateCostSync(writerCoin.id, action))
      }
    })()
    return () => { canceled = true }
  }, [writerCoin.id, action])

  const [distribution, setDistribution] = useState({ writerShare: BigInt(0), platformShare: BigInt(0), creatorShare: BigInt(0) })
  useEffect(() => {
    let canceled = false
    ;(async () => {
      try {
        const dist = await PaymentCostService.calculateDistribution(writerCoin.id, action)
        if (!canceled) setDistribution(dist)
      } catch {
        if (!canceled) setDistribution({ writerShare: BigInt(0), platformShare: BigInt(0), creatorShare: BigInt(0) })
      }
    })()
    return () => { canceled = true }
  }, [writerCoin.id, action])

  const actionLabel = action === 'generate-game' ? 'Generation Cost' : 'Minting Cost'

  return (
    <div className="rounded-lg bg-purple-900/30 p-4">
      <div className="space-y-2 text-sm">
        <div className="flex items-center justify-between">
          <span className="text-purple-300">{actionLabel}:</span>
          <span className="font-semibold text-purple-200">{cost.amountFormatted} {writerCoin.symbol}</span>
        </div>

        {showBreakdown && (
          <>
            <div className="border-t border-purple-600 pt-2">
              {action === 'generate-game' ? (
                <>
                  <div className="flex items-center justify-between">
                    <span className=\"text-purple-300\">Writer:</span>
                    <span className="font-semibold text-green-400">
                      {(Number(distribution.writerShare) / 10 ** writerCoin.decimals).toFixed(0)} {writerCoin.symbol}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className=\"text-purple-300\">Platform:</span>
                    <span className="font-semibold text-blue-400">
                      {(Number(distribution.platformShare) / 10 ** writerCoin.decimals).toFixed(0)} {writerCoin.symbol}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className=\"text-purple-300\">Creator Pool:</span>
                    <span className="font-semibold text-purple-400">
                      {(Number(distribution.creatorShare) / 10 ** writerCoin.decimals).toFixed(0)} {writerCoin.symbol}
                    </span>
                  </div>
                </>
              ) : (
                <>
                  <div className="flex items-center justify-between">
                    <span className=\"text-purple-300\">Creator:</span>
                    <span className="font-semibold text-blue-400">
                      {(Number(distribution.creatorShare) / 10 ** writerCoin.decimals).toFixed(0)} {writerCoin.symbol}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className=\"text-purple-300\">Writer:</span>
                    <span className="font-semibold text-green-400">
                      {(Number(distribution.writerShare) / 10 ** writerCoin.decimals).toFixed(0)} {writerCoin.symbol}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className=\"text-purple-300\">Platform:</span>
                    <span className="font-semibold text-orange-400">
                      {(Number(distribution.platformShare) / 10 ** writerCoin.decimals).toFixed(0)} {writerCoin.symbol}
                    </span>
                  </div>
                </>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  )
}
