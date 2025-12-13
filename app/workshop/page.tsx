'use client'

import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { UndoManager } from '@/lib/undo-manager'
import { useToastNotification } from '@/hooks/use-toast-notification'
import { ToastContainer } from '@/components/ui/toast-container'
import { AssetCard } from './components/AssetCard'
import { AssetCanvas } from '@/components/ui/asset-canvas'
import { AssetPalette } from '@/components/ui/asset-palette'
import { AssetPresets } from '@/components/ui/asset-presets'
import { AssetBalanceAnalysis } from '@/components/ui/asset-balance-analysis'
import { AssetMintChecklist } from '@/components/ui/asset-mint-checklist'
import { CollapsibleSection } from '@/components/ui/collapsible-section'
import { BalanceGauge } from '@/components/ui/balance-gauge'
import { SuccessMoment } from '@/components/ui/success-moment'
import { AssetHoverProvider } from '@/components/providers/asset-hover-provider'
import { AssetGenerationResponse, AssetRelationship } from '@/domains/games/types'
import { AssetRelationshipService } from '@/domains/assets/services/asset-relationship.service'
import { useRouter } from 'next/navigation'
import { RotateCcw } from 'lucide-react'

type WorkshopState = 'input' | 'processing' | 'workshop' | 'compiling' | 'minting'
type LayoutMode = 'grid' | 'flow'

interface AssetTag {
    key: string
    value: string
}

export default function WorkshopPage() {
    const router = useRouter()
    const { toasts, show: showToast, dismiss } = useToastNotification()
    const [url, setUrl] = useState('')
    const [state, setState] = useState<WorkshopState>('input')
    const [assets, setAssets] = useState<AssetGenerationResponse | null>(null)
    const [isMarketplaceOpen, setMarketplaceOpen] = useState(false)
    const [layoutMode, setLayoutMode] = useState<LayoutMode>('grid')
    const [assetTags, setAssetTags] = useState<Record<string, AssetTag[]>>({})
    const [undoManager] = useState(() => new UndoManager<AssetGenerationResponse>(15))
    const [relationships, setRelationships] = useState<AssetRelationship[]>([])
    const [showMintSuccess, setShowMintSuccess] = useState(false)
    const [allChecklistsPassed, setAllChecklistsPassed] = useState(false)

    // Push to undo history when assets change + compute relationships
    useEffect(() => {
        if (assets && state === 'workshop') {
            undoManager.push(assets, 'Asset modified')
            // Recompute relationships whenever assets change
            const rels = AssetRelationshipService.computeRelationships(
                assets.characters,
                assets.gameMechanics,
                assets.storyBeats
            )
            setRelationships(rels)

            // Check if all checklists pass
            const hasTitle = assets.title.trim().length > 0
            const hasDescription = assets.description.trim().length > 0
            const hasChars = assets.characters.length >= 2
            const hasMechs = assets.gameMechanics.length >= 1
            const hasBeats = assets.storyBeats.length >= 3
            const isPassing = hasTitle && hasDescription && hasChars && hasMechs && hasBeats

            if (isPassing && !allChecklistsPassed) {
                setAllChecklistsPassed(true)
                setShowMintSuccess(true)
            } else if (!isPassing && allChecklistsPassed) {
                setAllChecklistsPassed(false)
            }
        }
    }, [assets, state, undoManager, allChecklistsPassed])

    // Handlers
    const handleDecompose = async () => {
        setState('processing')
        try {
            const res = await fetch('/api/assets/generate', {
                method: 'POST',
                body: JSON.stringify({ url }),
            })
            const { data } = await res.json()
            setAssets(data)
            setState('workshop')
        } catch (e) {
            alert('Failed to extract assets. Try another article.')
            setState('input')
        }
    }

    const handleMint = async () => {
        if (!assets) return
        if (!confirm('Mint this Asset Pack on Story Protocol? This permanently registers it as your IP.')) return

        setState('minting')
        try {
            // First save draft to ensure we have ID (Simplification: save inline or require save first)
            // For now, we send raw data to API which handles it
            const res = await fetch('/api/assets/register', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    assetData: {
                        ...assets,
                        title: assets.title || 'Untitled Asset Pack',
                        description: assets.description || 'Generated from ' + url,
                        articleUrl: url,
                        type: 'pack'
                    }
                })
            })

            const data = await res.json()
            if (data.success) {
                alert(`SUCCESS! Asset Minted on Story Protocol.\nIP ID: ${data.data.ipId}`)
            } else {
                throw new Error(data.error)
            }
        } catch (e) {
            console.error(e)
            alert('Minting failed: ' + (e instanceof Error ? e.message : 'Unknown error'))
        } finally {
            setState('workshop')
        }
    }

    const handleSave = async (silent = false): Promise<string | null> => {
        if (!assets) return null
        try {
            const res = await fetch('/api/assets/save', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    title: assets.title || 'Untitled Asset Pack',
                    description: assets.description || 'Generated from ' + url,
                    content: assets,
                    articleUrl: url
                })
            })
            const data = await res.json()
            if (res.ok && data.success) {
                if (!silent) alert('Asset Pack Saved to Library!')
                return data.data.id // Return the Asset ID
            } else {
                throw new Error('Save failed')
            }
        } catch (e) {
            console.error(e)
            if (!silent) alert('Error saving assets.')
            return null
        }
    }

    const handleCompile = async () => {
        if (!assets) return
        setState('compiling')

        // Convert assets back into a rich prompt
        const assetContext = `
      GAME BLUEPRINT (COMPILED FROM WORKSHOP):
      Title: ${assets.title}
      Description: ${assets.description}
      
      CHARACTERS:
      ${assets.characters.map(c => `- ${c.name} (${c.role}): ${c.personality}`).join('\n')}
      
      MECHANICS:
      ${assets.gameMechanics.map(m => `- ${m.name}: ${m.description}`).join('\n')}
      
      STORY BEATS:
      ${assets.storyBeats.map(b => `- ${b.title}: ${b.description}`).join('\n')}
      
      VISUAL STYLE:
      ${(assets.visualGuidelines?.artStyle || '')}, ${(assets.visualGuidelines?.atmosphere || '')}
    `

        // Call standard game generation with this specific context
        try {
            // Implicitly save the asset pack first to get an ID for tracking
            const assetId = await handleSave(true)

            const res = await fetch('/api/games/generate', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    promptText: assetContext,
                    promptName: 'Workshop-Compiled-v1',
                    url: url, // We pass original URL for attribution, but prompt is custom
                    assetIds: assetId ? [assetId] : [] // Pass the Asset ID to link valid relationship
                })
            })

            const { data } = await res.json()
            if (data && data.id) {
                router.push(`/games/${data.id}`)
            }
        } catch (e) {
            alert('Failed to compile game.')
            setState('workshop')
        }
    }

    // Workshop Actions
    const removeAsset = (type: 'characters' | 'gameMechanics' | 'storyBeats', index: number) => {
        if (!assets) return
        const newAssets = JSON.parse(JSON.stringify(assets))

        let removed;
        if (type === 'characters') {
            removed = newAssets[type][index]
            newAssets[type] = newAssets[type].filter((_: unknown, i: number) => i !== index)
        } else if (type === 'gameMechanics') {
            removed = newAssets[type][index]
            newAssets[type] = newAssets[type].filter((_: unknown, i: number) => i !== index)
        } else if (type === 'storyBeats') {
            removed = newAssets[type][index]
            newAssets[type] = newAssets[type].filter((_: unknown, i: number) => i !== index)
        }

        // Store previous state for undo
        const previousAssets = assets
        setAssets(newAssets)
        
        // Get removed asset name
        const removedName = (removed as { name?: string; title?: string }).name || (removed as { name?: string; title?: string }).title || 'Item'
        
        // Show toast with undo action
        showToast(`Deleted ${removedName}`, {
            type: 'info',
            duration: 5000,
            action: {
                label: 'Undo',
                onClick: () => {
                    setAssets(previousAssets)
                    showToast('Restored', { type: 'success', duration: 2000 })
                }
            }
        })
    }

    const updateAsset = <K extends 'characters' | 'gameMechanics' | 'storyBeats'>(
        type: K,
        index: number,
        field: string,
        value: string
    ) => {
        if (!assets) return
        const newAssets = JSON.parse(JSON.stringify(assets))

        if (type === 'characters') {
            newAssets[type] = newAssets[type].map((item: Record<string, unknown>, i: number) =>
                i === index ? { ...item, [field]: value } : item
            )
        } else if (type === 'gameMechanics') {
            newAssets[type] = newAssets[type].map((item: Record<string, unknown>, i: number) =>
                i === index ? { ...item, [field]: value } : item
            )
        } else if (type === 'storyBeats') {
            newAssets[type] = newAssets[type].map((item: Record<string, unknown>, i: number) =>
                i === index ? { ...item, [field]: value } : item
            )
        }
        setAssets(newAssets)
    }

    const updateAssetTags = (type: 'characters' | 'gameMechanics' | 'storyBeats', index: number, tags: AssetTag[]) => {
        if (!assets) return
        const key = `${type}-${index}`
        setAssetTags({ ...assetTags, [key]: tags })
    }

    const getAssetTags = (type: 'characters' | 'gameMechanics' | 'storyBeats', index: number): AssetTag[] => {
        const key = `${type}-${index}`
        return assetTags[key] || []
    }

    const handleUndo = () => {
        const previous = undoManager.undo()
        if (previous) {
            setAssets(previous.state)
            showToast('Undone', { type: 'success', duration: 2000 })
        }
    }

    // Keyboard shortcuts
    useEffect(() => {
        const handleKeyDown = (event: KeyboardEvent) => {
            // Cmd+Z or Ctrl+Z for undo
            if ((event.metaKey || event.ctrlKey) && event.key === 'z' && !event.shiftKey && state === 'workshop') {
                event.preventDefault()
                handleUndo()
            }
            // Escape to close marketplace
            if (event.key === 'Escape' && isMarketplaceOpen) {
                setMarketplaceOpen(false)
            }
        }

        window.addEventListener('keydown', handleKeyDown)
        return () => window.removeEventListener('keydown', handleKeyDown)
    }, [state, isMarketplaceOpen, undoManager])

    const handleInject = (asset: { id: string, title: string, description: string, type: string, content: unknown }) => {
        if (!assets) return
        const newAssets = { ...assets }
        const type = asset.type.toLowerCase()

        if (type === 'mechanic') {
            newAssets.gameMechanics.push(asset.content as import('@/domains/games/types').GameMechanic)
        } else if (type === 'character') {
            newAssets.characters.push(asset.content as import('@/domains/games/types').CharacterProfile)
        } else if (type === 'visual' || type === 'world') {
            // Merge visual guidelines or replace
            if (confirm(`Replace visual style with "${asset.title}"?`)) {
                newAssets.visualGuidelines = {
                    ...newAssets.visualGuidelines,
                    ...(asset.content as import('@/domains/games/types').VisualGuideline)
                }
            }
        } else {
            console.log("Unknown asset type", type)
        }

        setAssets(newAssets)
        setMarketplaceOpen(false)
    }

    return (
        <div className="min-h-screen bg-black text-white p-6 md:p-12 font-sans">
            <header className="mb-12 max-w-4xl mx-auto">
                <h1 className="text-4xl font-bold bg-gradient-to-r from-purple-400 to-pink-600 bg-clip-text text-transparent mb-2">
                    Asset Workshop
                </h1>
                <p className="text-gray-400">
                    Decompose articles into component IP assets. Remix, edit, and compile custom games.
                </p>
            </header>

            <div className="max-w-4xl mx-auto">
                {state === 'input' && (
                    <div className="bg-gray-900/50 p-8 rounded-2xl border border-gray-800">
                        <label className="block text-sm font-medium text-gray-400 mb-2">Article URL</label>
                        <div className="flex gap-4">
                            <input
                                value={url}
                                onChange={e => setUrl(e.target.value)}
                                placeholder="https://avc.xyz/..."
                                className="flex-1 bg-black/50 border border-gray-700 rounded-lg px-4 py-3 focus:ring-2 focus:ring-purple-500 outline-none transition-all"
                            />
                            <button
                                onClick={handleDecompose}
                                disabled={!url}
                                className="px-6 py-3 bg-purple-600 hover:bg-purple-500 disabled:opacity-50 disabled:cursor-not-allowed rounded-lg font-bold transition-colors"
                            >
                                Decompose
                            </button>
                        </div>
                    </div>
                )}

                {(state === 'processing' || state === 'compiling' || state === 'minting') && (
                    <div className="text-center py-20">
                        <div className="animate-spin h-12 w-12 border-4 border-purple-500 border-t-transparent rounded-full mx-auto mb-6"></div>
                        <p className="text-xl font-medium animate-pulse">
                            {state === 'processing' ? 'Extracting IP Assets...' : state === 'minting' ? 'Minting Logic on Story Protocol...' : 'Compiling Game Runtime...'}
                        </p>
                        <p className="text-sm text-gray-500 mt-2">
                            {state === 'processing' ? 'Analyzing themes, extracting characters, identifying mechanics' : state === 'minting' ? 'hashing metadata • uploading to IPFS • confirming on-chain' : 'Synthesizing story engine from selected assets'}
                        </p>
                    </div>
                )}

                {state === 'workshop' && assets && (
                    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>

                        {/* Toolbar */}
                        <div className="flex justify-between items-center mb-8 sticky top-4 z-10 bg-black/80 backdrop-blur p-4 rounded-xl border border-gray-800/50 shadow-xl">
                            <div className="flex-1">
                                <h2 className="text-xl font-bold">{assets.title}</h2>
                                <p className="text-xs text-gray-400">Asset Pack v1.0 • {assets.characters.length + assets.gameMechanics.length + assets.storyBeats.length} Assets</p>
                            </div>
                            {/* Balance gauge */}
                            <div className="px-6 py-2">
                                <BalanceGauge
                                    characters={assets.characters}
                                    mechanics={assets.gameMechanics}
                                    storyBeats={assets.storyBeats}
                                />
                            </div>
                            <div className="flex gap-3">
                                <button
                                    onClick={handleUndo}
                                    disabled={!undoManager.canUndo()}
                                    title="Undo (Cmd+Z)"
                                    className="px-4 py-2 bg-gray-800 hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed text-gray-300 border border-gray-700 rounded-lg text-sm font-bold transition-all flex items-center gap-2"
                                >
                                    <RotateCcw className="w-4 h-4" />
                                    Undo
                                </button>
                                <AssetPresets
                                    currentAssets={assets}
                                    onLoadPreset={setAssets}
                                />
                                <button
                                    onClick={() => handleSave(false)}
                                    className="px-4 py-2 bg-blue-900/40 hover:bg-blue-800/60 text-blue-200 border border-blue-700/50 rounded-lg text-sm font-bold transition-all"
                                >
                                    Save Draft
                                </button>
                                <button
                                    onClick={handleMint}
                                    className="px-4 py-2 bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-400 hover:to-orange-500 text-white rounded-lg text-sm font-bold transition-all shadow-lg shadow-orange-900/20 flex items-center gap-2"
                                >
                                    <span>✦</span> Mint IP
                                </button>
                                <button
                                    onClick={() => setMarketplaceOpen(true)}
                                    className="px-4 py-2 bg-gray-800 hover:bg-gray-700 border border-gray-700 rounded-lg text-sm font-medium transition-colors flex items-center gap-2"
                                >
                                    <span>+</span> Add Marketplace Asset
                                </button>
                                <button
                                    onClick={handleCompile}
                                    className="px-6 py-2 bg-green-600 hover:bg-green-500 text-white rounded-lg font-bold transition-colors shadow-lg shadow-green-900/20"
                                >
                                    Compile Game
                                </button>
                            </div>
                        </div>

                        {/* Analysis Section */}
                        <div className="space-y-4">
                            <CollapsibleSection
                                title="✓ Mint Readiness"
                                defaultOpen={false}
                            >
                                <AssetMintChecklist
                                    title={assets.title}
                                    description={assets.description}
                                    characters={assets.characters}
                                    mechanics={assets.gameMechanics}
                                    storyBeats={assets.storyBeats}
                                />
                            </CollapsibleSection>
                            <CollapsibleSection
                                title="⚖ Game Balance"
                                defaultOpen={false}
                            >
                                <AssetBalanceAnalysis
                                    characters={assets.characters}
                                    mechanics={assets.gameMechanics}
                                    storyBeats={assets.storyBeats}
                                />
                            </CollapsibleSection>
                        </div>

                        {/* Asset Canvas Grid with Hover Provider */}
                        <AssetHoverProvider
                            relationships={relationships}
                            characters={assets.characters}
                            mechanics={assets.gameMechanics}
                            storyBeats={assets.storyBeats}
                        >
                        <div className="space-y-12">

                            {/* Characters Canvas */}
                            <AssetCanvas
                                sectionTitle={`Characters (${assets.characters.length})`}
                                sectionColor="blue"
                                layoutMode={layoutMode}
                                onLayoutModeChange={setLayoutMode}
                                assets={assets.characters.map((char, i) => ({
                                    id: `char-${i}`,
                                    title: char.name,
                                    type: 'character' as const,
                                    component: (
                                        <AssetCard
                                            title={char.name}
                                            type="Character"
                                            assetType="character"
                                            assetIndex={i}
                                            tags={getAssetTags('characters', i)}
                                            onDelete={() => removeAsset('characters', i)}
                                            onTitleChange={(newName) => updateAsset('characters', i, 'name', newName)}
                                            onTagsChange={(tags) => updateAssetTags('characters', i, tags)}
                                        >
                                            <p className="text-sm text-gray-300 italic mb-2">{char.role}</p>
                                            <p className="text-xs text-gray-400">{char.personality}</p>
                                        </AssetCard>
                                    )
                                }))}
                            />

                            {/* Mechanics Canvas */}
                            <AssetCanvas
                                sectionTitle={`Mechanics (${assets.gameMechanics.length})`}
                                sectionColor="red"
                                layoutMode={layoutMode}
                                assets={assets.gameMechanics.map((mech, i) => ({
                                    id: `mech-${i}`,
                                    title: mech.name,
                                    type: 'mechanic' as const,
                                    component: (
                                        <AssetCard
                                            title={mech.name}
                                            type="Mechanic"
                                            assetType="mechanic"
                                            assetIndex={i}
                                            tags={getAssetTags('gameMechanics', i)}
                                            onDelete={() => removeAsset('gameMechanics', i)}
                                            onTitleChange={(newName) => updateAsset('gameMechanics', i, 'name', newName)}
                                            onTagsChange={(tags) => updateAssetTags('gameMechanics', i, tags)}
                                        >
                                            <p className="text-sm text-gray-300 mb-2">{mech.description}</p>
                                            <p className="text-xs text-gray-500 font-mono bg-gray-900 p-2 rounded block">
                                                {mech.consequence}
                                            </p>
                                        </AssetCard>
                                    )
                                }))}
                            />

                            {/* Story Beats Canvas */}
                            <AssetCanvas
                                sectionTitle={`Story Beats (${assets.storyBeats.length})`}
                                sectionColor="yellow"
                                layoutMode={layoutMode}
                                assets={assets.storyBeats.map((beat, i) => ({
                                    id: `beat-${i}`,
                                    title: beat.title,
                                    type: 'story' as const,
                                    component: (
                                        <AssetCard
                                            title={beat.title}
                                            type="Story"
                                            assetType="story"
                                            assetIndex={i}
                                            tags={getAssetTags('storyBeats', i)}
                                            onDelete={() => removeAsset('storyBeats', i)}
                                            onTitleChange={(newTitle) => updateAsset('storyBeats', i, 'title', newTitle)}
                                            onTagsChange={(tags) => updateAssetTags('storyBeats', i, tags)}
                                        >
                                            <p className="text-sm text-gray-300">{beat.description}</p>
                                        </AssetCard>
                                    )
                                }))}
                            />

                        </div>
                        </AssetHoverProvider>
                    </motion.div>
                )}

                <AssetPalette
                    isOpen={isMarketplaceOpen}
                    onClose={() => setMarketplaceOpen(false)}
                    onInject={handleInject}
                />
            </div>

            {/* Toast notifications */}
            <ToastContainer toasts={toasts} onDismiss={dismiss} />

            {/* Success moment */}
            <SuccessMoment
                trigger={showMintSuccess}
                onComplete={() => setShowMintSuccess(false)}
            />
        </div >
    )
}