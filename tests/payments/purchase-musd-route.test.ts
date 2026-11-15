import { describe, it, expect, vi, beforeEach } from 'vitest'

const mockGetActor = vi.fn()
vi.mock('@/services/auth', () => ({ getActor: () => mockGetActor() }))

const mockVerifyMusd = vi.fn()
const mockMezoHolder = vi.fn()
vi.mock('@/services/payments/payment-verifier', () => ({
  verifyMusdTreasuryTransfer: (...args: unknown[]) => mockVerifyMusd(...args),
  isMezoHolderOnChain: (...args: unknown[]) => mockMezoHolder(...args),
}))

const mockFindUnique = vi.fn()
vi.mock('@/lib/prisma', () => ({
  prisma: { payment: { findUnique: (...args: unknown[]) => mockFindUnique(...args) } },
}))

vi.mock('@/lib/config', () => ({
  logger: { payment: vi.fn(), error: vi.fn(), info: vi.fn(), warn: vi.fn() },
}))
vi.mock('@/services/error-reporting', () => ({ reportServerError: vi.fn() }))

import type { NextRequest } from 'next/server'
import { POST } from '@/app/api/credits/purchase-musd/route'

const USER = '0xAb5801a7D398351b8bE11C439e05C5B3259aeC9B'
const TX_HASH = '0x' + 'a'.repeat(64)

function makeRequest(body: unknown): NextRequest {
  return new Request('http://localhost:3000/api/credits/purchase-musd', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  }) as unknown as NextRequest
}

describe('POST /api/credits/purchase-musd — unknown tx', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockGetActor.mockResolvedValue({ identity: 'wallet', user: { id: 'u1', walletAddress: USER } })
    mockFindUnique.mockResolvedValue(null)
    mockVerifyMusd.mockRejectedValue(new Error('Transaction receipt could not be found on chain 31611'))
  })

  it('returns 409 TX_NOT_CONFIRMED instead of a 500', async () => {
    const res = await POST(makeRequest({ transactionHash: TX_HASH, chainId: 31611 }))
    expect(res.status).toBe(409)
    const body = await res.json()
    expect(body.code).toBe('TX_NOT_CONFIRMED')
  })
})
