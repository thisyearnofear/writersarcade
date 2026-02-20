'use client'

import { motion } from 'framer-motion'
import { Coins, Link as LinkIcon, Settings, Play, ArrowLeft } from 'lucide-react'

interface MiniAppMobileNavProps {
    step: 'select-coin' | 'input-article' | 'customize-game' | 'play-game'
    onBack: () => void
    canGoBack: boolean
}

export function MiniAppMobileNav({ step, onBack, canGoBack }: MiniAppMobileNavProps) {
    const steps = [
        { id: 'select-coin', icon: Coins, label: 'Origin' },
        { id: 'input-article', icon: LinkIcon, label: 'Load' },
        { id: 'customize-game', icon: Settings, label: 'Build' },
        { id: 'play-game', icon: Play, label: 'Arena' },
    ]

    return (
        <div className="fixed bottom-0 left-0 right-0 z-[100] md:hidden">
            {/* Background Blur / Gradient */}
            <div className="absolute inset-0 bg-[#0a0a14]/80 backdrop-blur-2xl border-t border-white/10" />
            
            <div className="relative flex items-center justify-between px-6 py-4">
                {/* Back Button - Positioned for easy thumb reach */}
                <div className="flex-1">
                    {canGoBack && (
                        <motion.button
                            initial={{ opacity: 0, scale: 0.8 }}
                            animate={{ opacity: 1, scale: 1 }}
                            whileTap={{ scale: 0.9 }}
                            onClick={onBack}
                            className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white/5 border border-white/10 text-purple-400"
                        >
                            <ArrowLeft className="h-5 w-5" strokeWidth={3} />
                        </motion.button>
                    )}
                </div>

                {/* Step Indicators */}
                <div className="flex flex-[2] items-center justify-center space-x-4">
                    {steps.map((s, idx) => {
                        const Icon = s.icon
                        const isActive = step === s.id
                        const isPast = steps.findIndex(x => x.id === step) > idx

                        return (
                            <div key={s.id} className="relative flex flex-col items-center">
                                <div className={`
                                    flex h-8 w-8 items-center justify-center rounded-xl transition-all duration-300
                                    ${isActive ? 'bg-purple-600 text-white shadow-[0_0_15px_rgba(168,85,247,0.5)] scale-110' : ''}
                                    ${isPast ? 'bg-green-500/20 text-green-400' : ''}
                                    ${!isActive && !isPast ? 'bg-white/5 text-white/20' : ''}
                                `}>
                                    <Icon className="h-4 w-4" />
                                </div>
                                {isActive && (
                                    <motion.span 
                                        layoutId="stepLabel"
                                        className="absolute -bottom-5 text-[8px] font-black uppercase tracking-widest text-purple-400 whitespace-nowrap"
                                    >
                                        {s.label}
                                    </motion.span>
                                )}
                            </div>
                        )
                    })}
                </div>

                {/* Action Area (Right) */}
                <div className="flex-1 flex justify-end">
                    <div className="h-1 w-8 rounded-full bg-white/5" />
                </div>
            </div>
            
            {/* Bottom Safe Area Padding for iOS */}
            <div className="h-[env(safe-area-inset-bottom)]" />
        </div>
    )
}
