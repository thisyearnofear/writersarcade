'use client'

import { useAccount } from 'wagmi'
import { type WriterCoin } from '@/lib/writerCoins'
import { PaymentFlow } from './PaymentFlow'
import { CostPreview } from './CostPreview'
import { WalletConnect } from '@/components/ui/wallet-connect'
import { PaymentCostService } from '@/domains/payments/services/payment-cost.service'
import { useMemo } from 'react'
import type { PaymentAction } from '@/domains/payments/types'
import { AlertCircle } from 'lucide-react'

interface PaymentOptionProps {
  writerCoin: WriterCoin
  action: PaymentAction
  onPaymentSuccess?: (transactionHash: string) => void
  onPaymentError?: (error: string) => void
  disabled?: boolean
  optional?: boolean // If true, user can skip payment
  onSkip?: () => void
}

/**
 * Payment UI component for web app
 * 
 * Shows:
 * 1. Wallet connection requirement (if not connected)
 * 2. Cost preview
 * 3. Payment flow (if connected)
 * 4. Option to skip (if optional)
 */
export function PaymentOption({
  writerCoin,
  action,
  onPaymentSuccess,
  onPaymentError,
  disabled = false,
  optional = false,
  onSkip,
}: PaymentOptionProps) {
  const { isConnected } = useAccount()

  const cost = useMemo(() => {
    return PaymentCostService.calculateCostSync(writerCoin.id, action)
  }, [writerCoin.id, action])

  if (!isConnected) {
    return (
      <div className="space-y-4">
        <div className="rounded-lg border border-amber-600/50 bg-amber-900/20 p-4">
          <div className="flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-amber-500 flex-shrink-0 mt-0.5" />
            <div className="flex-1">
              <p className="text-sm font-semibold text-amber-200 mb-2">Wallet Connection Required</p>
              <p className="text-sm text-amber-300 mb-3">
                To proceed with payment and customization, please connect your wallet. You'll need to approve a transaction on the Base blockchain.
              </p>
              <WalletConnect />
            </div>
          </div>
        </div>

      </div>
    )
  }

  return (
    <div className="space-y-4">
      {/* Cost Preview */}
      <CostPreview writerCoin={writerCoin} action={action} showBreakdown={true} />

      {/* Payment Flow */}
      {/* Elevated CTA visuals for stronger contrast */}
      <div className="rounded-xl border border-[color:var(--ia-panel-border)] bg-[color:var(--ia-panel-bg)] p-3 shadow-[0_0_0_1px_var(--ia-outline)]">
        <PaymentFlow
        writerCoin={writerCoin}
        action={action}
        costFormatted={cost.amountFormatted}
        onPaymentSuccess={onPaymentSuccess}
        onPaymentError={onPaymentError}
        disabled={disabled}
      />
     </div>

      {/* Info */}
      <div className="rounded-lg border border-[color:var(--ia-panel-border)] bg-[color:var(--ia-panel-bg)] p-3 text-xs text-purple-100">
        <p>
          💡 <span className="font-semibold">Note:</span> Payment is required to generate games. Your payment supports the platform and content creators.
        </p>
      </div>
    </div>
  )
}
