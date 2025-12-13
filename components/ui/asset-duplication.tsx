'use client'

import { Copy, GitBranch } from 'lucide-react'
import { motion } from 'framer-motion'

interface AssetDuplicationProps {
    assetTitle: string
    onDuplicate: (newTitle: string) => void
    isLoading?: boolean
}

/**
 * Asset duplication UI with version naming
 * Allows creating variants without losing originals
 */
export function AssetDuplication({
    assetTitle,
    onDuplicate,
    isLoading = false
}: AssetDuplicationProps) {
    const handleQuickDuplicate = () => {
        const timestamp = new Date().toLocaleTimeString('en-US', {
            hour: '2-digit',
            minute: '2-digit',
            second: '2-digit'
        }).replace(/:/g, '')
        const newTitle = `${assetTitle} (v${timestamp})`
        onDuplicate(newTitle)
    }

    return (
        <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="flex items-center gap-2"
        >
            <button
                onClick={handleQuickDuplicate}
                disabled={isLoading}
                className="p-2 hover:bg-purple-600/20 rounded text-purple-400 hover:text-purple-300 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1"
                title="Create version (quick duplicate)"
            >
                <GitBranch className="w-4 h-4" />
                <span className="text-xs font-medium hidden sm:inline">v+</span>
            </button>
            <button
                onClick={handleQuickDuplicate}
                disabled={isLoading}
                className="p-2 hover:bg-blue-600/20 rounded text-blue-400 hover:text-blue-300 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1"
                title="Duplicate asset"
            >
                <Copy className="w-4 h-4" />
                <span className="text-xs font-medium hidden sm:inline">Duplicate</span>
            </button>
        </motion.div>
    )
}
