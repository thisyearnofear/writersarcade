import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { X, Plus, Loader2 } from 'lucide-react'

interface Asset {
    id: string
    title: string
    description: string
    type: string
    content: unknown
}

interface MarketplaceSidebarProps {
    isOpen: boolean
    onClose: () => void
    onInject: (asset: Asset) => void
}

export function MarketplaceSidebar({ isOpen, onClose, onInject }: MarketplaceSidebarProps) {
    const [assets, setAssets] = useState<Asset[]>([])
    const [loading, setLoading] = useState(false)

    useEffect(() => {
        if (isOpen) {
            fetchAssets()
        }
    }, [isOpen])

    const fetchAssets = async () => {
        setLoading(true)
        try {
            const res = await fetch('/api/assets/marketplace')
            const { data } = await res.json()
            if (data && data.assets) {
                setAssets(data.assets)
            }
        } catch (e) {
            console.error(e)
        } finally {
            setLoading(false)
        }
    }

    return (
        <AnimatePresence>
            {isOpen && (
                <>
                    {/* Backdrop */}
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 0.5 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 bg-black/50 backdrop-blur-sm z-40"
                        onClick={onClose}
                    />

                    {/* Sidebar */}
                    <motion.div
                        initial={{ x: '100%' }}
                        animate={{ x: 0 }}
                        exit={{ x: '100%' }}
                        transition={{ type: 'spring', damping: 25, stiffness: 200 }}
                        className="fixed right-0 top-0Bottom-0 h-full w-full md:w-96 bg-gray-950 border-l border-gray-800 z-50 shadow-2xl overflow-y-auto"
                    >
                        <div className="p-6">
                            <div className="flex justify-between items-center mb-8">
                                <div>
                                    <h2 className="text-xl font-bold text-white">Marketplace</h2>
                                    <p className="text-xs text-gray-400">Community Assets via Story Protocol</p>
                                </div>
                                <button onClick={onClose} className="p-2 hover:bg-gray-800 rounded-full text-gray-400 hover:text-white transition-colors">
                                    <X size={20} />
                                </button>
                            </div>

                            {loading ? (
                                <div className="flex justify-center py-20">
                                    <Loader2 className="animate-spin text-purple-500" size={32} />
                                </div>
                            ) : (
                                <div className="space-y-4">
                                    {assets.map((asset) => (
                                        <div key={asset.id} className="bg-gray-900 border border-gray-800 p-4 rounded-xl hover:border-purple-500/30 transition-all group">
                                            <div className="flex justify-between items-start mb-2">
                                                <h3 className="font-bold text-gray-200">{asset.title}</h3>
                                                <span className={`text-[10px] uppercase font-bold px-2 py-0.5 rounded ${getTypeColor(asset.type)}`}>
                                                    {asset.type}
                                                </span>
                                            </div>
                                            <p className="text-sm text-gray-400 mb-4 line-clamp-2">
                                                {asset.description}
                                            </p>

                                            <button
                                                onClick={() => onInject(asset)}
                                                className="w-full py-2 bg-gray-800 hover:bg-purple-600 hover:text-white text-gray-300 rounded-lg text-sm font-medium transition-colors flex items-center justify-center gap-2"
                                            >
                                                <Plus size={16} /> Add to Game
                                            </button>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    </motion.div>
                </>
            )}
        </AnimatePresence>
    )
}

function getTypeColor(type: string) {
    switch (type.toLowerCase()) {
        case 'character': return 'bg-blue-900/50 text-blue-200'
        case 'mechanic': return 'bg-red-900/50 text-red-200'
        case 'visual': return 'bg-purple-900/50 text-purple-200'
        case 'world': return 'bg-green-900/50 text-green-200'
        default: return 'bg-gray-800 text-gray-400'
    }
}
