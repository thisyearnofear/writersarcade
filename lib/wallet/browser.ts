/**
 * Browser Wallet Provider
 * 
 * Implements WalletProvider interface for browser-based wallets
 * (MetaMask, Coinbase Wallet, WalletConnect, etc.)
 * 
 * Used in web app environment. Can be extended to support multiple wallet connectors.
 */

import type { WalletProvider, TransactionRequest, TransactionResult } from './types'

export class BrowserWalletProvider implements WalletProvider {
  type = 'metamask' as const
  private accountChangeListeners: ((address: string | null) => void)[] = []

  async isAvailable(): Promise<boolean> {
    try {
      if (typeof window === 'undefined') return false
      const ethereum = (window as any).ethereum
      return !!ethereum && !!ethereum.isMetaMask
    } catch {
      return false
    }
  }

  async getAddress(): Promise<`0x${string}` | null> {
    try {
      if (typeof window === 'undefined') return null
      const ethereum = (window as any).ethereum
      if (!ethereum) return null

      const accounts = await ethereum.request({ method: 'eth_accounts' })
      if (accounts && accounts.length > 0) {
        return accounts[0].toLowerCase() as `0x${string}`
      }
      return null
    } catch (error) {
      console.error('[BrowserWallet] Failed to get address:', error)
      return null
    }
  }

  async sendTransaction(request: TransactionRequest): Promise<TransactionResult> {
    try {
      if (typeof window === 'undefined') {
        return {
          transactionHash: '0x',
          success: false,
          error: 'Browser wallet not available in server environment',
        }
      }

      const ethereum = (window as any).ethereum
      if (!ethereum) {
        return {
          transactionHash: '0x',
          success: false,
          error: 'MetaMask or compatible wallet not found',
        }
      }

      // Ensure we're on the right chain (Base = 8453)
      const targetChainId = request.chainId || 8453
      const currentChainId = await this.getChainId()

      if (currentChainId !== targetChainId) {
        const switched = await this.switchChain?.(targetChainId)
        if (!switched) {
          throw new Error(`Please switch to Base network (chain ID ${targetChainId})`)
        }
      }

      const txHash = await ethereum.request({
        method: 'eth_sendTransaction',
        params: [
          {
            to: request.to,
            data: request.data,
            value: request.value || '0x0',
            from: await this.getAddress(),
          },
        ],
      })

      if (!txHash || typeof txHash !== 'string') {
        throw new Error('Transaction failed - no hash returned')
      }

      return {
        transactionHash: txHash as `0x${string}`,
        success: true,
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error'
      console.error('[BrowserWallet] Transaction error:', errorMessage)

      return {
        transactionHash: '0x',
        success: false,
        error: errorMessage,
      }
    }
  }

  async getChainId(): Promise<number> {
    try {
      if (typeof window === 'undefined') return 8453
      const ethereum = (window as any).ethereum
      if (!ethereum) return 8453

      const chainIdHex = await ethereum.request({ method: 'eth_chainId' })
      return parseInt(chainIdHex, 16)
    } catch (error) {
      console.error('[BrowserWallet] Failed to get chain ID:', error)
      return 8453 // Default to Base
    }
  }

  async switchChain(chainId: number): Promise<boolean> {
    try {
      if (typeof window === 'undefined') return false
      const ethereum = (window as any).ethereum
      if (!ethereum) return false

      const chainIdHex = '0x' + chainId.toString(16)

      await ethereum.request({
        method: 'wallet_switchEthereumChain',
        params: [{ chainId: chainIdHex }],
      })

      return true
    } catch (error) {
      console.error('[BrowserWallet] Failed to switch chain:', error)
      return false
    }
  }

  onAccountChange(callback: (address: string | null) => void): void {
    try {
      if (typeof window === 'undefined') return
      const ethereum = (window as any).ethereum
      if (!ethereum) return

      this.accountChangeListeners.push(callback)

      ethereum.on('accountsChanged', async (accounts: string[]) => {
        const address = accounts.length > 0 ? (accounts[0].toLowerCase() as `0x${string}`) : null
        callback(address)
      })
    } catch (error) {
      console.error('[BrowserWallet] Failed to set up account change listener:', error)
    }
  }
}

export const browserProvider = new BrowserWalletProvider()
