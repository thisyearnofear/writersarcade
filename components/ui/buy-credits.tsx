'use client'

import { GetMusdOptions } from '@/components/mezo/GetMusdOptions'
import { useState, useEffect, useRef } from 'react'
import { useAccount, useWalletClient, useSwitchChain } from 'wagmi'
import { useConnectModal } from '@rainbow-me/rainbowkit'
import { useWeb3Auth } from '@/components/providers/Web3Provider'
import { Coins, Loader2, Plus, ExternalLink, X, ArrowRight } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { motion, AnimatePresence } from 'framer-motion'
import { CREDITS_CONFIG, MEZO_TREASURY_ADDRESS, getActiveMusdConfig } from '@/lib/writer-coins'
import { MEZO_ACTIVE_CHAIN_ID, MEZO_ACTIVE_EXPLORER, MEZO_NETWORK } from '@/lib/wallet/chains'
import { useMUSDBalance } from '@/hooks/useMUSDBalance'
import { useOverlay, OverlayPortal } from '@/components/ui/overlay'

const ERC20_TRANSFER_ABI = [{
  name: 'transfer',
  type: 'function',
  stateMutability: 'nonpayable',
  inputs: [
    { name: 'to', type: 'address' },
    { name: 'amount', type: 'uint256' },
  ],
  outputs: [{ name: '', type: 'bool' }],
}] as const

interface CreditsData {
  credits: number
  totalPurchased: number
}

const FIAT_AMOUNTS = [500, 1000, 2500, 5000]
const CREDITS_PER_DOLLAR = 10

// A confirmed wallet transfer whose credit grant hasn't been verified yet.
// Persisted so a modal close / refresh never strands a paid top-up.
const PENDING_MUSD_KEY = 'wa:musd-pending-topup'
// Mezo receipts can lag the wallet callback well past 10s — ~26s of retries.
const MUSD_VERIFY_DELAYS_MS = [3000, 4000, 5000, 6000, 8000]

export const OPEN_BUY_CREDITS_EVENT = 'wa:open-buy-credits'

export function openBuyCredits() {
  window.dispatchEvent(new Event(OPEN_BUY_CREDITS_EVENT))
}

export function BuyCreditsButton({ showPill = true }: { showPill?: boolean }) {
  const { address, isConnected, chainId } = useAccount()
  const { status: authStatus } = useWeb3Auth()
  const { openConnectModal } = useConnectModal()
  const { data: walletClient } = useWalletClient()
  const { switchChainAsync } = useSwitchChain()
  const { balance: musdBalance, formatted: musdFormatted, refresh: refreshMUSDBalance } = useMUSDBalance()
  const [credits, setCredits] = useState<CreditsData | null>(null)
  const [loading, setLoading] = useState(false)
  const [showModal, setShowModal] = useState(false)
  const [selectedAmount, setSelectedAmount] = useState(1000)
  const [paymentMethod, setPaymentMethod] = useState<'musd' | 'card' | null>(null)
  const [quoteLoading, setQuoteLoading] = useState(false)
  const [widgetUrl, setWidgetUrl] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [needsEmail, setNeedsEmail] = useState(false)
  const [email, setEmail] = useState('')
  const [emailSent, setEmailSent] = useState(false)
  const [musdLoading, setMusdLoading] = useState(false)
  const [musdTxHash, setMusdTxHash] = useState<string | null>(null)
  const [musdStep, setMusdStep] = useState<string | null>(null)
  const [musdGranted, setMusdGranted] = useState<{ credits: number; boost: boolean } | null>(null)
  const [pendingMusdTx, setPendingMusdTx] = useState<string | null>(null)
  const successRef = useRef<HTMLDivElement | null>(null)

  const effectivePaymentMethod = paymentMethod ?? (isConnected ? 'musd' : 'card')

  useEffect(() => {
    setLoading(true)
    // Wallet users are keyed by address; guests/email users by session cookie.
    const query = address ? `?wallet=${encodeURIComponent(address)}` : ''
    fetch(`/api/ramp/credits${query}`)
      .then(r => r.json())
      .then(data => {
        if (data.success) setCredits(data.data)
      })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [address])

  const refreshCredits = async () => {
    const query = address ? `?wallet=${encodeURIComponent(address)}` : ''
    const data = await fetch(`/api/ramp/credits${query}`).then(r => r.json()).catch(() => null)
    if (data?.success) setCredits(data.data)
  }

  // Open via global event so any surface (menus, payment flows) can launch
  // the modal without rendering its own copy of it.
  useEffect(() => {
    const handler = () => {
      refreshCredits()
      setShowModal(true)
    }
    window.addEventListener(OPEN_BUY_CREDITS_EVENT, handler)
    return () => window.removeEventListener(OPEN_BUY_CREDITS_EVENT, handler)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [address])

  // Escape to close + lock body scroll while the modal is open.
  useOverlay(showModal, () => setShowModal(false))

  // A finished purchase shouldn't block the next one — reset on close.
  useEffect(() => {
    if (!showModal) {
      setMusdGranted(null)
      setMusdTxHash(null)
    }
  }, [showModal])

  // Bring the success confirmation into view after an MUSD purchase.
  useEffect(() => {
    if (musdGranted) {
      successRef.current?.scrollIntoView({ block: 'nearest' })
    }
  }, [musdGranted])

  // Restore a persisted pending MUSD top-up for this wallet (on mount and
  // every time the modal opens) so an interrupted verification can be
  // finished manually instead of stranding a paid transfer.
  useEffect(() => {
    try {
      const raw = localStorage.getItem(PENDING_MUSD_KEY)
      const parsed = raw ? (JSON.parse(raw) as { txHash?: string; wallet?: string }) : null
      if (parsed?.txHash && parsed.wallet && address && parsed.wallet.toLowerCase() === address.toLowerCase()) {
        setPendingMusdTx(parsed.txHash)
      } else {
        setPendingMusdTx(null)
      }
    } catch {
      setPendingMusdTx(null)
    }
  }, [address, showModal])

  // After a user who paid while signed out finishes SIWE, complete the grant
  // for their saved pending tx automatically (once per tx).
  const autoVerifyRef = useRef<string | null>(null)
  useEffect(() => {
    if (authStatus !== 'authenticated') {
      autoVerifyRef.current = null
      return
    }
    if (!showModal || !pendingMusdTx || autoVerifyRef.current === pendingMusdTx) return
    autoVerifyRef.current = pendingMusdTx
    void verifyMusdPurchase(pendingMusdTx).catch(err =>
      setError(err instanceof Error ? err.message : 'Verification failed')
    )
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [authStatus, showModal, pendingMusdTx])

  const handleBuyCredits = async () => {
    setQuoteLoading(true)
    setError(null)
    try {
      const quoteRes = await fetch('/api/ramp/quote', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ fiatAmount: selectedAmount }),
      })
      const quoteData = await quoteRes.json()
      if (!quoteData.success) throw new Error(quoteData.error)

      const orderRes = await fetch('/api/ramp/order', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          quoteId: quoteData.data.quoteId,
          fiatAmount: selectedAmount,
        }),
      })
      const orderData = await orderRes.json()
      if (orderRes.status === 409 && orderData.code === 'EMAIL_REQUIRED') {
        setNeedsEmail(true)
        return
      }
      if (!orderData.success) throw new Error(orderData.error)

      if (orderData.data.widgetUrl) {
        setWidgetUrl(orderData.data.widgetUrl)
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create order')
    } finally {
      setQuoteLoading(false)
    }
  }

  const musdAmountWei = BigInt(selectedAmount / 100) * 1_000_000_000_000_000_000n
  const musdUnits = selectedAmount / 100
  const isWrongMezoChain = isConnected && chainId !== MEZO_ACTIVE_CHAIN_ID
  const hasInsufficientMusd = musdBalance < musdAmountWei
  // Connected is not enough — wallet-gated routes need the SIWE session.
  const needsWalletSignIn = isConnected && authStatus !== 'authenticated'

  const persistPendingMusdTx = (txHash: string) => {
    if (!address) return
    try {
      localStorage.setItem(PENDING_MUSD_KEY, JSON.stringify({ txHash, wallet: address, ts: Date.now() }))
    } catch {
      // storage unavailable (private mode etc.) — in-memory state still works
    }
    setPendingMusdTx(txHash)
  }

  const clearPendingMusdTx = () => {
    try {
      localStorage.removeItem(PENDING_MUSD_KEY)
    } catch {
      // storage unavailable — in-memory state still works
    }
    setPendingMusdTx(null)
  }

  // POSTs the tx hash to the idempotent grant endpoint (a replayed hash
  // returns the original grant) with widening retries — Mezo receipts can
  // lag the wallet callback. Shared by the auto-verify loop in
  // handlePayWithMusd and the manual "Verify payment" recovery button.
  const verifyMusdPurchase = async (txHash: string) => {
    setMusdLoading(true)
    setMusdStep('Verifying on-chain…')
    setError(null)
    try {
      let lastError = 'Verification failed'
      for (const delay of MUSD_VERIFY_DELAYS_MS) {
        await new Promise(r => setTimeout(r, delay))
        let res: Response
        try {
          res = await fetch('/api/credits/purchase-musd', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ transactionHash: txHash, chainId: MEZO_ACTIVE_CHAIN_ID }),
          })
        } catch {
          continue // network blip — keep retrying within the delay budget
        }
        const data = await res.json().catch(() => ({}))
        if (res.ok && data.success) {
          setMusdGranted({ credits: data.data.creditsGranted ?? 0, boost: Boolean(data.data.mezoHolderBoost) })
          setMusdTxHash(txHash)
          clearPendingMusdTx()
          await Promise.all([refreshCredits(), refreshMUSDBalance()])
          return
        }
        if (res.status === 401) {
          throw new Error('Sign in with your wallet to finish — your payment is saved.')
        }
        // Only an unconfirmed receipt is worth retrying — anything else won't change.
        if (!(res.status === 409 && data.code === 'TX_NOT_CONFIRMED')) {
          throw new Error(data.error || lastError)
        }
        lastError = data.error || lastError
      }
      throw new Error(lastError)
    } finally {
      setMusdLoading(false)
      setMusdStep(null)
    }
  }

  const handlePayWithMusd = async () => {
    if (needsWalletSignIn) {
      openConnectModal?.()
      return
    }
    if (!walletClient || !address) return
    setMusdLoading(true)
    setMusdStep('Confirm MUSD transfer in your wallet…')
    setError(null)
    setMusdTxHash(null)
    setMusdGranted(null)
    let txHash: `0x${string}`
    try {
      txHash = await walletClient.writeContract({
        address: getActiveMusdConfig().address,
        abi: ERC20_TRANSFER_ABI,
        functionName: 'transfer',
        args: [MEZO_TREASURY_ADDRESS, musdAmountWei],
        account: address,
        chain: null,
      })
    } catch (err) {
      setError(err instanceof Error ? err.message : 'MUSD payment failed')
      setMusdLoading(false)
      setMusdStep(null)
      return
    }
    setMusdTxHash(txHash)
    persistPendingMusdTx(txHash)
    try {
      await verifyMusdPurchase(txHash)
    } catch (err) {
      // The transfer may still have landed — keep the pending record so the
      // user can finish verification with the "Verify payment" button.
      const msg = err instanceof Error ? err.message : 'Verification failed'
      setError(msg.endsWith('saved.') ? msg : `${msg} — if your wallet confirmed the transfer, press "Verify payment" to finish.`)
    }
  }

  const handleSendMagicLink = async () => {
    setQuoteLoading(true)
    setError(null)
    try {
      const res = await fetch('/api/auth/email/request', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email,
          redirect: typeof window !== 'undefined' ? window.location.pathname : '/studio',
        }),
      })
      const data = await res.json()
      if (!data.success) throw new Error(data.error || 'Failed to send link')
      setEmailSent(true)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to send link')
    } finally {
      setQuoteLoading(false)
    }
  }

  // Show the pill for wallet users and for no-wallet actors with a credit
  // balance (guests/email users from the studio flow). The modal stays
  // mounted regardless so the wa:open-buy-credits event always works.
  const pillVisible = showPill && (isConnected || credits !== null)

  const modal = (
    <AnimatePresence>
      {showModal && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[80] flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm"
          onClick={() => setShowModal(false)}
        >
          <motion.div
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.95, opacity: 0 }}
            onClick={e => e.stopPropagation()}
            role="dialog"
            aria-modal="true"
            aria-label="Buy credits"
            className="max-h-[calc(100dvh-2rem)] w-full max-w-md overflow-y-auto overscroll-contain rounded-xl border border-border bg-card p-5 shadow-xl"
          >
            {widgetUrl ? (
              <div className="text-center space-y-4">
                <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-emerald-500/20 text-emerald-400">
                  <ExternalLink className="h-6 w-6" />
                </div>
                <h2 className="text-lg font-bold text-foreground">Complete your purchase</h2>
                <p className="text-sm text-muted-foreground">
                  You'll be redirected to Etherfuse to complete the onramp.
                </p>
                <a
                  href={widgetUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex w-full items-center justify-center gap-2 rounded-lg bg-emerald-600 px-4 py-3 font-semibold text-white transition hover:bg-emerald-500"
                >
                  Continue to Etherfuse <ExternalLink className="h-4 w-4" />
                </a>
                <button
                  onClick={() => { setShowModal(false); setWidgetUrl(null) }}
                  className="text-sm text-muted-foreground hover:text-foreground"
                >
                  Close
                </button>
              </div>
            ) : needsEmail ? (
              <div className="space-y-4">
                <div>
                  <h2 className="text-lg font-bold text-foreground">Add your email first</h2>
                  <p className="mt-1 text-sm text-muted-foreground">
                    Your credits need a home that survives cleared cookies.
                    We'll send you a sign-in link — no password, no wallet.
                  </p>
                </div>
                {emailSent ? (
                  <div className="rounded-lg border border-emerald-500/30 bg-emerald-500/10 p-4 text-sm text-foreground">
                    Check your inbox — click the link, then come back and buy credits.
                  </div>
                ) : (
                  <>
                    <input
                      type="email"
                      value={email}
                      onChange={e => setEmail(e.target.value)}
                      placeholder="you@example.com"
                      className="w-full rounded-lg border border-border bg-background p-3 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-emerald-500/50"
                    />
                    {error && <p className="text-xs text-red-400">{error}</p>}
                    <Button
                      onClick={handleSendMagicLink}
                      disabled={quoteLoading || !email.includes('@')}
                      className="w-full bg-emerald-600 hover:bg-emerald-500 text-white"
                      size="lg"
                    >
                      {quoteLoading ? (
                        <><Loader2 className="h-4 w-4 animate-spin" /> Sending…</>
                      ) : (
                        'Send sign-in link'
                      )}
                    </Button>
                  </>
                )}
                <button
                  onClick={() => { setNeedsEmail(false); setEmailSent(false); setError(null) }}
                  className="w-full text-center text-sm text-muted-foreground hover:text-foreground"
                >
                  Back
                </button>
              </div>
            ) : (
              <>
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <h2 className="text-lg font-bold text-foreground">Buy Credits</h2>
                    <p className="text-sm text-muted-foreground">
                      {credits !== null && `${credits.credits} credits available`}
                    </p>
                  </div>
                  <button
                    onClick={() => setShowModal(false)}
                    aria-label="Close"
                    className="rounded-full p-1 text-muted-foreground hover:text-foreground"
                  >
                    <X className="h-5 w-5" />
                  </button>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  {FIAT_AMOUNTS.map(amount => {
                    const creditsAmount = (amount / 100) * CREDITS_PER_DOLLAR
                    return (
                      <button
                        key={amount}
                        onClick={() => setSelectedAmount(amount)}
                        className={cn(
                          'rounded-lg border p-3 text-left transition',
                          selectedAmount === amount
                            ? 'border-emerald-500 bg-emerald-500/10'
                            : 'border-border bg-muted/50 hover:border-muted-foreground/30'
                        )}
                      >
                        <div className="text-lg font-bold text-foreground">{creditsAmount} credits</div>
                        <div className="text-xs text-muted-foreground mt-0.5">${(amount / 100).toFixed(2)} · {amount / 100} MUSD</div>
                      </button>
                    )
                  })}
                </div>

                <p className="mt-3 text-center text-[11px] text-muted-foreground">
                  Generate a game · {CREDITS_CONFIG.cost['generate-game']} · Mint NFT · {CREDITS_CONFIG.cost['mint-nft']} · Animate comic · {CREDITS_CONFIG.cost['video-upsell']}
                </p>

                {isConnected && (
                  <div className="mt-4 grid grid-cols-2 rounded-lg border border-border bg-muted/40 p-1 text-xs font-semibold">
                    <button
                      type="button"
                      onClick={() => setPaymentMethod('musd')}
                      className={cn(
                        'rounded-md px-3 py-1.5 transition',
                        effectivePaymentMethod === 'musd'
                          ? 'bg-amber-500/20 text-amber-300'
                          : 'text-muted-foreground hover:text-foreground'
                      )}
                    >
                      MUSD on Mezo
                    </button>
                    <button
                      type="button"
                      onClick={() => setPaymentMethod('card')}
                      className={cn(
                        'rounded-md px-3 py-1.5 transition',
                        effectivePaymentMethod === 'card'
                          ? 'bg-emerald-500/20 text-emerald-300'
                          : 'text-muted-foreground hover:text-foreground'
                      )}
                    >
                      Card
                    </button>
                  </div>
                )}

                {error && (
                  <p className="mt-3 text-xs text-red-400">{error}</p>
                )}

                {effectivePaymentMethod === 'card' && (
                  <>
                    <Button
                      onClick={handleBuyCredits}
                      disabled={quoteLoading}
                      className="mt-4 w-full bg-emerald-600 hover:bg-emerald-500 text-white"
                      size="lg"
                    >
                      {quoteLoading ? (
                        <><Loader2 className="h-4 w-4 animate-spin" /> Processing…</>
                      ) : (
                        <><Coins className="h-4 w-4" /> Buy ${(selectedAmount / 100).toFixed(2)} worth</>
                      )}
                    </Button>
                    <p className="mt-2 text-center text-[10px] text-muted-foreground">
                      Powered by Etherfuse — fiat to crypto onramp on Base
                    </p>
                  </>
                )}

                {isConnected && effectivePaymentMethod === 'musd' && (
                  <>
                    {musdGranted ? (
                      <div ref={successRef} className="mt-3 rounded-lg border border-amber-500/30 bg-amber-500/10 p-3 text-xs text-amber-200">
                        <p className="font-semibold">
                          {`+${musdGranted.credits} credits added`}
                          {musdGranted.boost && ' — incl. +10% MEZO holder bonus'}
                        </p>
                        {musdTxHash && (
                          <a
                            href={`${MEZO_ACTIVE_EXPLORER}/tx/${musdTxHash}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="mt-1 flex items-center gap-1 underline hover:text-amber-100"
                          >
                            View on Mezo Explorer <ExternalLink className="w-3 h-3" />
                          </a>
                        )}
                        <a
                          href="/generate"
                          className="mt-3 flex w-full items-center justify-center gap-2 rounded-lg bg-amber-600 px-4 py-2 font-semibold text-white transition hover:bg-amber-500"
                        >
                          Generate a game now <ArrowRight className="h-3.5 w-3.5" />
                        </a>
                        <button
                          type="button"
                          onClick={() => { setMusdGranted(null); setMusdTxHash(null) }}
                          className="mt-2 w-full text-center underline hover:text-amber-100"
                        >
                          Buy more credits
                        </button>
                      </div>
                    ) : pendingMusdTx ? (
                      <div className="mt-3 rounded-lg border border-amber-500/30 bg-amber-500/10 p-3 text-xs text-amber-200">
                        <p className="font-semibold">Payment pending — verify on-chain</p>
                        <p className="mt-1 text-amber-200/70">
                          Your MUSD transfer was sent but the credit grant hasn't confirmed yet.
                        </p>
                        {needsWalletSignIn && (
                          <p className="mt-1 text-amber-200/70">
                            Sign the wallet message to confirm it's you, then verify.
                          </p>
                        )}
                        <a
                          href={`${MEZO_ACTIVE_EXPLORER}/tx/${pendingMusdTx}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="mt-1 flex items-center gap-1 underline hover:text-amber-100"
                        >
                          {pendingMusdTx.slice(0, 10)}…{pendingMusdTx.slice(-6)} <ExternalLink className="w-3 h-3" />
                        </a>
                        <button
                          type="button"
                          onClick={() => {
                            if (needsWalletSignIn) {
                              openConnectModal?.()
                              return
                            }
                            void verifyMusdPurchase(pendingMusdTx).catch(err =>
                              setError(err instanceof Error ? err.message : 'Verification failed')
                            )
                          }}
                          disabled={musdLoading}
                          className="mt-3 flex w-full items-center justify-center gap-2 rounded-lg bg-amber-600 px-4 py-2 font-semibold text-white transition hover:bg-amber-500 disabled:opacity-50"
                        >
                          {musdLoading ? (
                            <><Loader2 className="h-3.5 w-3.5 animate-spin" /> {musdStep ?? 'Verifying…'}</>
                          ) : needsWalletSignIn ? (
                            'Sign in to verify payment'
                          ) : (
                            'Verify payment'
                          )}
                        </button>
                        <button
                          type="button"
                          onClick={clearPendingMusdTx}
                          disabled={musdLoading}
                          className="mt-2 w-full text-center text-[11px] text-amber-200/70 underline hover:text-amber-100 disabled:opacity-50"
                        >
                          Dismiss and send a new payment
                        </button>
                      </div>
                    ) : (
                      <>
                        <div className="mt-4 rounded-lg border border-amber-500/20 bg-amber-500/5 p-3 text-xs text-muted-foreground">
                          <div className="flex justify-between">
                            <span>You pay</span>
                            <span className="font-semibold text-amber-300">{musdUnits} MUSD</span>
                          </div>
                          <div className="mt-1 flex justify-between">
                            <span>Your MUSD balance</span>
                            <span className={cn('font-semibold', hasInsufficientMusd ? 'text-red-400' : 'text-amber-300')}>
                              {musdFormatted} MUSD
                            </span>
                          </div>
                        </div>
                        <Button
                          onClick={needsWalletSignIn ? () => openConnectModal?.() : isWrongMezoChain ? () => switchChainAsync({ chainId: MEZO_ACTIVE_CHAIN_ID }).catch(() => {}) : handlePayWithMusd}
                          disabled={musdLoading || (!needsWalletSignIn && !isWrongMezoChain && hasInsufficientMusd)}
                          className="mt-3 w-full bg-amber-600 hover:bg-amber-500 text-white"
                          size="lg"
                        >
                          {musdLoading ? (
                            <><Loader2 className="h-4 w-4 animate-spin" /> {musdStep ?? 'Processing…'}</>
                          ) : needsWalletSignIn ? (
                            <>Sign in with wallet to pay <ArrowRight className="h-4 w-4" /></>
                          ) : isWrongMezoChain ? (
                            <>Switch to Mezo <ArrowRight className="h-4 w-4" /></>
                          ) : (
                            <><Coins className="h-4 w-4" /> Pay {musdUnits} MUSD on Mezo</>
                          )}
                        </Button>
                        {hasInsufficientMusd && !isWrongMezoChain && (
                          <div className="mt-2 flex justify-center">
                            <GetMusdOptions />
                          </div>
                        )}
                        <p className="mt-2 text-center text-[10px] text-muted-foreground">
                          MUSD on Mezo {MEZO_NETWORK === 'mainnet' ? 'mainnet' : 'testnet'} — verified on-chain, credits granted instantly.
                          {' '}<span className="text-amber-400/80">MEZO holders earn +10%.</span>
                        </p>
                      </>
                    )}
                  </>
                )}
              </>
            )}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )

  return (
    <>
      {pillVisible && (
        <button
          type="button"
          onClick={() => setShowModal(true)}
          className="flex items-center gap-1.5 rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-2.5 py-1.5 text-xs font-semibold text-emerald-400 transition hover:bg-emerald-500/20 hover:border-emerald-400/40"
        >
          <Coins className="w-3.5 h-3.5" />
          {loading ? (
            <Loader2 className="w-3 h-3 animate-spin" />
          ) : (
            <span>{credits?.credits ?? 0}</span>
          )}
          <Plus className="w-3 h-3" />
        </button>
      )}

      <OverlayPortal>{modal}</OverlayPortal>
    </>
  )
}
