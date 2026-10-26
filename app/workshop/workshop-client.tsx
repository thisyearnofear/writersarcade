'use client'

import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { ArrowRight } from 'lucide-react'
import { UndoManager } from '@/lib/undo-manager'
import { useToast } from '@/components/ui/use-toast'
import { AssetGenerationResponse } from '@/domains/games/types'
import { Header } from '@/components/layout/header'
import { useOnboarding } from '@/hooks/useOnboarding'
import { RevenueForecast } from '@/domains/payments/components/revenue-forecast'
import { useOverlay, OverlayPortal } from '@/components/ui/overlay'

type WorkshopState = 'input' | 'processing' | 'workshop' | 'compiling' | 'minting'

export function WorkshopClient() {
    const { showOnboarding, currentStep, flowId, startTour, nextStep, dismissOnboarding } = useOnboarding()
    const { toast: showToast } = useToast()
    const [url, setUrl] = useState('')
    const [state, setState] = useState<WorkshopState>('input')
    const [assets, setAssets] = useState<AssetGenerationResponse | null>(null)
    const [undoManager] = useState(() => new UndoManager<AssetGenerationResponse>(15, 'writarcade_workshop_history'))
    const [allChecklistsPassed, setAllChecklistsPassed] = useState(false)

    useEffect(() => {
        if (state === 'workshop' && !localStorage.getItem('workshop_tour_seen')) {
            startTour('workshop-tour')
            localStorage.setItem('workshop_tour_seen', 'true')
        }
    }, [state, startTour])

    useEffect(() => {
        const current = undoManager.current()
        if (current && !assets) {
            requestAnimationFrame(() => {
                setAssets(current.state)
                setState('workshop')
            })
        }
    }, [undoManager, assets])

    useEffect(() => {
        if (assets && state === 'workshop') {
            undoManager.push(assets, 'Asset modified')

            const hasTitle = assets.title.trim().length > 0
            const hasDescription = assets.description.trim().length > 0
            const hasChars = assets.characters.length >= 2
            const hasMechs = assets.gameMechanics.length >= 1
            const hasBeats = assets.storyBeats.length >= 3
            const isPassing = hasTitle && hasDescription && hasChars && hasMechs && hasBeats

            requestAnimationFrame(() => {
                setAllChecklistsPassed(isPassing)
            })
        }
    }, [assets, state, undoManager])

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
        } catch {
            showToast({ description: 'Failed to extract assets. Try a different article URL.', variant: 'destructive', duration: 6000 })
            setState('input')
        }
    }

    const handleMint = async () => {
        setState('minting')
        try {
            const res = await fetch('/api/assets/mint', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ assets }),
            })
            if (!res.ok) throw new Error('Minting failed')
            showToast({ description: 'IP registered successfully!', duration: 5000 })
        } catch {
            showToast({ description: 'Failed to register IP. Please try again.', variant: 'destructive', duration: 6000 })
        } finally {
            setState('workshop')
        }
    }

    const handleUndo = () => {
        const prev = undoManager.undo()
        if (prev) setAssets(prev.state)
    }

    const tourOpen = Boolean(showOnboarding && flowId === 'workshop-tour')
    useOverlay(tourOpen, dismissOnboarding)

    const renderTour = () => {
        if (!tourOpen) return null
        const steps = [
            "Welcome to the Workshop! This is where you can refine your game assets.",
            "Decomposed assets appear here. You can drag and drop them to organize.",
            "Edit titles, descriptions, and tags. You'll see the provenance snippet here, too.",
            "Once you're ready, look for the 'Register IP' button to mint your game!"
        ]
        return (
            <OverlayPortal>
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="fixed inset-0 z-[80] flex items-center justify-center bg-black/60 p-4">
                <div role="dialog" aria-modal="true" aria-label="Workshop tour" className="bg-card border border-purple-500 p-6 rounded-2xl max-w-sm w-full max-h-[calc(100dvh-2rem)] overflow-y-auto overscroll-contain">
                    <h3 className="text-white font-bold mb-2">Workshop Tour ({currentStep + 1}/{steps.length})</h3>
                    <p className="text-muted-foreground text-sm mb-6">{steps[currentStep]}</p>
                    <div className="flex justify-between">
                        <button onClick={dismissOnboarding} className="text-muted-foreground text-sm hover:text-white">Skip</button>
                        {currentStep < steps.length - 1 ? (
                            <button onClick={nextStep} className="bg-purple-600 px-4 py-2 rounded text-white text-sm">Next</button>
                        ) : (
                            <button onClick={dismissOnboarding} className="bg-green-600 px-4 py-2 rounded text-white text-sm">Got it!</button>
                        )}
                    </div>
                </div>
            </motion.div>
            </OverlayPortal>
        )
    }

    return (
        <div className="relative min-h-screen bg-black text-white font-sans">
            {renderTour()}
            <Header />
            <div className="p-4 sm:p-6 lg:p-12">
                <header className="mb-8 max-w-4xl mx-auto">
                    <h1 className="text-4xl font-bold bg-gradient-to-r from-purple-500 to-blue-50 gradient-text-purple-blue">
                        Asset Workshop
                    </h1>
                </header>

                <div className="max-w-4xl mx-auto">
                    {state === 'input' && (
                        /* Command-bar pill — same pattern as the landing hero
                           SimpleGameForm: borderless input, icon-circle submit
                           that arms once a URL exists. */
                        <form
                            onSubmit={(e) => { e.preventDefault(); if (url.trim()) handleDecompose() }}
                            className="mx-auto flex w-full max-w-lg items-center rounded-full border border-border bg-card pr-1.5 transition-colors focus-within:border-foreground/30"
                        >
                            <input
                                type="url"
                                value={url}
                                onChange={e => setUrl(e.target.value)}
                                placeholder="https://paragraph.xyz/... (paste any article)"
                                aria-label="Article URL"
                                className="h-12 min-w-0 flex-1 bg-transparent pl-5 pr-2 text-sm text-foreground outline-none placeholder:text-muted-foreground"
                            />
                            <button
                                type="submit"
                                title="Decompose article into game assets"
                                aria-label="Decompose article into game assets"
                                className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full transition-colors ${
                                    url.trim()
                                        ? 'bg-foreground text-background hover:opacity-90'
                                        : 'bg-muted/50 text-muted-foreground'
                                }`}
                            >
                                <ArrowRight className="h-4 w-4" />
                            </button>
                        </form>
                    )}

                    {state === 'workshop' && assets && (
                        <div className="sticky top-4 z-10 bg-black/80 backdrop-blur p-4 rounded-xl border border-border">
                            <button onClick={handleUndo} disabled={!undoManager.canUndo()} className="mr-2 disabled:opacity-50">Undo</button>
                            <button
                                onClick={handleMint}
                                disabled={!allChecklistsPassed}
                                className={`px-4 py-2 rounded transition-colors ${
                                    allChecklistsPassed
                                        ? 'bg-green-600 text-white hover:bg-green-500'
                                        : 'text-muted-foreground'
                                }`}
                            >
                                Register IP
                            </button>

                            {allChecklistsPassed && (
                                <div className="mt-4">
                                    <RevenueForecast writerCoinId="avc" action="mint-game" />
                                </div>
                            )}
                        </div>
                    )}
                </div>
            </div>
        </div>
    )
}
