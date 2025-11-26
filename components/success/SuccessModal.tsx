'use client'

import { CheckCircle, Share2, Eye, Copy, ExternalLink, Zap, Users, TrendingUp, Lock } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useState } from 'react'

interface SuccessModalProps {
  isOpen: boolean
  onClose: () => void
  title: string
  description: string
  gameSlug?: string
  transactionHash?: string
  action: 'mint' | 'generate'
}

export function SuccessModal({
  isOpen,
  onClose,
  title,
  description,
  gameSlug,
  transactionHash,
  action,
}: SuccessModalProps) {
  const [copied, setCopied] = useState(false)

  const gameUrl = gameSlug ? `${window.location.origin}/games/${gameSlug}` : null
  const explorerUrl = transactionHash
    ? `https://basescan.org/tx/${transactionHash}`
    : null

  const handleCopy = (text: string) => {
    navigator.clipboard.writeText(text)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-gradient-to-br from-gray-900 to-black border border-green-500/30 rounded-2xl max-w-md w-full shadow-2xl">
        {/* Icon */}
        <div className="flex justify-center pt-8">
          <div className="relative">
            <div className="absolute inset-0 bg-green-500/20 blur-xl rounded-full"></div>
            <CheckCircle className="w-16 h-16 text-green-500 relative" />
          </div>
        </div>

        {/* Content */}
        <div className="px-8 py-6 text-center space-y-4">
          <div>
            <h2 className="text-2xl font-bold text-green-400 mb-2">{title}</h2>
            <p className="text-gray-300">{description}</p>
          </div>

          {/* Game URL */}
          {gameUrl && (
            <div className="space-y-2">
              <p className="text-xs font-medium text-gray-400 uppercase tracking-wide">Your Game</p>
              <div className="flex items-center gap-2 bg-gray-800/50 rounded-lg p-3 border border-gray-700">
                <code className="text-xs text-gray-300 flex-1 truncate">{gameUrl}</code>
                <button
                  onClick={() => handleCopy(gameUrl)}
                  className="text-gray-400 hover:text-gray-200 transition-colors flex-shrink-0"
                  title="Copy URL"
                >
                  <Copy className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}

          {/* Transaction Hash */}
          {transactionHash && (
            <div className="space-y-2">
              <p className="text-xs font-medium text-gray-400 uppercase tracking-wide">
                {action === 'mint' ? 'Mint Transaction' : 'Transaction'}
              </p>
              <div className="flex items-center gap-2 bg-gray-800/50 rounded-lg p-3 border border-gray-700">
                <code className="text-xs text-gray-300 flex-1 truncate">{transactionHash}</code>
                <a
                  href={explorerUrl || '#'}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-purple-400 hover:text-purple-300 transition-colors flex-shrink-0"
                  title="View on BaseScan"
                >
                  <ExternalLink className="w-4 h-4" />
                </a>
              </div>
            </div>
          )}

          {/* Minting Benefits (for generated games) */}
          {action === 'generate' && (
            <div className="space-y-3">
              <p className="text-sm font-semibold text-gray-300">Why mint your game as an NFT?</p>
              <div className="space-y-3">
                {[
                  { icon: Lock, title: 'Own Your Creation', desc: 'Mint your game as an NFT on the Base blockchain and own it forever' },
                  { icon: TrendingUp, title: 'Earn Rewards', desc: 'Get paid when others play your minted games' },
                  { icon: Users, title: 'Build Community', desc: 'Share your game with the world and attract players' },
                  { icon: Zap, title: 'Increase Value', desc: 'The more your game is played, the more valuable your NFT becomes' },
                ].map((benefit, idx) => {
                  const Icon = benefit.icon
                  return (
                    <div key={idx} className="flex gap-3 p-3 rounded-lg bg-purple-900/20 border border-purple-600/30">
                      <Icon className="w-5 h-5 text-purple-400 flex-shrink-0 mt-0.5" />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold text-purple-300">{benefit.title}</p>
                        <p className="text-xs text-purple-200">{benefit.desc}</p>
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          )}

          {/* Next Steps */}
          <div className="bg-green-900/20 border border-green-600/30 rounded-lg p-4 text-left">
            <p className="text-sm font-semibold text-green-300 mb-2">What's next?</p>
            <ul className="text-xs text-green-200 space-y-1">
              {action === 'mint' && (
                <>
                  <li>✓ Your game has been minted as an NFT</li>
                  <li>✓ Share your game with others</li>
                  <li>✓ Earn rewards when others play it</li>
                </>
              )}
              {action === 'generate' && (
                <>
                  <li>✓ Your game is ready to play</li>
                  <li>✓ Customize and mint it as an NFT</li>
                  <li>✓ Share with your community</li>
                </>
              )}
            </ul>
          </div>
        </div>

        {/* Actions */}
        <div className="flex gap-3 p-8 border-t border-gray-800">
          <Button
            variant="outline"
            onClick={onClose}
            className="flex-1 text-gray-300 border-gray-600 hover:bg-gray-800"
          >
            Close
          </Button>

          {gameUrl && (
            <Button
              onClick={() => window.open(gameUrl, '_blank')}
              className="flex-1 bg-green-600 hover:bg-green-700 flex items-center justify-center gap-2"
            >
              <Eye className="w-4 h-4" />
              View Game
            </Button>
          )}

          {gameUrl && (
            <Button
              onClick={() => handleCopy(gameUrl)}
              className="flex-1 bg-purple-600 hover:bg-purple-700 flex items-center justify-center gap-2"
              title="Share game"
            >
              <Share2 className="w-4 h-4" />
              {copied ? 'Copied!' : 'Share'}
            </Button>
          )}
        </div>
      </div>
    </div>
  )
}
