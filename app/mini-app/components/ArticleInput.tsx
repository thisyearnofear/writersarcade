'use client'

import { useState } from 'react'
import { type WriterCoin } from '@/lib/writer-coins'
import { validateArticleForWriterCoin, fetchParagraphArticle, extractParagraphAuthor } from '@/lib/paragraph'
import { motion, AnimatePresence } from 'framer-motion'
import { cn } from '@/lib/utils'

interface ArticleInputProps {
    writerCoin?: WriterCoin | null
    isMUSD?: boolean
    onSubmit: (url: string) => void
    onBack: () => void
}

export function ArticleInput({ writerCoin, isMUSD, onSubmit, onBack }: ArticleInputProps) {
    const [url, setUrl] = useState('')
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState<string | null>(null)
    const [preview, setPreview] = useState<{ title: string; excerpt: string; author?: string } | null>(null)

    const handleValidate = async () => {
        setError(null)
        setPreview(null)
        setLoading(true)

        try {
            if (isMUSD) {
                // For MUSD, we just need to verify it's a valid Paragraph URL
                const author = extractParagraphAuthor(url)
                if (!author) {
                    setError('Please provide a valid Paragraph article URL (e.g. paragraph.xyz/@author/...)')
                    setLoading(false)
                    return
                }
            } else if (writerCoin) {
                const validation = await validateArticleForWriterCoin(url, writerCoin.id)
                if (!validation.valid) {
                    setError(validation.error || 'Invalid article URL')
                    setLoading(false)
                    return
                }
            }

            const article = await fetchParagraphArticle(url)
            if (!article) {
                setError('Could not fetch article. Please check the URL.')
                setLoading(false)
                return
            }

            setPreview({
                title: article.title,
                excerpt: article.content.slice(0, 160) + '...',
                author: article.author || 'Unknown'
            })
        } catch {
            setError('Failed to validate article')
        } finally {
            setLoading(false)
        }
    }

    const handleSubmit = () => {
        if (preview) {
            onSubmit(url)
        }
    }

    return (
        <div className="space-y-6">
            <button
                onClick={onBack}
                className={cn(
                    "group flex items-center space-x-2 text-[10px] font-black uppercase tracking-widest transition-colors",
                    isMUSD ? "text-warning hover:text-warning" : "text-brand hover:text-brand"
                )}
            >
                <svg className="h-3 w-3 transition-transform group-hover:-translate-x-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M15 19l-7-7 7-7" />
                </svg>
                <span>Back to Origin</span>
            </button>

            <div className="space-y-1">
                <h2 className="text-2xl font-black text-white uppercase italic tracking-tight">Load Target</h2>
                <p className="text-sm text-white/60">
                    Paste any Paragraph article URL to begin {isMUSD ? 'MUSD generation' : `synthesis for ${writerCoin?.writer}`}
                </p>
            </div>

            <div className="space-y-4">
                <div className="relative">
                    <div className="absolute inset-y-0 left-4 flex items-center pointer-events-none">
                        <svg className={cn("h-5 w-5 opacity-50", isMUSD ? "text-warning" : "text-brand")} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
                        </svg>
                    </div>
                    <input
                        type="url"
                        value={url}
                        onChange={(e) => {
                            setUrl(e.target.value)
                            setError(null)
                            setPreview(null)
                        }}
                        placeholder="https://paragraph.xyz/@author/..."
                        className={cn(
                            "w-full rounded-2xl border bg-white/5 py-4 pl-12 pr-32 text-white transition-all focus:outline-none focus:ring-4",
                            isMUSD 
                                ? "border-warning/20 placeholder-warning/20 focus:border-warning/50 focus:ring-warning/10" 
                                : "border-white/10 placeholder-brand/30 focus:border-brand/50 focus:ring-brand/10"
                        )}
                    />
                    <div className="absolute inset-y-2 right-2">
                        <button
                            onClick={handleValidate}
                            disabled={!url || loading}
                            className={cn(
                                "h-full rounded-xl px-4 text-xs font-black uppercase tracking-widest text-white transition-all disabled:opacity-50 disabled:cursor-not-allowed active:scale-95",
                                isMUSD
                                    ? "bg-warning hover:bg-warning/90 shadow-[0_0_15px_rgba(245,158,11,0.3)] hover:shadow-[0_0_20px_rgba(245,158,11,0.5)]"
                                    : "bg-brand hover:bg-brand/90 shadow-[0_0_15px_rgba(168,85,247,0.3)] hover:shadow-[0_0_20px_rgba(168,85,247,0.5)]"
                            )}
                        >
                            {loading ? (
                                <span className="flex items-center space-x-2">
                                    <span className="h-2 w-2 animate-pulse rounded-full bg-white"></span>
                                    <span>Syncing</span>
                                </span>
                            ) : 'Scan'}
                        </button>
                    </div>
                </div>

                <AnimatePresence mode="wait">
                    {error && (
                        <motion.div
                            initial={{ opacity: 0, y: -10 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -10 }}
                            className="rounded-2xl border border-destructive/20 bg-destructive/5 p-4"
                        >
                            <div className="flex items-center space-x-3">
                                <span className="text-destructive font-bold">ERROR:</span>
                                <p className="text-xs text-destructive/80">{error}</p>
                            </div>
                        </motion.div>
                    )}

                    {preview && (
                        <motion.div
                            initial={{ opacity: 0, scale: 0.95 }}
                            animate={{ opacity: 1, scale: 1 }}
                            className={cn(
                                "overflow-hidden rounded-2xl border",
                                isMUSD ? "border-warning/20 bg-warning/5" : "border-success/20 bg-success/5"
                            )}
                        >
                            <div className={cn(
                                "px-4 py-2 flex items-center justify-between",
                                isMUSD ? "bg-warning/10" : "bg-success/10"
                            )}>
                                <div className="flex items-center space-x-2">
                                    <span className={cn(
                                        "h-1.5 w-1.5 rounded-full animate-pulse",
                                        isMUSD ? "bg-warning" : "bg-success"
                                    )}></span>
                                    <span className={cn(
                                        "text-[10px] font-black uppercase tracking-widest",
                                        isMUSD ? "text-warning/80" : "text-success/80"
                                    )}>Data Synchronized</span>
                                </div>
                                <span className={cn(
                                    "text-[10px] font-mono",
                                    isMUSD ? "text-warning/40" : "text-success/40"
                                )}>
                                    SOURCE: PARAGRAPH.XYZ
                                </span>
                            </div>
                            <div className="p-5">
                                <h3 className="mb-2 text-lg font-black text-white italic tracking-tight">{preview.title}</h3>
                                <p className="text-xs leading-relaxed text-white/50 line-clamp-2">{preview.excerpt}</p>
                                
                                <button
                                    onClick={handleSubmit}
                                    className={cn(
                                        "group mt-6 w-full rounded-xl py-3 text-xs font-black uppercase tracking-widest text-black transition-all active:scale-[0.98] flex items-center justify-center space-x-2 shadow-lg",
                                        isMUSD
                                            ? "bg-warning hover:bg-warning/90 shadow-warning/20 hover:shadow-warning/40"
                                            : "bg-success hover:bg-success/90 shadow-success/20 hover:shadow-success/40"
                                    )}
                                >
                                    <span>Proceed to Configuration</span>
                                    <svg className="h-3 w-3 transition-transform group-hover:translate-x-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={4} d="M9 5l7 7-7 7" />
                                    </svg>
                                </button>
                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>

                {!preview && (
                    <div className="rounded-2xl border border-white/5 bg-white/[0.02] p-4">
                        <div className="flex items-start space-x-3">
                            <div className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-white/5 text-[10px] font-bold text-white/40 ring-1 ring-white/10 italic">
                                ?
                            </div>
                            <p className="text-[10px] leading-relaxed text-white/30 uppercase tracking-wider font-medium">
                                System ready for data ingestion. Please provide a valid Paragraph article endpoint to begin game synthesis.
                            </p>
                        </div>
                    </div>
                )}
            </div>
        </div>
    )
}

