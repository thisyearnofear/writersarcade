import { ExternalLink } from 'lucide-react'
import { MEZO_NETWORK } from '@/lib/wallet/chains'

const OPTIONS = {
  testnet: [
    { label: 'Get test BTC — Mezo faucet', href: 'https://faucet.test.mezo.org' },
    { label: 'Borrow MUSD against test BTC', href: 'https://testnet.mezo.org' },
  ],
  mainnet: [
    { label: 'Borrow MUSD against BTC (1% fixed)', href: 'https://mezo.org/borrow' },
    { label: 'Buy MUSD with card (Banxa, in the Mezo app)', href: 'https://mezo.org' },
    { label: 'Bridge MUSD from Ethereum (Wormhole Portal)', href: 'https://portalbridge.com' },
  ],
} as const

/**
 * Compact "Get MUSD" link list, shown when a user's MUSD balance is short.
 * Network-aware: testnet surfaces the faucet, mainnet the real on-ramps.
 */
export function GetMusdOptions({ className = '' }: { className?: string }) {
  return (
    <ul className={`space-y-1 ${className}`}>
      {OPTIONS[MEZO_NETWORK].map((o) => (
        <li key={o.href}>
          <a
            href={o.href}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 text-[10px] font-semibold text-amber-500 transition-colors hover:text-amber-400"
          >
            {o.label} <ExternalLink className="h-2.5 w-2.5" />
          </a>
        </li>
      ))}
    </ul>
  )
}
