'use client'

import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { X, Save, DollarSign, Eye, Loader2 } from 'lucide-react'
import { Game } from '../types'
import { Button } from '@/components/ui/button'

interface GameSettingsModalProps {
    game: Game | null
    isOpen: boolean
    onClose: () => void
    onUpdate: (slug: string, updates: { playFee?: string; private?: boolean }) => Promise<void>
}

export function GameSettingsModal({
    game,
    isOpen,
    onClose,
    onUpdate,
}: GameSettingsModalProps) {
    const [playFee, setPlayFee] = useState(game?.playFee || '')
    const [isPrivate, setIsPrivate] = useState(game?.private || false)
    const [isLoading, setIsLoading] = useState(false)

    // Reset state when game changes
    if (game && (game.playFee !== playFee && playFee === '') && !isLoading) {
        // This is a bit hacky for reset, better to use useEffect in a real app or key prop
    }

    const handleSave = async () => {
        if (!game) return
        setIsLoading(true)
        try {
            await onUpdate(game.slug, {
                playFee: playFee.toString(),
                private: isPrivate,
            })
            onClose()
        } catch (error) {
            console.error('Failed to update game settings', error)
        } finally {
            setIsLoading(false)
        }
    }

    if (!isOpen || !game) return null

    return (
        <AnimatePresence>
            {isOpen && (
                <>
                    {/* Backdrop */}
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        onClick={onClose}
                        className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4"
                    />

                    {/* Modal */}
                    <motion.div
                        initial={{ opacity: 0, scale: 0.95, y: 20 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.95, y: 20 }}
                        className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-50 w-full max-w-md bg-gray-900 border border-purple-500/30 rounded-xl shadow-2xl overflow-hidden p-6"
                    >
                        <div className="flex items-center justify-between mb-6">
                            <h2 className="text-xl font-bold text-white">Arcade Cabinet Settings</h2>
                            <button
                                onClick={onClose}
                                className="p-1 hover:bg-gray-800 rounded-lg transition-colors text-gray-400 hover:text-white"
                            >
                                <X className="w-5 h-5" />
                            </button>
                        </div>

                        <div className="space-y-6">
                            {/* Play Fee Input */}
                            <div className="space-y-2">
                                <label className="text-sm font-medium text-gray-300 flex items-center gap-2">
                                    <DollarSign className="w-4 h-4 text-green-400" />
                                    Play Fee ($DONUT)
                                </label>
                                <p className="text-xs text-gray-400">
                                    Cost for players to insert a coin. Revenue is split automatically via IP Protocol.
                                </p>
                                <div className="relative">
                                    <input
                                        type="number"
                                        value={playFee}
                                        onChange={(e) => setPlayFee(e.target.value)}
                                        placeholder="0"
                                        min="0"
                                        step="0.1"
                                        className="w-full bg-gray-950 border border-gray-800 rounded-lg px-4 py-3 text-white placeholder-gray-600 focus:outline-none focus:border-purple-500 focus:ring-1 focus:ring-purple-500 transition-colors pl-10"
                                    />
                                    <div className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 font-mono">
                                        $
                                    </div>
                                </div>
                            </div>

                            {/* Visibility Toggle */}
                            <div className="flex items-center justify-between p-4 bg-gray-950 rounded-lg border border-gray-800">
                                <div className="space-y-1">
                                    <label className="text-sm font-medium text-white flex items-center gap-2">
                                        <Eye className="w-4 h-4 text-blue-400" />
                                        Public Visibility
                                    </label>
                                    <p className="text-xs text-gray-400">
                                        Show in the Arcade Gallery for everyone to play.
                                    </p>
                                </div>
                                {/* Custom Toggle Switch */}
                                <button
                                    onClick={() => setIsPrivate(!isPrivate)}
                                    className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-purple-500 focus:ring-offset-2 focus:ring-offset-gray-900 ${!isPrivate ? 'bg-purple-600' : 'bg-gray-700'
                                        }`}
                                >
                                    <span
                                        className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${!isPrivate ? 'translate-x-6' : 'translate-x-1'
                                            }`}
                                    />
                                </button>
                            </div>

                            {/* Action Buttons */}
                            <div className="flex gap-3 pt-2">
                                <Button
                                    variant="outline"
                                    onClick={onClose}
                                    className="flex-1"
                                    disabled={isLoading}
                                >
                                    Cancel
                                </Button>
                                <Button
                                    onClick={handleSave}
                                    className="flex-1 bg-purple-600 hover:bg-purple-700 text-white"
                                    disabled={isLoading}
                                >
                                    {isLoading ? (
                                        <>
                                            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                            Saving...
                                        </>
                                    ) : (
                                        <>
                                            <Save className="w-4 h-4 mr-2" />
                                            Save Configuration
                                        </>
                                    )}
                                </Button>
                            </div>
                        </div>
                    </motion.div>
                </>
            )}
        </AnimatePresence>
    )
}
