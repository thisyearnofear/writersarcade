'use client'

import { useState } from 'react'
import { motion } from 'framer-motion'
import { Pencil, Check, X } from 'lucide-react'

interface AssetCardProps {
    title: string
    type: string
    description?: string
    children: React.ReactNode
    onDelete: () => void
    onTitleChange?: (newTitle: string) => void
    onDescriptionChange?: (newDescription: string) => void
    editable?: boolean
}

export function AssetCard({
    title,
    type,
    description,
    children,
    onDelete,
    onTitleChange,
    onDescriptionChange,
    editable = true
}: AssetCardProps) {
    const [isEditingTitle, setIsEditingTitle] = useState(false)
    const [editedTitle, setEditedTitle] = useState(title)
    const [isEditingDescription, setIsEditingDescription] = useState(false)
    const [editedDescription, setEditedDescription] = useState(description || '')

    const handleSaveTitle = () => {
        if (onTitleChange && editedTitle.trim()) {
            onTitleChange(editedTitle.trim())
        }
        setIsEditingTitle(false)
    }

    const handleCancelEdit = () => {
        setEditedTitle(title)
        setIsEditingTitle(false)
    }

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter') {
            handleSaveTitle()
        } else if (e.key === 'Escape') {
            handleCancelEdit()
        }
    }

    const handleSaveDescription = () => {
        if (onDescriptionChange && editedDescription.trim()) {
            onDescriptionChange(editedDescription.trim())
        }
        setIsEditingDescription(false)
    }

    const handleCancelDescriptionEdit = () => {
        setEditedDescription(description || '')
        setIsEditingDescription(false)
    }

    const handleDescriptionKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'Escape') {
            handleCancelDescriptionEdit()
        }
        // Don't save on Enter for textarea - allow multi-line
    }

    return (
        <motion.div
            layout
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9 }}
            className="bg-gray-800/40 border border-gray-700/50 hover:border-purple-500/30 rounded-xl p-5 relative group transition-all hover:bg-gray-800/60"
        >
            <div className="flex justify-between items-start mb-3">
                {isEditingTitle ? (
                    <div className="flex items-center gap-2 flex-1 mr-2">
                        <input
                            type="text"
                            value={editedTitle}
                            onChange={(e) => setEditedTitle(e.target.value)}
                            onKeyDown={handleKeyDown}
                            className="flex-1 bg-gray-900 border border-purple-500 rounded px-2 py-1 text-white font-bold text-lg focus:outline-none focus:ring-2 focus:ring-purple-400"
                            autoFocus
                        />
                        <button
                            onClick={handleSaveTitle}
                            className="p-1 hover:bg-green-600/20 rounded text-green-400"
                        >
                            <Check className="w-4 h-4" />
                        </button>
                        <button
                            onClick={handleCancelEdit}
                            className="p-1 hover:bg-red-600/20 rounded text-red-400"
                        >
                            <X className="w-4 h-4" />
                        </button>
                    </div>
                ) : (
                    <div className="flex items-center gap-2 group/title">
                        <h4 className="font-bold text-white text-lg">{title}</h4>
                        {editable && onTitleChange && (
                            <button
                                onClick={() => setIsEditingTitle(true)}
                                className="p-1 opacity-0 group-hover/title:opacity-100 hover:bg-purple-600/20 rounded text-purple-400 transition-opacity"
                                title="Edit title"
                            >
                                <Pencil className="w-3 h-3" />
                            </button>
                        )}
                    </div>
                )}
                <span className="text-[10px] uppercase font-bold tracking-wider bg-gray-900 text-gray-400 px-2 py-1 rounded flex-shrink-0">
                    {type}
                </span>
            </div>

            {/* Editable description section */}
            {description !== undefined && onDescriptionChange && (
                <div className="mb-3 group/desc">
                    {isEditingDescription ? (
                        <div className="space-y-2">
                            <textarea
                                value={editedDescription}
                                onChange={(e) => setEditedDescription(e.target.value)}
                                onKeyDown={handleDescriptionKeyDown}
                                className="w-full bg-gray-900 border border-purple-500 rounded px-3 py-2 text-gray-300 text-sm focus:outline-none focus:ring-2 focus:ring-purple-400 min-h-[80px] resize-y"
                                autoFocus
                            />
                            <div className="flex justify-end gap-2">
                                <button
                                    onClick={handleCancelDescriptionEdit}
                                    className="px-2 py-1 text-xs hover:bg-red-600/20 rounded text-red-400 flex items-center gap-1"
                                >
                                    <X className="w-3 h-3" /> Cancel
                                </button>
                                <button
                                    onClick={handleSaveDescription}
                                    className="px-2 py-1 text-xs hover:bg-green-600/20 rounded text-green-400 flex items-center gap-1"
                                >
                                    <Check className="w-3 h-3" /> Save
                                </button>
                            </div>
                        </div>
                    ) : (
                        <div className="flex items-start gap-2">
                            <p className="text-sm text-gray-400 flex-1">{description}</p>
                            {editable && (
                                <button
                                    onClick={() => setIsEditingDescription(true)}
                                    className="p-1 opacity-0 group-hover/desc:opacity-100 hover:bg-purple-600/20 rounded text-purple-400 transition-opacity flex-shrink-0"
                                    title="Edit description"
                                >
                                    <Pencil className="w-3 h-3" />
                                </button>
                            )}
                        </div>
                    )}
                </div>
            )}

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

