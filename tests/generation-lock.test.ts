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

  it('throws when another request holds the lock and it fails', async () => {
    const { withSharedGenerationLock } = await import('@/lib/generation-lock')
    mockCreate.mockRejectedValue({ code: 'P2002' })
    mockFindUnique.mockResolvedValue({ id: 'lock-4', status: 'failed', expiresAt: new Date(Date.now() + 1000), resultData: null })

    const fn = vi.fn()
    await expect(withSharedGenerationLock('key-4', fn, { pollMs: 10, waitMs: 100 })).rejects.toThrow('Generation failed')
    expect(fn).not.toHaveBeenCalled()
  })
})
