import { describe, it, expect, vi, beforeEach } from 'vitest'

// Stub only createPublicClient — the rest of viem (encoding, keccak) stays real.
const mockClient = {
  getTransactionReceipt: vi.fn(),
  getTransaction: vi.fn(),
}
vi.mock('viem', async (importActual) => {
  const actual = await importActual<typeof import('viem')>()
  return { ...actual, createPublicClient: () => mockClient }
})

import { verifyMusdTreasuryTransfer, verifyOnChainPayment } from '@/services/payments/payment-verifier'

const USER = '0xAb5801a7D398351b8bE11C439e05C5B3259aeC9B'
const TX_HASH = ('0x' + 'a'.repeat(64)) as `0x${string}`

describe('on-chain verifier — unknown / unindexed transaction', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockClient.getTransactionReceipt.mockResolvedValue(null)
    mockClient.getTransaction.mockResolvedValue(null)
  })

  it('verifyMusdTreasuryTransfer throws a mapped 4xx message, not a TypeError', async () => {
    await expect(
      verifyMusdTreasuryTransfer({ transactionHash: TX_HASH, userAddress: USER, chainId: 31611 })
    ).rejects.toThrow(/could not be found/i)
  })

  it('verifyOnChainPayment throws a mapped 4xx message, not a TypeError', async () => {
    await expect(
      verifyOnChainPayment({
        transactionHash: TX_HASH,
        writerCoinId: 'musd-testnet',
        userAddress: USER,
        action: 'generate-game',
        chainId: 31611,
      })
    ).rejects.toThrow(/could not be found/i)
  })
})
