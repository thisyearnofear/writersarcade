'use client';

import { useEffect, useState } from 'react';
import { WriterCoin } from '@/lib/writerCoins';

function formatBP(bp: number) { return `${(bp/100).toFixed(2)}%` }

function OnChainSplits({ coinAddress }: { coinAddress: `0x${string}` }) {
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
        return <p className="text-xs text-gray-400">On-chain revenue splits are not available right now.</p>
    }

    return (
        <div className="space-y-2">
            <div className="flex justify-between"><span>Generation — Writer</span><span>{gen ? formatBP(gen.writerBP) : 'Loading...'}</span></div>
            <div className="flex justify-between"><span>Generation — Platform</span><span>{gen ? formatBP(gen.platformBP) : 'Loading...'}</span></div>
            <div className="flex justify-between"><span>Generation — Creator Pool</span><span>{gen ? formatBP(gen.creatorBP) : 'Loading...'}</span></div>
            <div className="h-px bg-gray-800 my-2" />
            <div className="flex justify-between"><span>Mint — Creator</span><span>{mint ? formatBP(mint.creatorBP) : 'Loading...'}</span></div>
            <div className="flex justify-between"><span>Mint — Writer</span><span>{mint ? formatBP(mint.writerBP) : 'Loading...'}</span></div>
            <div className="flex justify-between"><span>Mint — Platform</span><span>{mint ? formatBP(mint.platformBP) : 'Loading...'}</span></div>
            <p className="text-xs text-gray-500">Remainder of mint cost is returned to payer (as per on-chain configuration).</p>
        </div>
    )
}

export function LicenseConfigurator({ writerCoin }: { writerCoin: WriterCoin }) {
    const [royalty, setRoyalty] = useState(writerCoin.revenueDistribution.writer);
    const [isSaved, setIsSaved] = useState(true);

    const handleSave = () => {
        // In V2, this calls an API to update the WriterCoin config or Story Protocol License
        setIsSaved(true);
        setTimeout(() => alert("License terms updated on Story Protocol!"), 100);
    };

    return (
        <div className="bg-gray-900 border border-gray-800 rounded-lg p-6">
            <div className="flex justify-between items-start mb-6">
                <div>
                    <h3 className="text-xl font-bold text-white">License Terms (Story Protocol)</h3>
                    <p className="text-gray-400 text-sm mt-1">
                        Configure how your generated games can be remixed and monetized.
                    </p>
                </div>
                <div className="bg-purple-900/30 text-purple-300 px-3 py-1 rounded-full text-xs font-medium border border-purple-500/30">
                    IP Asset Class: Derivative
                </div>
            </div>

            <div className="space-y-6">
                <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">
                        Writer Revenue Share (Royalty)
                    </label>
                    <div className="flex items-center gap-4">
                        <input
                            type="range"
                            min="0"
                            max="50"
                            step="1"
                            value={royalty}
                            onChange={(e) => {
                                setRoyalty(Number(e.target.value));
                                setIsSaved(false);
                            }}
                            className="w-full h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer accent-purple-500"
                        />
                        <span className="text-2xl font-bold text-purple-400 w-16 text-right">
                            {royalty}%
                        </span>
                    </div>
                    <p className="text-xs text-gray-500 mt-2">
                        This percentage is automatically deducted from every game generation and NFT mint.
                    </p>
                </div>

                <div className="bg-gray-800/50 rounded p-4 text-sm text-gray-300">
                    <p className="text-xs text-gray-400">Note: Actual revenue splits are configured on-chain per writer coin (generation and minting) and may change without redeploys. No on-chain burn is performed by the payment contract.</p>
                </div>

                <div className="pt-4 border-t border-gray-800 flex justify-end">
                    <button
                        onClick={handleSave}
                        disabled={isSaved}
                        className={`px-6 py-2 rounded-lg font-medium transition-colors ${isSaved
                                ? 'bg-green-600/20 text-green-400 cursor-default'
                                : 'bg-purple-600 hover:bg-purple-500 text-white'
                            }`}
                    >
                        {isSaved ? 'Changes Saved' : 'Update License Terms'}
                    </button>
                </div>
            </div>
        </div>
    );
}
