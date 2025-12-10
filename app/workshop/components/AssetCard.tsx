import { motion } from 'framer-motion'

interface AssetCardProps {
    title: string
    type: string
    children: React.ReactNode
    onDelete: () => void
}

export function AssetCard({ title, type, children, onDelete }: AssetCardProps) {
    return (
        <motion.div
            layout
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9 }}
            className="bg-gray-800/40 border border-gray-700/50 hover:border-purple-500/30 rounded-xl p-5 relative group transition-all hover:bg-gray-800/60"
        >
            <div className="flex justify-between items-start mb-3">
                <h4 className="font-bold text-white text-lg">{title}</h4>
                <span className="text-[10px] uppercase font-bold tracking-wider bg-gray-900 text-gray-400 px-2 py-1 rounded">
                    {type}
                </span>
            </div>

            <div className="text-gray-300">
                {children}
            </div>

            <button
                onClick={onDelete}
                className="absolute -top-2 -right-2 w-6 h-6 bg-red-500 hover:bg-red-600 rounded-full text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity shadow-lg"
            >
                ×
            </button>
        </motion.div>
    )
}
