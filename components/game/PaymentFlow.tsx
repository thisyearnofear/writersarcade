'use client'

import { useState, useEffect } from 'react'
import { type WriterCoin } from '@/lib/writerCoins'
import { detectWalletProvider } from '@/lib/wallet'
import type { WalletProvider, TransactionRequest } from '@/lib/wallet/types'
import type { PaymentAction } from '@/domains/payments/types'
import { ErrorCard } from '@/components/error/ErrorCard'
import { getUserMessage, retryWithBackoff } from '@/lib/error-handler'

interface PaymentFlowProps {
  writerCoin: WriterCoin
  action: PaymentAction
  costFormatted: string
  onPaymentSuccess?: (transactionHash: string) => void
  onPaymentError?: (error: string) => void
  disabled?: boolean
}

export function PaymentFlow({
  writerCoin,
  action,
  costFormatted,
  onPaymentSuccess,
  onPaymentError,
  disabled = false,
}: PaymentFlowProps) {
  const [isProcessing, setIsProcessing] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [wallet, setWallet] = useState<WalletProvider | null>(null)
  const [walletType, setWalletType] = useState<string | null>(null)

  // Detect wallet on mount
  useEffect(() => {
    const detectWallet = async () => {
      const result = await detectWalletProvider()
      setWallet(result.provider)
      setWalletType(result.type)

      if (!result.available) {
        setError('No wallet detected. Please open this in Farcaster or install MetaMask.')
      }
    }

    detectWallet()
  }, [])

  const actionLabel =
    action === 'generate-game'
      ? `Generate Game (${costFormatted} ${writerCoin.symbol})`
      : `Mint as NFT (${costFormatted} ${writerCoin.symbol})`

  const handlePayment = async () => {
    if (!wallet) {
      setError('Wallet not available. Please make sure your wallet is connected.')
      return
    }

    setIsProcessing(true)
    setError(null)

    try {
      await retryWithBackoff(
        async () => {
          // Step 1: Get user's wallet address
          const userAddress = await wallet.getAddress()
          if (!userAddress) {
            throw new Error('Failed to get wallet address. Please make sure your wallet is unlocked.')
          }

          // Step 2: Initiate payment on backend to get payment details
          const initiateResponse = await fetch('/api/payments/initiate', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              writerCoinId: writerCoin.id,
              action,
            }),
          })

          if (!initiateResponse.ok) {
            const errorData = await initiateResponse.json().catch(() => ({}))
            throw new Error(
              errorData.error || 
              `Failed to initiate payment (${initiateResponse.status})`
            )
          }

          const paymentInfo = await initiateResponse.json()
          const contractAddress = paymentInfo.contractAddress as `0x${string}`

          if (!contractAddress) {
            throw new Error('Invalid contract address received from server')
          }

          // Step 3: Encode transaction data based on action and wallet type
          let transactionData: `0x${string}`

          if (walletType === 'farcaster') {
            // Use Farcaster encoding
            transactionData = encodeFarcasterPayment(contractAddress, writerCoin.address, userAddress, action)
          } else {
            // Use browser wallet encoding (same as Farcaster for now)
            transactionData = encodeFarcasterPayment(contractAddress, writerCoin.address, userAddress, action)
          }

          // Step 4: Send transaction through wallet provider
          const txRequest: TransactionRequest = {
            to: contractAddress,
            data: transactionData,
            chainId: 8453,
          }

          const txResult = await wallet.sendTransaction(txRequest)

          if (!txResult.success || !txResult.transactionHash) {
            throw new Error(txResult.error || 'Transaction was rejected or failed')
          }

          // Step 5: Verify payment on backend
          const verifyResponse = await fetch('/api/payments/verify', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              transactionHash: txResult.transactionHash,
              writerCoinId: writerCoin.id,
              action,
            }),
          })

          if (!verifyResponse.ok) {
            const errorData = await verifyResponse.json().catch(() => ({}))
            throw new Error(
              errorData.error || 
              `Failed to verify payment (${verifyResponse.status})`
            )
          }

          return txResult.transactionHash
        },
        2, // Max 2 retries
        1500 // 1.5 second base delay
      ).then((txHash) => {
        onPaymentSuccess?.(txHash)
      })
    } catch (err) {
      const message = getUserMessage(err)
      setError(message)
      onPaymentError?.(message)
      console.error('[PaymentFlow] Error:', err)
    } finally {
      setIsProcessing(false)
    }
  }

  return (
    <div className="space-y-3">
      <button
        onClick={handlePayment}
        disabled={disabled || isProcessing || !wallet}
        className="w-full rounded-lg bg-purple-600 px-6 py-4 font-semibold text-white transition-colors hover:bg-purple-500 disabled:cursor-not-allowed disabled:opacity-50"
      >
        {isProcessing ? (
          <span className="flex items-center justify-center gap-2">
            <svg className="h-4 w-4 animate-spin" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path
                className="opacity-75"
                fill="currentColor"
                d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
              />
            </svg>
            Processing payment...
          </span>
        ) : (
          actionLabel
        )}
      </button>

      {error && <ErrorCard error={error} onDismiss={() => setError(null)} />}

      <div className="rounded-lg bg-purple-900/30 p-3 text-xs text-purple-300">
        <p>
          💡 <span className="font-semibold">Payment flow:</span> You'll approve spending in your{' '}
          {walletType === 'farcaster' ? 'Farcaster' : 'browser'} wallet, then we process your payment on Base.
        </p>
      </div>
    </div>
  )
}

/**
 * Encode transaction data for game generation payment
 * Used by both Farcaster and browser wallets
 */
function encodeFarcasterPayment(
  contractAddress: `0x${string}`,
  writerCoinAddress: `0x${string}`,
  userAddress: `0x${string}`,
  action: PaymentAction
): `0x${string}` {
  const selector = action === 'generate-game' ? '0x7c4f5c5b' : '0xd0e521c0'

  const encodedCoin = writerCoinAddress.slice(2).padStart(64, '0')
  const encodedUser = userAddress.slice(2).padStart(64, '0')

  return (selector + encodedCoin + encodedUser) as `0x${string}`
}
