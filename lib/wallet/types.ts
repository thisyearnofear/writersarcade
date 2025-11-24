/**
 * Wallet Abstraction Types
 * 
 * Unified interface for wallet providers (Farcaster, MetaMask, etc.)
 * Enables web app + mini app to use identical payment flows
 */

export type WalletType = 'farcaster' | 'metamask' | 'walletconnect'

export interface TransactionRequest {
  to: `0x${string}`
  data: `0x${string}`
  value?: string
  chainId?: number
}

export interface TransactionResult {
  transactionHash: `0x${string}`
  success: boolean
  error?: string
}

export interface WalletProvider {
  /** Unique identifier for this wallet provider */
  type: WalletType

  /** Check if provider is available in current environment */
  isAvailable(): Promise<boolean>

  /** Get user's wallet address */
  getAddress(): Promise<`0x${string}` | null>

  /** Send transaction and return hash */
  sendTransaction(request: TransactionRequest): Promise<TransactionResult>

  /** Get chain ID this wallet is connected to */
  getChainId(): Promise<number>

  /** Optional: Listen for account changes */
  onAccountChange?(callback: (address: string | null) => void): void

  /** Optional: Switch to a different chain */
  switchChain?(chainId: number): Promise<boolean>
}

export interface WalletDetectionResult {
  provider: WalletProvider | null
  type: WalletType | null
  available: boolean
}
