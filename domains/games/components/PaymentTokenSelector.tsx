'use client'

import { MEZO_NETWORK } from '@/lib/wallet/chains'
import { getActiveMusdConfig } from '@/lib/writer-coins'
import { type PaymentToken } from '@/lib/writer-coins'

interface PaymentTokenSelectorProps {
  selectedToken: PaymentToken
  onSelectToken: (token: PaymentToken) => void
  writerCoin: PaymentToken & { type: 'writercoin' }
}

export function PaymentTokenSelector({ selectedToken, onSelectToken, writerCoin }: PaymentTokenSelectorProps) {
  const writerCoinEnabled = writerCoin.coin.paymentEnabled
  const musdUsable = getActiveMusdConfig().paymentSplitter !== '0x0000000000000000000000000000000000000000'

  return (
    <div className="flex gap-2 p-1 rounded-lg bg-card/50 border border-brand/20 mb-4">
      <button
        type="button"
        onClick={() => writerCoinEnabled && onSelectToken(writerCoin)}
        disabled={!writerCoinEnabled}
        className={`flex-1 px-3 py-2 rounded-md text-xs font-bold uppercase tracking-wider transition-colors ${
          selectedToken.type === 'writercoin'
            ? 'bg-brand text-brand-foreground shadow-lg'
            : writerCoinEnabled
              ? 'text-brand hover:bg-brand/50'
              : 'text-muted-foreground cursor-not-allowed opacity-60'
        }`}
      >
        <span className="block">{writerCoin.coin.symbol}</span>
        <span className={`block text-[10px] font-normal normal-case tracking-normal mt-0.5 ${
          selectedToken.type === 'writercoin' ? 'text-brand' : 'text-brand/60'
        }`}>
          {writerCoinEnabled ? 'Writer coin · Base' : 'Use MUSD'}
        </span>
      </button>
      <button
        type="button"
        onClick={() => musdUsable && onSelectToken({ type: 'musd', network: MEZO_NETWORK })}
        disabled={!musdUsable}
        className={`flex-1 px-3 py-2 rounded-md text-xs font-bold uppercase tracking-wider transition-colors ${
          selectedToken.type === 'musd'
            ? 'bg-warning text-warning-foreground shadow-lg'
            : musdUsable
              ? 'text-warning hover:bg-warning/50'
              : 'text-muted-foreground cursor-not-allowed opacity-60'
        }`}
      >
        <span className="block">MUSD</span>
        <span className={`block text-[10px] font-normal normal-case tracking-normal mt-0.5 ${
          selectedToken.type === 'musd' ? 'text-warning' : 'text-warning/60'
        }`}>
          {musdUsable ? 'Mezo · universal' : 'Use credits (top up with MUSD)'}
        </span>
      </button>
      <button
        type="button"
        onClick={() => onSelectToken({ type: 'credits' })}
        className={`flex-1 px-3 py-2 rounded-md text-xs font-bold uppercase tracking-wider transition-colors ${
          selectedToken.type === 'credits'
            ? 'bg-success text-success-foreground shadow-lg'
            : 'text-success hover:bg-success/50'
        }`}
      >
        <span className="block">Credits</span>
        <span className={`block text-[10px] font-normal normal-case tracking-normal mt-0.5 ${
          selectedToken.type === 'credits' ? 'text-success' : 'text-success/60'
        }`}>
          No crypto needed
        </span>
      </button>
    </div>
  )
}
