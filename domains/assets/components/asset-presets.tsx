'use client'

import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Download, Upload, Save, Trash2, ChevronDown } from 'lucide-react'
import { AssetPresetsService, CompositionPreset } from '@/domains/assets/services/asset-presets.service'
import { AssetGenerationResponse } from '@/domains/games/types'

interface AssetPresetsProps {
    currentAssets: AssetGenerationResponse
    onLoadPreset: (assets: AssetGenerationResponse) => void
}

/**
 * Asset Composition Presets UI
 * Save, load, import, export configurations
 */
export function AssetPresets({ currentAssets, onLoadPreset }: AssetPresetsProps) {
    const [isOpen, setIsOpen] = useState(false)
    const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null)
    const [presets, setPresets] = useState<CompositionPreset[]>([])
    const [saveMode, setSaveMode] = useState(false)
    const [presetName, setPresetName] = useState('')
    const [presetDescription, setPresetDescription] = useState('')
    const [_mergeMode, _setMergeMode] = useState<'replace' | 'merge'>('replace')

    const loadPresets = () => {
        const loaded = AssetPresetsService.getAllPresetsLocally()
        setPresets(loaded)
    }

     
     
    useEffect(() => {
        // eslint-disable-next-line react-hooks/set-state-in-effect -- LocalStorage-backed presets hydrate
        loadPresets()
    }, [])

    const handleSavePreset = () => {
        if (!presetName.trim()) return

        const preset = AssetPresetsService.createPreset(
            currentAssets,
            presetName,
            presetDescription,
            false
        )

        if (AssetPresetsService.savePresetLocally(preset)) {
            loadPresets()
            setPresetName('')
            setPresetDescription('')
            setSaveMode(false)
        }
    }

    const handleLoadPreset = (preset: CompositionPreset) => {
        const applied = AssetPresetsService.applyPreset(currentAssets, preset, 'replace')
        onLoadPreset(applied)
        setIsOpen(false)
    }

    const handleDeletePreset = (presetId: string) => {
        if (confirmDeleteId === presetId) {
            AssetPresetsService.deletePresetLocally(presetId)
            loadPresets()
            setConfirmDeleteId(null)
            return
        }
        setConfirmDeleteId(presetId)
        window.setTimeout(() => {
            setConfirmDeleteId((cur) => (cur === presetId ? null : cur))
        }, 3000)
    }

    const handleExportPreset = (preset: CompositionPreset) => {
        AssetPresetsService.exportPreset(preset)
    }

    const handleImportPreset = async (file: File) => {
        const imported = await AssetPresetsService.importPreset(file)
        if (imported) {
            AssetPresetsService.savePresetLocally(imported)
            loadPresets()
        }
    }

    return (
        <div className="relative">
            {/* Trigger button */}
            <button
                onClick={() => setIsOpen(!isOpen)}
                className="flex items-center gap-2 px-4 py-2 bg-info/40 hover:bg-info/60 text-info border border-info/50 rounded-lg text-sm font-bold transition-all"
            >
                <span>Presets</span>
                <ChevronDown className={`w-4 h-4 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
            </button>

            {/* Dropdown menu */}
            <AnimatePresence>
                {isOpen && (
                    <motion.div
                        initial={{ opacity: 0, y: -10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -10 }}
                        className="absolute top-full right-0 mt-2 w-80 bg-card border border-border rounded-xl shadow-2xl z-50 overflow-hidden"
                    >
                        <div className="p-4 max-h-96 overflow-y-auto space-y-3">
                            {/* Save new preset */}
                            {!saveMode ? (
                                <button
                                    onClick={() => setSaveMode(true)}
                                    className="w-full py-2 bg-success/30 hover:bg-success/50 text-success border border-success/50 rounded-lg text-sm font-medium transition-colors flex items-center justify-center gap-2"
                                >
                                    <Save className="w-4 h-4" /> Save Current
                                </button>
                            ) : (
                                <div className="space-y-2 p-3 bg-card rounded-lg border border-success/30">
                                    <input
                                        type="text"
                                        placeholder="Preset name"
                                        value={presetName}
                                        onChange={(e) => setPresetName(e.target.value)}
                                        className="w-full bg-muted border border-border rounded px-2 py-1 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-success"
                                        autoFocus
                                    />
                                    <textarea
                                        placeholder="Description (optional)"
                                        value={presetDescription}
                                        onChange={(e) => setPresetDescription(e.target.value)}
                                        className="w-full bg-muted border border-border rounded px-2 py-1 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-success resize-none min-h-[50px]"
                                    />
                                    <div className="flex gap-2">
                                        <button
                                            onClick={handleSavePreset}
                                            className="flex-1 py-1 bg-success hover:bg-success text-white rounded text-xs font-bold transition-colors"
                                        >
                                            Save
                                        </button>
                                        <button
                                            onClick={() => setSaveMode(false)}
                                            className="flex-1 py-1 bg-muted hover:bg-muted/80 text-foreground rounded text-xs font-bold transition-colors"
                                        >
                                            Cancel
                                        </button>
                                    </div>
                                </div>
                            )}

                            {/* Import/Export */}
                            <div className="grid grid-cols-2 gap-2 pt-2 border-t border-border">
                                <label className="flex items-center justify-center gap-2 px-3 py-2 bg-info/20 hover:bg-info/40 text-info border border-info/30 rounded-lg text-xs font-medium cursor-pointer transition-colors">
                                    <Upload className="w-3 h-3" /> Import
                                    <input
                                        type="file"
                                        accept=".json"
                                        onChange={(e) => {
                                            const file = e.target.files?.[0]
                                            if (file) handleImportPreset(file)
                                        }}
                                        className="hidden"
                                    />
                                </label>
                                {presets.length > 0 && (
                                    <button
                                        onClick={() => handleExportPreset(presets[0])}
                                        className="flex items-center justify-center gap-2 px-3 py-2 bg-brand/20 hover:bg-brand/40 text-brand border border-brand/30 rounded-lg text-xs font-medium transition-colors"
                                        title="Export first preset"
                                    >
                                        <Download className="w-3 h-3" /> Export
                                    </button>
                                )}
                            </div>

                            {/* Presets list */}
                            {presets.length > 0 && (
                                <div className="space-y-2 pt-2 border-t border-border">
                                    {presets.map((preset) => (
                                        <div
                                            key={preset.id}
                                            className="p-3 bg-muted/50 hover:bg-muted border border-border/50 hover:border-brand/30 rounded-lg transition-all group"
                                        >
                                            <h4 className="font-bold text-foreground text-sm mb-1">{preset.name}</h4>
                                            {preset.description && (
                                                <p className="text-xs text-muted-foreground line-clamp-2 mb-2">
                                                    {preset.description}
                                                </p>
                                            )}
                                            <div className="flex gap-2">
                                                <button
                                                    onClick={() => handleLoadPreset(preset)}
                                                    className="flex-1 py-1 bg-brand hover:bg-brand text-white rounded text-xs font-medium transition-colors"
                                                >
                                                    Load
                                                </button>
                                                <button
                                                    onClick={() => handleExportPreset(preset)}
                                                    className="px-2 py-1 bg-muted hover:bg-muted/80 text-muted-foreground rounded text-xs transition-colors"
                                                    title="Export"
                                                >
                                                    <Download className="w-3 h-3" />
                                                </button>
                                                <button
                                                    onClick={() => handleDeletePreset(preset.id)}
                                                    className={`px-2 py-1 rounded text-xs transition-colors ${
                                                        confirmDeleteId === preset.id
                                                            ? 'bg-destructive text-white hover:bg-destructive'
                                                            : 'bg-destructive/20 hover:bg-destructive/40 text-destructive'
                                                    }`}
                                                    title={confirmDeleteId === preset.id ? 'Confirm delete' : 'Delete'}
                                                >
                                                    {confirmDeleteId === preset.id ? <span>Confirm?</span> : <Trash2 className="w-3 h-3" />}
                                                </button>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}

                            {presets.length === 0 && !saveMode && (
                                <p className="text-xs text-muted-foreground text-center py-4">No presets saved yet</p>
                            )}
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    )
}
