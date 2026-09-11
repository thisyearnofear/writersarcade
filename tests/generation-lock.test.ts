import { describe, it, expect, vi, beforeEach } from 'vitest'

const mockCreate = vi.fn()
const mockFindUnique = vi.fn()
const mockUpdate = vi.fn()
const mockUpdateMany = vi.fn()

vi.mock('@/lib/database', () => ({
  prisma: {
    generationLock: {
      create: (...args: unknown[]) => mockCreate(...args),
      findUnique: (...args: unknown[]) => mockFindUnique(...args),
      update: (...args: unknown[]) => mockUpdate(...args),
      updateMany: (...args: unknown[]) => mockUpdateMany(...args),
    },
  },
}))

beforeEach(() => {
  vi.clearAllMocks()
})

describe('withSharedGenerationLock', () => {
  it('executes the function and stores the result when it acquires the lock', async () => {
    const { withSharedGenerationLock } = await import('@/lib/generation-lock')
    mockCreate.mockResolvedValue({ id: 'lock-1' })
    mockUpdate.mockResolvedValue({ id: 'lock-1' })

    const fn = vi.fn().mockResolvedValue({ title: 'Generated Game' })
    const result = await withSharedGenerationLock('key-1', fn, { ttlMs: 1000 })

    expect(result).toEqual({ title: 'Generated Game' })
    expect(fn).toHaveBeenCalledTimes(1)
    expect(mockCreate).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.objectContaining({ key: 'key-1', status: 'pending' }),
    }))
    expect(mockUpdate).toHaveBeenCalledWith(expect.objectContaining({
      where: { id: 'lock-1' },
      data: expect.objectContaining({ status: 'completed' }),
    }))
  })

  it('polls an existing lock and returns the stored result', async () => {
    const { withSharedGenerationLock } = await import('@/lib/generation-lock')
    mockCreate.mockRejectedValue({ code: 'P2002' })
    mockFindUnique
      .mockResolvedValueOnce({ id: 'lock-2', status: 'pending', expiresAt: new Date(Date.now() + 1000), resultData: null })
      .mockResolvedValueOnce({ id: 'lock-2', status: 'completed', expiresAt: new Date(Date.now() + 1000), resultData: { title: 'Shared Game' } })

    const fn = vi.fn()
    const result = await withSharedGenerationLock('key-2', fn, { pollMs: 10, waitMs: 1000 })

    expect(result).toEqual({ title: 'Shared Game' })
    expect(fn).not.toHaveBeenCalled()
    expect(mockFindUnique).toHaveBeenCalledWith({ where: { key: 'key-2' } })
  })

  it('takes over an expired pending lock and runs the function', async () => {
    const { withSharedGenerationLock } = await import('@/lib/generation-lock')
    mockCreate.mockRejectedValue({ code: 'P2002' })
    mockFindUnique.mockResolvedValue({ id: 'lock-3', status: 'pending', expiresAt: new Date(Date.now() - 1000), resultData: null })
    mockUpdateMany.mockResolvedValue({ count: 1 })
    mockUpdate.mockResolvedValue({ id: 'lock-3' })

    const fn = vi.fn().mockResolvedValue({ title: 'Recovered Game' })
    const result = await withSharedGenerationLock('key-3', fn, { pollMs: 10, waitMs: 1000, ttlMs: 1000 })

    expect(result).toEqual({ title: 'Recovered Game' })
    expect(fn).toHaveBeenCalledTimes(1)
    expect(mockUpdateMany).toHaveBeenCalledWith(expect.objectContaining({
      where: expect.objectContaining({ id: 'lock-3' }),
    }))
  })

  it('takes over a failed lock after its retry window and reruns the function', async () => {
    const { withSharedGenerationLock } = await import('@/lib/generation-lock')
    mockCreate.mockRejectedValue({ code: 'P2002' })
    mockFindUnique.mockResolvedValue({
      id: 'lock-4',
      status: 'failed',
      errorMessage: 'AI provider quota exhausted',
      expiresAt: new Date(Date.now() - 1000),
      resultData: null,
    })
    mockUpdateMany.mockResolvedValue({ count: 1 })
    mockUpdate.mockResolvedValue({ id: 'lock-4' })

    const fn = vi.fn().mockResolvedValue({ title: 'Recovered Game' })
    const result = await withSharedGenerationLock('key-4', fn, { pollMs: 10, waitMs: 1000, ttlMs: 1000 })

    expect(result).toEqual({ title: 'Recovered Game' })
    expect(fn).toHaveBeenCalledTimes(1)
  })

  it('surfaces the stored error when a failed lock never frees before the wait deadline', async () => {
    const { withSharedGenerationLock } = await import('@/lib/generation-lock')
    mockCreate.mockRejectedValue({ code: 'P2002' })
    // Failed but not yet expired — and updateMany never wins, so the waiter times out.
    mockFindUnique.mockResolvedValue({
      id: 'lock-5',
      status: 'failed',
      errorMessage: 'AI generation failed: Venice is down',
      expiresAt: new Date(Date.now() + 60_000),
      resultData: null,
    })
    mockUpdateMany.mockResolvedValue({ count: 0 })

    const fn = vi.fn()
    await expect(
      withSharedGenerationLock('key-5', fn, { pollMs: 10, waitMs: 100 })
    ).rejects.toThrow('Venice is down')
    expect(fn).not.toHaveBeenCalled()
  })

  it('records the underlying error message when the owner fails', async () => {
    const { withSharedGenerationLock } = await import('@/lib/generation-lock')
    mockCreate.mockResolvedValue({ id: 'lock-6' })
    mockUpdate.mockResolvedValue({ id: 'lock-6' })

    const fn = vi.fn().mockRejectedValue(new Error('boom'))
    await expect(withSharedGenerationLock('key-6', fn, { ttlMs: 1000 })).rejects.toThrow('boom')

    expect(mockUpdate).toHaveBeenCalledWith(expect.objectContaining({
      where: { id: 'lock-6' },
      data: expect.objectContaining({ status: 'failed', errorMessage: 'boom' }),
    }))
  })
})
