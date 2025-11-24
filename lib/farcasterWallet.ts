/**
 * Farcaster Wallet Integration
 * 
 * Handles all interactions with the Farcaster Wallet for transaction signing
 * and payment processing on Base network.
 */

import { sdk } from '@farcaster/miniapp-sdk'

export interface TransactionRequest {
  to: string
  data: string
  value?: string
}

export interface SendTransactionResult {
  transactionHash: string
  success: boolean
  error?: string
}

/**
 * Send a transaction through Farcaster Wallet
 * 
 * @param request - Transaction request object with to, data, and optional value
 * @returns Transaction hash or error
 */
export async function sendTransaction(
  request: TransactionRequest
): Promise<SendTransactionResult> {
  try {
    // Validate request
    if (!request.to || !request.data) {
      throw new Error('Invalid transaction request: missing to or data')
    }

    // Ensure proper hex formatting
    if (!request.to.startsWith('0x') || request.to.length !== 42) {
      throw new Error('Invalid to address format')
    }

    if (!request.data.startsWith('0x')) {
      throw new Error('Invalid data format - must start with 0x')
    }

    // Build transaction for Farcaster Wallet
    const txRequest = {
      to: request.to as `0x${string}`,
      data: request.data as `0x${string}`,
      value: request.value || '0',
      chainId: 8453, // Base mainnet
    }

    console.log('Sending transaction via Farcaster Wallet:', txRequest)

    // Send transaction through Farcaster SDK
    const result = await sdk.actions.sendTransaction(txRequest)

    if (!result || !result.transactionHash) {
      throw new Error('Transaction failed - no hash returned')
    }

    return {
      transactionHash: result.transactionHash,
      success: true,
    }
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'
    console.error('Farcaster Wallet transaction error:', errorMessage)

    return {
      transactionHash: '',
      success: false,
      error: errorMessage,
    }
  }
}

/**
 * Prepare transaction data for game generation payment
 * 
 * @param contractAddress - WriterCoinPayment contract address
 * @param writerCoinAddress - ERC-20 token address
 * @param userAddress - User's wallet address
 * @returns Encoded transaction data
 */
export function encodePayForGameGeneration(
  contractAddress: string,
  writerCoinAddress: string,
  userAddress: string
): string {
  // Function signature: payForGameGeneration(address writerCoin, address user)
  // Selector: 0x7c4f5c5b (calculated from keccak256("payForGameGeneration(address,address)"))
  
  const selector = '0x7c4f5c5b'
  
  // Encode parameters
  const encodedCoin = writerCoinAddress.slice(2).padStart(64, '0')
  const encodedUser = userAddress.slice(2).padStart(64, '0')
  
  return selector + encodedCoin + encodedUser
}

/**
 * Prepare transaction data for NFT minting payment
 * 
 * @param contractAddress - WriterCoinPayment contract address
 * @param writerCoinAddress - ERC-20 token address
 * @param userAddress - User's wallet address
 * @returns Encoded transaction data
 */
export function encodePayForMinting(
  contractAddress: string,
  writerCoinAddress: string,
  userAddress: string
): string {
  // Function signature: payForMinting(address writerCoin, address user)
  // Selector: 0xd0e521c0 (calculated from keccak256("payForMinting(address,address)"))
  
  const selector = '0xd0e521c0'
  
  // Encode parameters
  const encodedCoin = writerCoinAddress.slice(2).padStart(64, '0')
  const encodedUser = userAddress.slice(2).padStart(64, '0')
  
  return selector + encodedCoin + encodedUser
}

/**
 * Check if Farcaster Wallet is available
 */
export function isFarcasterWalletAvailable(): boolean {
  try {
    return sdk && sdk.actions && typeof sdk.actions.sendTransaction === 'function'
  } catch {
    return false
  }
}

/**
 * Get user's wallet address from Farcaster context
 */
export async function getUserWalletAddress(): Promise<string | null> {
  try {
    const context = await sdk.context
    if (context?.user?.walletAddress) {
      return context.user.walletAddress
    }
    return null
  } catch (error) {
    console.error('Failed to get wallet address:', error)
    return null
  }
}
