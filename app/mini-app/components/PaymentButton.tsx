'use client'

import { useState } from 'react'
import { type WriterCoin } from '@/lib/writerCoins'

interface PaymentButtonProps {
  writerCoin: WriterCoin
  action: 'generate-game' | 'mint-nft'
  onPaymentSuccess?: (transactionHash: string) => void
  onPaymentError?: (error: string) => void
  disabled?: boolean
}

export function PaymentButton({
  writerCoin,
  action,
  onPaymentSuccess,
  onPaymentError,
  disabled = false,
}: PaymentButtonProps) {
  const [isProcessing, setIsProcessing] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const cost = action === 'generate-game'
    ? writerCoin.gameGenerationCost
    : writerCoin.mintCost

  const costFormatted = (Number(cost) / 10 ** writerCoin.decimals).toFixed(0)
  
  const actionLabel = action === 'generate-game'
    ? `Generate Game (${costFormatted} ${writerCoin.symbol})`
    : `Mint as NFT (${costFormatted} ${writerCoin.symbol})`

  const handlePayment = async () => {
    setIsProcessing(true)
    setError(null)

    try {
      // Step 1: Initiate payment on backend
      const initiateResponse = await fetch('/api/mini-app/payments/initiate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          writerCoinId: writerCoin.id,
          action,
        }),
      })

      if (!initiateResponse.ok) {
        const errorData = await initiateResponse.json()
        throw new Error(errorData.error || 'Failed to initiate payment')
      }

      const paymentInfo = await initiateResponse.json()

      // Step 2: TODO - Call Farcaster Wallet to approve and send transaction
      // This will involve:
      // - Showing user approval dialog
      // - Calling WriterCoinPayment.payForGameGeneration or payForMinting
      // - Getting transaction hash from user's wallet
      
      // For now, show placeholder message
      const message = action === 'generate-game'
        ? `Approve ${costFormatted} ${writerCoin.symbol} in your Farcaster wallet to generate the game`
        : `Approve ${costFormatted} ${writerCoin.symbol} in your Farcaster wallet to mint the NFT`
      
      console.log('Payment info:', paymentInfo)
      console.log('TODO: Show wallet approval dialog:', message)

      // Placeholder: simulate successful transaction
      // In production, this would come from the wallet
      const mockTxHash = '0x' + Array(64).fill(0).map(() => Math.floor(Math.random() * 16).toString(16)).join('')
      
      // Step 3: Verify payment on backend
      const verifyResponse = await fetch('/api/mini-app/payments/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          transactionHash: mockTxHash,
          writerCoinId: writerCoin.id,
          action,
        }),
      })

      if (!verifyResponse.ok) {
        const errorData = await verifyResponse.json()
        throw new Error(errorData.error || 'Failed to verify payment')
      }

      onPaymentSuccess?.(mockTxHash)
    } catch (err) {
      const message = err instanceof Error ? err.message : 'An error occurred'
      setError(message)
      onPaymentError?.(message)
      console.error('Payment error:', err)
    } finally {
      setIsProcessing(false)
    }
  }

  return (
    <div className="space-y-3">
      <button
        onClick={handlePayment}
        disabled={disabled || isProcessing}
        className="w-full rounded-lg bg-purple-600 px-6 py-4 font-semibold text-white transition-colors hover:bg-purple-500 disabled:cursor-not-allowed disabled:opacity-50"
      >
        {isProcessing ? (
          <span className="flex items-center justify-center gap-2">
            <svg className="h-4 w-4 animate-spin" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
            </svg>
            Processing payment...
          </span>
        ) : (
          actionLabel
        )}
      </button>

      {error && (
        <div className="rounded-lg bg-red-500/20 border border-red-500/50 p-3">
          <p className="text-sm text-red-200">{error}</p>
        </div>
      )}

      <div className="rounded-lg bg-purple-900/30 p-3 text-xs text-purple-300">
        <p>
          💡 <span className="font-semibold">Payment flow:</span> You'll approve spending in your Farcaster wallet, then we process your payment on Base.
        </p>
      </div>
    </div>
  )
}
