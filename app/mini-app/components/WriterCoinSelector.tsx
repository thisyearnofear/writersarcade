'use client'

import { useEffect, useState } from 'react'

import { WRITER_COINS, type WriterCoin } from '@/lib/writerCoins'

interface WriterCoinSelectorProps {
    onSelect: (coin: WriterCoin) => void
}

function formatBP(bp: number) { return `${(bp/100).toFixed(2)}%` }

function OnChainSplit({ coinAddress }: { coinAddress: `0x${string}` }) {
    const [gen, setGen] = useState<{ writerBP: number; platformBP: number; creatorBP: number } | null>(null)
    const [mint, setMint] = useState<{ writerBP: number; platformBP: number; creatorBP: number } | null>(null)
    const [error, setError] = useState<string | null>(null)

    useEffect(() => {
        let cancelled = false
        ;(async () => {
            try {
                const { fetchGenerationDistributionOnChain, fetchMintDistributionOnChain } = await import('@/lib/contracts')
                const genRes = await fetchGenerationDistributionOnChain(coinAddress)
                const mintResRaw = await fetchMintDistributionOnChain(coinAddress)
                const mintRes = { writerBP: mintResRaw.writerBP, platformBP: mintResRaw.platformBP, creatorBP: mintResRaw.creatorBP }
                if (!cancelled) { setGen(genRes); setMint(mintRes) }
            } catch (e) {
                if (!cancelled) setError('On-chain split unavailable')
            }
        })()
        return () => { cancelled = true }
    }, [coinAddress])

    if (error) {
        return (
            <p className="text-xs text-purple-200">
                <span className="font-semibold">Revenue:</span> On-chain configurable per coin (unavailable to load).
            </p>
        )
    }

    return (
        <div className="text-xs text-purple-200 space-y-1">
            <div>
                <span className="font-semibold">Generation:</span>{' '}
                {gen ? (
                    <>
                        Writer {formatBP(gen.writerBP)} • Platform {formatBP(gen.platformBP)} • Creator Pool {formatBP(gen.creatorBP)}
                    </>
                ) : (
                    'Loading...'
                )}
            </div>
            <div>
                <span className="font-semibold">Minting:</span>{' '}
                {mint ? (
                    <>
                        Creator {formatBP(mint.creatorBP)} • Writer {formatBP(mint.writerBP)} • Platform {formatBP(mint.platformBP)} • Remainder to payer
                    </>
                ) : (
                    'Loading...'
                )}
            </div>
        </div>
    )
}

export function WriterCoinSelector({ onSelect }: WriterCoinSelectorProps) {
    return (
        <div>
            <h2 className="mb-2 text-2xl font-bold text-white">Select Writer Coin</h2>
            <p className="mb-6 text-purple-200">
                Choose which writer coin you'll use to generate your game
            </p>

            <div className="space-y-4">
                {WRITER_COINS.map((coin) => (
                    <button
                        key={coin.id}
                        onClick={() => onSelect(coin)}
                        className="w-full rounded-lg border-2 border-purple-500/30 bg-white/5 p-6 text-left transition-all hover:border-purple-400 hover:bg-white/10 hover:shadow-lg"
                    >
                        <div className="flex items-start justify-between">
                            <div className="flex-1">
                                <div className="mb-2 flex items-center space-x-3">
                                    <span className="text-2xl font-bold text-purple-300">
                                        {coin.symbol}
                                    </span>
                                    <span className="rounded-full bg-purple-500/20 px-3 py-1 text-xs text-purple-200">
                                        {coin.name}
                                    </span>
                                </div>

                                <p className="mb-3 text-sm text-purple-100">
                                    by <span className="font-semibold">{coin.writer}</span>
                                </p>

                                <div className="space-y-1 text-xs text-purple-300">
                                    <div className="flex items-center justify-between">
                                        <span>Game Generation:</span>
                                        <span className="font-mono font-semibold text-purple-200">
                                            {(Number(coin.gameGenerationCost) / 10 ** coin.decimals).toFixed(0)} {coin.symbol}
                                        </span>
                                    </div>
                                    <div className="flex items-center justify-between">
                                        <span>NFT Minting:</span>
                                        <span className="font-mono font-semibold text-purple-200">
                                            {(Number(coin.mintCost) / 10 ** coin.decimals).toFixed(0)} {coin.symbol}
                                        </span>
                                    </div>
                                </div>
                            </div>

                            <div className="ml-4">
                                <svg
                                    className="h-6 w-6 text-purple-400"
                                    fill="none"
                                    viewBox="0 0 24 24"
                                    stroke="currentColor"
                                >
                                    <path
                                        strokeLinecap="round"
                                        strokeLinejoin="round"
                                        strokeWidth={2}
                                        d="M9 5l7 7-7 7"
                                    />
                                </svg>
                            </div>
                        </div>

                        <div className="mt-4 rounded-md bg-purple-900/30 p-3">
                            <p className="text-xs text-purple-200">
                                <span className="font-semibold">Revenue:</span> On-chain, configurable per coin for generation and minting.{' '}
                               
                            </p>
                        </div>
                    </button>
                ))}

                {WRITER_COINS.length === 0 && (
                    <div className="rounded-lg bg-yellow-500/10 p-6 text-center">
                        <p className="text-yellow-200">No writer coins configured yet</p>
                    </div>
                )}
            </div>

            <div className="mt-6 rounded-lg bg-purple-900/30 p-4">
                <p className="text-xs text-purple-300">
                    💡 <span className="font-semibold">How it works:</span> Select a writer coin to generate games from that writer's articles. You'll pay in their token, and they'll earn revenue from your game creation!
                </p>
            </div>
        </div>
    )
}
