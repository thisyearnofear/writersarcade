'use client'

import { useRef, useState } from 'react'
import Link from 'next/link'
import { motion } from 'framer-motion'
import { Play, SkipForward } from 'lucide-react'

/**
 * Watch landing (?watch=1) — a shared run replays its generated panel clips
 * in sequence, then hands off to play mode. This is the viral surface: the
 * share demonstrates a real playthrough instead of describing the product.
 */
export function GameWatchView({
  slug,
  title,
  videoUrls,
  coverUrl,
}: {
  slug: string
  title: string
  videoUrls: string[]
  coverUrl?: string | null
}) {
  const [index, setIndex] = useState(0)
  const [finished, setFinished] = useState(false)
  const videoRef = useRef<HTMLVideoElement>(null)

  const playUrl = `/games/${slug}?play=1`

  return (
    <div className="relative min-h-screen flex flex-col items-center justify-center overflow-hidden">
      {coverUrl && (
        <div
          className="absolute inset-0 bg-cover bg-center opacity-20 blur-2xl scale-110"
          style={{ backgroundImage: `url(${coverUrl})` }}
        />
      )}

      <div className="relative z-10 w-full max-w-3xl px-4 flex flex-col items-center gap-6">
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center"
        >
          <p className="text-[10px] font-bold uppercase tracking-[0.25em] text-purple-300/80">
            A finished run
          </p>
          <h1 className="font-serif text-3xl sm:text-4xl font-bold text-white mt-2">
            {title}
          </h1>
        </motion.div>

        {!finished ? (
          <motion.div
            key={index}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="w-full aspect-video rounded-2xl overflow-hidden border border-white/10 bg-black shadow-2xl"
          >
            <video
              ref={videoRef}
              key={videoUrls[index]}
              src={videoUrls[index]}
              className="w-full h-full object-cover"
              autoPlay
              playsInline
              onEnded={() => {
                if (index + 1 < videoUrls.length) {
                  setIndex(index + 1)
                } else {
                  setFinished(true)
                }
              }}
            />
          </motion.div>
        ) : (
          <motion.div
            initial={{ opacity: 0, scale: 0.96 }}
            animate={{ opacity: 1, scale: 1 }}
            className="w-full aspect-video rounded-2xl border border-white/10 bg-zinc-900 flex items-center justify-center"
          >
            <p className="text-zinc-400 text-sm">Every choice writes a different ending.</p>
          </motion.div>
        )}

        {!finished && videoUrls.length > 1 && (
          <div className="flex items-center gap-2">
            <span className="text-xs text-zinc-500">
              Scene {index + 1} of {videoUrls.length}
            </span>
            <div className="flex gap-1">
              {videoUrls.map((_, i) => (
                <span
                  key={i}
                  className={`h-1 w-6 rounded-full ${i <= index ? 'bg-purple-400' : 'bg-zinc-800'}`}
                />
              ))}
            </div>
            <button
              type="button"
              onClick={() => setFinished(true)}
              className="ml-2 inline-flex items-center gap-1 text-xs text-zinc-500 hover:text-white transition-colors"
            >
              <SkipForward className="h-3 w-3" /> Skip
            </button>
          </div>
        )}

        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="flex flex-col items-center gap-2"
        >
          <Link
            href={playUrl}
            className="inline-flex h-14 items-center justify-center gap-2 rounded-xl bg-white px-8 text-sm font-bold uppercase tracking-widest text-black transition-all hover:-translate-y-0.5"
          >
            <Play className="h-4 w-4" />
            Play this story yourself
          </Link>
          <p className="text-xs text-zinc-500">Free · no wallet, no signup</p>
        </motion.div>
      </div>
    </div>
  )
}
