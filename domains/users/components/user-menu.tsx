'use client'

import { useState, useEffect, useRef } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import {
  LogOut,
  Settings,
  GamepadIcon,
  Wallet,
  MoreVertical,
  Circle,
  Moon,
  Sun,
  LayoutDashboard,
  HelpCircle,
  Coins
} from 'lucide-react'
import { useAccount, useDisconnect, useEnsName, useEnsAvatar } from 'wagmi'
import { normalize } from 'viem/ens'
import { mainnet } from 'viem/chains'
import { useAccountModal } from '@rainbow-me/rainbowkit'
import { WalletConnect } from '@/domains/users/components/wallet-connect'
import { getFarcasterProfile } from '@/domains/farcaster/services/farcaster'
import type { FarcasterProfile } from '@/domains/farcaster/services/farcaster'
import { useDarkMode } from '@/components/providers/DarkModeProvider'
import { NetworkIndicatorCompact } from '@/components/layout/NetworkIndicator'
import { openBuyCredits } from '@/domains/payments/components/buy-credits'
import { logger } from '@/lib/config'

interface UserMenuProps {
  mobileLayout?: boolean
}

export function UserMenu({ mobileLayout = false }: UserMenuProps) {
  const { address, isConnected } = useAccount()
  const { disconnect } = useDisconnect()
  const { openAccountModal } = useAccountModal()
  const { isDarkMode, toggleDarkMode } = useDarkMode()
  const [isOpen, setIsOpen] = useState(false)
  const [mounted, setMounted] = useState(false)
  const menuRef = useRef<HTMLDivElement | null>(null)
  const kebabRef = useRef<HTMLButtonElement | null>(null)
  const containerRef = useRef<HTMLDivElement | null>(null)
  const [profile, setProfile] = useState<FarcasterProfile | null>(null)
  const [_isLoadingProfile, setIsLoadingProfile] = useState(false)
  const router = useRouter()

  // ENS name + avatar via wagmi (uses the configured CORS-friendly mainnet transport)
  const { data: ensNameData } = useEnsName({
    address,
    chainId: mainnet.id,
    query: { enabled: Boolean(address && isConnected) },
  })
  const ensName = ensNameData ?? null
  const { data: ensAvatarData } = useEnsAvatar({
    name: ensName ? normalize(ensName) : undefined,
    chainId: mainnet.id,
    // viem defaults to ipfs.io, which no longer serves plain fetches (and has
    // no CORS headers). Pinata's gateway serves the same content with ACAO:*.
    assetGatewayUrls: { ipfs: 'https://gateway.pinata.cloud' },
    query: { enabled: Boolean(ensName) },
  })
  const ensAvatar = ensAvatarData ?? null

  useEffect(() => { setMounted(true) }, [])

  // Close on outside click (covers kebab + menu) and on Escape.
  useEffect(() => {
    if (!isOpen) return
    const handleMouseDown = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false)
      }
    }
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setIsOpen(false)
    }
    document.addEventListener('mousedown', handleMouseDown)
    document.addEventListener('keydown', handleKey)
    return () => {
      document.removeEventListener('mousedown', handleMouseDown)
      document.removeEventListener('keydown', handleKey)
    }
  }, [isOpen])

  // Fetch Farcaster profile when wallet connects
  useEffect(() => {
    if (!address || !isConnected) {
      setProfile(null)
      return
    }

    const loadProfile = async () => {
      setIsLoadingProfile(true)
      try {
        const farcasterProfile = await getFarcasterProfile(address)
        setProfile(farcasterProfile)
      } catch (error) {
        logger.error('Failed to load Farcaster profile:', error)
        setProfile(null)
      } finally {
        setIsLoadingProfile(false)
      }
    }

    loadProfile()
  }, [address, isConnected])

  // Priority: ENS name > Farcaster username > truncated address
  const displayName = ensName
    ? ensName
    : profile?.username
      ? `@${profile.username}`
      : address
        ? `${address.slice(0, 6)}...${address.slice(-4)}`
        : 'User'

  // Priority: ENS avatar > Farcaster PFP > deterministic identicon
  const hasAvatarImage = Boolean(ensAvatar || profile?.pfpUrl)
  const avatarUrl = ensAvatar || profile?.pfpUrl || `https://api.dicebear.com/7.x/identicon/svg?seed=${address || 'user'}`

  const handleLogout = async () => {
    disconnect()
    setIsOpen(false)
    router.push('/')
  }

  // Keep initial server/client render consistent to avoid hydration mismatch
  if (!mounted) {
    return <div className="h-10 w-10" aria-hidden="true" />
  }

  // When not connected, show wallet connect button
  if (!isConnected) {
    return (
      <div className="flex items-center">
        <WalletConnect />
      </div>
    )
  }

  // When connected, show unified wallet + user menu
  return (
    <div ref={containerRef} className="relative flex items-center gap-2">
      {/* Wallet chip -> RainbowKit account modal */}
      <button
        onClick={(e) => { e.preventDefault(); openAccountModal?.() }}
        className={`group flex items-center space-x-3 rounded-lg bg-brand/10 border border-brand/30 hover:bg-brand/20 hover:border-brand/50 transition-all ${
          mobileLayout ? 'px-4 py-3 space-x-4' : 'px-3 py-2'
        }`}
        aria-label="Manage wallet"
        title="Manage wallet"
      >
        {hasAvatarImage ? (
          <img
            src={avatarUrl}
            alt={displayName}
            className={mobileLayout ? 'w-10 h-10 rounded-full' : 'w-8 h-8 rounded-full'}
          />
        ) : (
          <div className={mobileLayout ? 'w-10 h-10' : 'w-8 h-8'}>
            <div className={`bg-gradient-to-br from-brand to-brand rounded-full flex items-center justify-center ${
              mobileLayout ? 'w-10 h-10' : 'w-8 h-8'
            }`}>
              <Wallet className={`${mobileLayout ? 'w-5 h-5' : 'w-4 h-4'} text-white`} />
            </div>
          </div>
        )}
        {mobileLayout ? (
          <div className="flex flex-col items-start min-w-0">
            <span className="flex items-center gap-1.5 text-xs font-medium text-brand">
              <Circle className="w-2 h-2 fill-success text-success" />
              Connected
            </span>
            <span className="group-hover:underline group-focus:underline cursor-pointer text-foreground text-base truncate"
              onClick={(e) => { e.preventDefault(); openAccountModal?.() }}
            >
              {displayName}
            </span>
          </div>
        ) : (
          <Circle className="w-2.5 h-2.5 fill-success text-success shrink-0" />
        )}
      </button>

      {/* Kebab button -> open app menu */}
      <button
        ref={kebabRef}
        onClick={() => setIsOpen(!isOpen)}
        className="p-2 rounded-md border border-brand/30 hover:border-brand/50 hover:bg-brand/10 transition"
        aria-haspopup="menu"
        aria-expanded={isOpen}
        aria-label="Open menu"
        title="Open menu"
      >
        <MoreVertical className="w-4 h-4 text-brand" />
      </button>

      {isOpen && (
          <div
            ref={menuRef}
            className="absolute right-0 top-full mt-2 w-72 max-w-[calc(100vw-2rem)] max-h-[calc(100dvh-5rem)] overflow-y-auto bg-card border border-brand/30 rounded-lg shadow-xl shadow-brand/10 z-[70]"
          >
            <div className="p-4 border-b border-border bg-gradient-to-r from-brand/20 to-brand/20">
              <div className="flex items-center space-x-3">
                {hasAvatarImage ? (
                  <img
                    src={avatarUrl}
                    alt={displayName}
                    className="w-10 h-10 rounded-full"
                  />
                ) : (
                  <div className="w-10 h-10 bg-gradient-to-br from-brand to-brand rounded-full flex items-center justify-center">
                    <Wallet className="w-5 h-5 text-white" />
                  </div>
                )}
                <div className="flex-1 min-w-0">
                  <div className="font-medium text-foreground">{displayName}</div>
                </div>
              </div>
              {isConnected && (
                <div className="mt-2">
                  <NetworkIndicatorCompact />
                </div>
              )}
            </div>

            <div className="p-2 space-y-1">
              <Link
                href="/creators/dashboard"
                className="flex items-center space-x-3 w-full p-3 rounded-lg hover:bg-warning/10 transition-colors group"
                onClick={() => setIsOpen(false)}
              >
                <LayoutDashboard className="w-4 h-4 text-warning group-hover:text-warning" />
                <span className="text-muted-foreground group-hover:text-foreground font-bold uppercase tracking-widest text-[10px]">Creator Studio</span>
              </Link>

              <button
                onClick={() => { setIsOpen(false); openBuyCredits() }}
                className="flex items-center space-x-3 w-full p-3 rounded-lg hover:bg-success/10 transition-colors group text-left"
              >
                <Coins className="w-4 h-4 text-success group-hover:text-success" />
                <span className="text-muted-foreground group-hover:text-foreground">Buy credits</span>
              </button>

              <Link
                href="/profile"
                className="flex items-center space-x-3 w-full p-3 rounded-lg hover:bg-brand/10 transition-colors group"
                onClick={() => setIsOpen(false)}
              >
                <Settings className="w-4 h-4 text-brand group-hover:text-brand" />
                <span className="text-muted-foreground group-hover:text-foreground">Preferences</span>
              </Link>

              <Link
                href="/my-games"
                className="flex items-center space-x-3 w-full p-3 rounded-lg hover:bg-brand/10 transition-colors group"
                onClick={() => setIsOpen(false)}
              >
                <GamepadIcon className="w-4 h-4 text-brand group-hover:text-brand" />
                <span className="text-muted-foreground group-hover:text-foreground">My Games</span>
              </Link>

              <Link
                href="/#how-it-works"
                className="flex items-center space-x-3 w-full p-3 rounded-lg hover:bg-brand/10 transition-colors group"
                onClick={() => setIsOpen(false)}
              >
                <HelpCircle className="w-4 h-4 text-brand group-hover:text-brand" />
                <span className="text-muted-foreground group-hover:text-foreground">How it works</span>
              </Link>

              {mounted && (
                <>
                  <div className="my-1 border-t border-border/50" />
                  <button
                    onClick={toggleDarkMode}
                    className="flex items-center space-x-3 w-full p-3 rounded-lg hover:bg-brand/10 transition-colors group text-left"
                  >
                    {isDarkMode ? (
                      <Moon className="w-4 h-4 text-brand group-hover:text-brand" />
                    ) : (
                      <Sun className="w-4 h-4 text-brand group-hover:text-brand" />
                    )}
                    <span className="text-muted-foreground group-hover:text-foreground">
                      {isDarkMode ? 'Switch to Light' : 'Switch to Dark'}
                    </span>
                  </button>
                </>
              )}

              <div className="my-1 border-t border-border/50" />
              <button
                onClick={handleLogout}
                className="flex items-center space-x-3 w-full p-3 rounded-lg hover:bg-destructive/10 transition-colors group text-left"
              >
                <LogOut className="w-4 h-4 text-destructive group-hover:text-destructive" />
                <span className="text-muted-foreground group-hover:text-foreground">Disconnect Wallet</span>
              </button>
            </div>
          </div>
      )}
    </div>
  )
}
