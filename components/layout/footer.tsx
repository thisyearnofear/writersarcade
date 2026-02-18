import Link from 'next/link'
import { ExternalLink } from 'lucide-react'

const NAV_LINKS = [
  { href: '/games', label: 'Games' },
  { href: '/generate', label: 'Generate' },
  { href: '/workshop', label: 'Workshop' },
  { href: '/assets', label: 'Assets' },
  { href: '/my-games', label: 'My Games' },
]

const CONTRACT_LINKS = [
  {
    label: 'GameNFT',
    address: '0x778C87dAA2b284982765688AE22832AADae7dccC',
    href: 'https://basescan.org/address/0x778C87dAA2b284982765688AE22832AADae7dccC',
  },
  {
    label: 'WriterCoinPayment',
    address: '0xf11822F99FF5f6982d42d4A0923d2b3f9589fA75',
    href: 'https://basescan.org/address/0xf11822F99FF5f6982d42d4A0923d2b3f9589fA75',
  },
]

const SOCIAL_LINKS = [
  { label: 'GitHub', href: 'https://github.com/thisyearnofear/WritArcade' },
  { label: 'Farcaster', href: 'https://warpcast.com/~/channel/writarcade' },
]

export function Footer() {
  return (
    <footer className="border-t border-gray-800 bg-black/80 py-10">
      <div className="max-w-6xl mx-auto px-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8 mb-8">
          {/* Brand */}
          <div>
            <p className="text-white font-semibold mb-2">WritArcade</p>
            <p className="text-gray-400 text-sm leading-relaxed">
              Turn articles into playable, mintable games with on-chain IP and revenue splits.
            </p>
          </div>

          {/* Navigation */}
          <div>
            <p className="text-gray-300 text-xs font-semibold uppercase tracking-wider mb-3">Explore</p>
            <ul className="space-y-2">
              {NAV_LINKS.map((link) => (
                <li key={link.href}>
                  <Link
                    href={link.href}
                    className="text-gray-400 hover:text-white text-sm transition-colors"
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Contracts */}
          <div>
            <p className="text-gray-300 text-xs font-semibold uppercase tracking-wider mb-3">
              Contracts · Base Mainnet
            </p>
            <ul className="space-y-2">
              {CONTRACT_LINKS.map((c) => (
                <li key={c.label}>
                  <a
                    href={c.href}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-gray-400 hover:text-purple-400 text-xs font-mono flex items-center gap-1 transition-colors"
                  >
                    <span>{c.label}</span>
                    <ExternalLink className="w-3 h-3 flex-shrink-0" />
                  </a>
                  <span className="text-gray-600 text-xs font-mono">
                    {c.address.slice(0, 6)}…{c.address.slice(-4)}
                  </span>
                </li>
              ))}
            </ul>
          </div>

          {/* Community */}
          <div>
            <p className="text-gray-300 text-xs font-semibold uppercase tracking-wider mb-3">Community</p>
            <ul className="space-y-2">
              {SOCIAL_LINKS.map((link) => (
                <li key={link.label}>
                  <a
                    href={link.href}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-gray-400 hover:text-white text-sm flex items-center gap-1 transition-colors"
                  >
                    {link.label}
                    <ExternalLink className="w-3 h-3" />
                  </a>
                </li>
              ))}
            </ul>
          </div>
        </div>

        {/* Bottom bar */}
        <div className="border-t border-gray-800 pt-6 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-gray-500">
          <span>© {new Date().getFullYear()} WritArcade. Built on Base · Story Protocol.</span>
          <div className="flex items-center gap-4">
            <span className="flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-green-500 inline-block" aria-hidden="true" />
              Base Mainnet Live
            </span>
          </div>
        </div>
      </div>
    </footer>
  )
}
