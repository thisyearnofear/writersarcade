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
          const amount = paymentInfo.amount as string

          if (!contractAddress) {
            throw new Error('Invalid contract address received from server')
          }

          // Step 3: Check if approval is needed for ERC20 token
          // ERC20 tokens require approval before spending
          const approvalData = encodeERC20Approval(contractAddress, amount)
          
          try {
            const approvalTx = await wallet.sendTransaction({
              to: writerCoin.address as `0x${string}`,
              data: approvalData,
              chainId: 8453,
            })

            if (!approvalTx.success) {
              // If approval fails, it might already be approved, continue anyway
              console.warn('[PaymentFlow] Approval transaction failed, attempting payment anyway:', approvalTx.error)
            } else {
              console.log('[PaymentFlow] Approval transaction successful:', approvalTx.transactionHash)
            }
          } catch (approvalErr) {
            // Log but don't fail - might already be approved
            console.warn('[PaymentFlow] Approval error (continuing):', approvalErr)
            
            // Check if error indicates already approved
            const errorMessage = String(approvalErr)
            if (errorMessage.includes('already approved') || errorMessage.includes('allowance sufficient')) {
              console.log('[PaymentFlow] Token already approved, proceeding with payment')
            }
          }

          // Step 4: Encode transaction data based on action and wallet type
          let transactionData: `0x${string}`

          if (walletType === 'farcaster') {
            // Use Farcaster encoding
            transactionData = encodeFarcasterPayment(contractAddress, writerCoin.address, userAddress, action)
          } else {
            // Use browser wallet encoding (same as Farcaster for now)
            transactionData = encodeFarcasterPayment(contractAddress, writerCoin.address, userAddress, action)
          }

          // Step 5: Send transaction through wallet provider
          const txRequest: TransactionRequest = {
            to: contractAddress,
            data: transactionData,
            chainId: 8453,
          }

          console.log('[PaymentFlow] Sending transaction to:', contractAddress)
          console.log('[PaymentFlow] Transaction data:', transactionData)
          console.log('[PaymentFlow] Action:', action)
          console.log('[PaymentFlow] Writer coin:', writerCoin.address)
          console.log('[PaymentFlow] User address:', userAddress)
          console.log('[PaymentFlow] Amount:', amount)

          const txResult = await wallet.sendTransaction(txRequest)

          if (!txResult.success || !txResult.transactionHash) {
            const errorMsg = txResult.error || 'Transaction was rejected or failed'
            console.error('[PaymentFlow] Transaction failed:', errorMsg)
            
            // Provide helpful context for common errors
            if (errorMsg.includes('1002') || errorMsg.includes('execution reverted')) {
              throw new Error('Payment failed: Contract rejected the transaction. This could be due to: 1) Insufficient token balance, 2) Token not approved, 3) Wrong contract address, 4) Wrong function parameters. Error code: 1002. Contract: ' + contractAddress)
            }
            if (errorMsg.includes('insufficient balance') || errorMsg.includes('not enough funds')) {
              throw new Error('Payment failed: Insufficient token balance. Please ensure you have enough ' + writerCoin.symbol + ' tokens.')
            }
            if (errorMsg.includes('allowance') || errorMsg.includes('approval')) {
              throw new Error('Payment failed: Token approval required. Please approve the contract to spend your tokens first.')
            }
            if (errorMsg.includes('invalid address') || errorMsg.includes('address(0)')) {
              throw new Error('Payment failed: Invalid contract address. Please check the contract configuration.')
            }
            throw new Error(errorMsg)
          }

          // Step 6: Verify payment on backend
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
 * Encode ERC20 approval transaction
 * Approves contract to spend tokens on behalf of user
 */
function encodeERC20Approval(
  spenderAddress: `0x${string}`,
  amount: string
): `0x${string}` {
  // ERC20 approve function selector: approve(address,uint256)
  const selector = '0x095ea7b3'
  
  // Encode spender address (pad to 32 bytes)
  const encodedSpender = spenderAddress.slice(2).padStart(64, '0')
  
  // Encode amount (convert to hex and pad to 32 bytes)
  const amountBigInt = BigInt(amount)
  const encodedAmount = amountBigInt.toString(16).padStart(64, '0')
  
  return (selector + encodedSpender + encodedAmount) as `0x${string}`
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
  // Correct function selectors for WriterCoinPayment contract
  // payForGameGeneration(address,address) -> 0x7c4f5c5b
  // payForMinting(address,address) -> 0xd0e521c0
  const selector = action === 'generate-game' ? '0x7c4f5c5b' : '0xd0e521c0'
 
  const encodedCoin = writerCoinAddress.slice(2).padStart(64, '0')
  const encodedUser = userAddress.slice(2).padStart(64, '0')
 
  return (selector + encodedCoin + encodedUser) as `0x${string}`
}
