'use client'

import { WRITER_COINS, type WriterCoin, MUSD_CONFIG } from '@/lib/writer-coins'
import { motion } from 'framer-motion'
import { Sparkles, Zap } from 'lucide-react'
import { cn } from '@/lib/utils'

interface WriterCoinSelectorProps {
    onSelect: (coin: WriterCoin | { type: 'musd' }) => void
}

/**
 * Stylized MUSD Logo
 */
const MUSDLogo = ({ className }: { className?: string }) => (
    <div className={cn("flex items-center justify-center bg-warning rounded-xl text-black font-black text-xl w-12 h-12 shadow-lg shadow-warning/20 ring-1 ring-warning/50", className)}>
        M
    </div>
)

export function WriterCoinSelector({ onSelect }: WriterCoinSelectorProps) {
    const musdConfig = MUSD_CONFIG.testnet

    return (
        <div className="space-y-6">
            <div className="space-y-1">
                <h2 className="text-2xl font-black text-white uppercase italic tracking-tight">Select Origin</h2>
                <p className="text-sm text-brand/80">
                    Choose which ecosystem will power this generation
                </p>
            </div>

            <div className="grid gap-4">
                {/* Mezo MUSD Track - Highlighted for Hackathon */}
                <motion.button
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    whileHover={{ scale: 1.02, x: 4 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={() => onSelect({ type: 'musd' })}
                    className="group relative overflow-hidden rounded-2xl border border-warning/30 bg-warning/10 p-5 text-left transition-all hover:border-warning hover:bg-warning/20"
                >
                    {/* Hackathon Badge */}
                    <div className="absolute top-0 right-0 bg-warning text-black px-3 py-1 text-[10px] font-black uppercase tracking-widest rounded-bl-xl flex items-center gap-1 shadow-sm">
                        <Zap className="w-3 h-3 fill-current" />
                        Hackathon Track
                    </div>

                    <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-4">
                            <MUSDLogo className="group-hover:scale-110 transition-transform duration-300" />
                            <div>
                                <div className="flex items-center space-x-2">
                                    <h3 className="text-lg font-bold text-white group-hover:text-warning transition-colors">Mezo MUSD</h3>
                                    <span className="rounded-full bg-warning/20 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-warning ring-1 ring-warning/30">
                                        $MUSD
                                    </span>
                                </div>
                                <p className="text-sm text-warning/60">
                                    by <span className="font-semibold text-warning/80">Mezo Network</span>
                                </p>
                            </div>
                        </div>

                        <div className="flex flex-col items-end space-y-1 text-right">
                            <div className="text-[10px] font-bold uppercase tracking-widest text-warning/60">Generate Cost</div>
                            <div className="font-mono text-sm font-bold text-warning">
                                {(Number(musdConfig.gameGenerationCost) / 10 ** musdConfig.decimals).toFixed(0)} {musdConfig.symbol}
                            </div>
                        </div>
                    </div>

                    <div className="mt-4 flex items-center space-x-4 border-t border-warning/10 pt-4">
                        <div className="flex flex-col">
                            <span className="text-[9px] font-bold uppercase tracking-widest text-warning/40">Network</span>
                            <span className="text-xs font-medium text-warning/70">Mezo Matsnet</span>
                        </div>
                        <div className="h-4 w-px bg-warning/10" />
                        <div className="flex flex-col">
                            <span className="text-[9px] font-bold uppercase tracking-widest text-warning/40">Perks</span>
                            <span className="flex items-center space-x-1 text-xs font-medium text-warning/80">
                                <Sparkles className="w-3 h-3" />
                                <span>MEZO Holder Rewards</span>
                            </span>
                        </div>
                    </div>
                </motion.button>

                <div className="relative py-2">
                    <div className="absolute inset-0 flex items-center" aria-hidden="true">
                        <div className="w-full border-t border-white/5"></div>
                    </div>
                    <div className="relative flex justify-center text-[10px] font-bold uppercase tracking-widest">
                        <span className="bg-background px-3 text-brand/40">Classic Writer Coins</span>
                    </div>
                </div>

                {WRITER_COINS.map((coin, index) => (
                    <motion.button
                        key={coin.id}
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: index * 0.1 }}
                        whileHover={{ scale: 1.02, x: 4 }}
                        whileTap={{ scale: 0.98 }}
                        onClick={() => onSelect(coin)}
                        className="group relative overflow-hidden rounded-2xl border border-white/10 bg-white/5 p-5 text-left transition-all hover:border-brand/50 hover:bg-white/10"
                    >
                        {/* Hover Gradient Effect */}
                        <div className="absolute inset-0 -z-10 bg-gradient-to-r from-brand/0 via-brand/0 to-brand/10 opacity-0 transition-opacity group-hover:opacity-100" />

                        <div className="flex items-center justify-between">
                            <div className="flex items-center space-x-4">
                                <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-brand/20 text-2xl font-black text-brand ring-1 ring-brand/30 group-hover:bg-brand/30 group-hover:text-foreground transition-colors">
                                    {coin.symbol.slice(0, 1)}
                                </div>
                                <div>
                                    <div className="flex items-center space-x-2">
                                        <h3 className="text-lg font-bold text-white group-hover:text-brand transition-colors">{coin.name}</h3>
                                        <span className="rounded-full bg-brand/20 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-brand ring-1 ring-brand/30">
                                            {coin.symbol}
                                        </span>
                                    </div>
                                    <p className="text-sm text-brand/60">
                                        by <span className="font-semibold text-brand/80">{coin.writer}</span>
                                    </p>
                                </div>
                            </div>

                            <div className="flex flex-col items-end space-y-1 text-right">
                                <div className="text-[10px] font-bold uppercase tracking-widest text-brand/60">Generate Cost</div>
                                <div className="font-mono text-sm font-bold text-white">
                                    {(Number(coin.gameGenerationCost) / 10 ** coin.decimals).toFixed(0)} {coin.symbol}
                                </div>
                            </div>
                        </div>

                        {/* Stats Section */}
                        <div className="mt-4 flex items-center space-x-4 border-t border-white/5 pt-4">
                            <div className="flex flex-col">
                                <span className="text-[9px] font-bold uppercase tracking-widest text-brand/40">Mint Price</span>
                                <span className="text-xs font-medium text-brand/70">
                                    {(Number(coin.mintCost) / 10 ** coin.decimals).toFixed(0)} {coin.symbol}
                                </span>
                            </div>
                            <div className="h-4 w-px bg-white/5" />
                            <div className="flex flex-col">
                                <span className="text-[9px] font-bold uppercase tracking-widest text-brand/40">Status</span>
                                <span className="flex items-center space-x-1 text-xs font-medium text-success/70">
                                    <span className="h-1 w-1 rounded-full bg-success" />
                                    <span>Verified</span>
                                </span>
                            </div>
                        </div>
                    </motion.button>
                ))}
            </div>

            <div className="rounded-2xl bg-brand/5 p-4 border border-brand/10">
                <div className="flex items-start space-x-3">
                    <div className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-brand/20 text-[10px] font-bold text-brand ring-1 ring-brand/30">
                        !
                    </div>
                    <p className="text-xs leading-relaxed text-brand/70">
                        <span className="font-bold text-brand">PROTOCOL NOTE:</span> Select an origin to authorize the generation process. Each ecosystem has unique rewards and on-chain features.
                    </p>
                </div>
            </div>
        </div>
    )
}