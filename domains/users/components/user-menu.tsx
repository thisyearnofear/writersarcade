'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import {
  LogOut,
  Settings,
  GamepadIcon,
  Wallet
} from 'lucide-react'
import { useAccount, useDisconnect } from 'wagmi'
import { WalletConnect } from '@/components/ui/wallet-connect'
import { getFarcasterProfile } from '@/lib/farcaster'
import type { FarcasterProfile } from '@/lib/farcaster'

interface UserMenuProps {
  mobileLayout?: boolean
}

export function UserMenu({ mobileLayout = false }: UserMenuProps) {
  const { address, isConnected } = useAccount()
  const { disconnect } = useDisconnect()
  const [isOpen, setIsOpen] = useState(false)
  const [profile, setProfile] = useState<FarcasterProfile | null>(null)
  const [_isLoadingProfile, setIsLoadingProfile] = useState(false)
  const router = useRouter()

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
        console.error('Failed to load Farcaster profile:', error)
        setProfile(null)
      } finally {
        setIsLoadingProfile(false)
      }
    }

    loadProfile()
  }, [address, isConnected])

  // Use Farcaster username if available, otherwise wallet address
  const displayName = profile?.username 
    ? `@${profile.username}` 
    : address 
      ? `${address.slice(0, 6)}...${address.slice(-4)}` 
      : 'User'
  
  const avatarUrl = profile?.pfpUrl || `https://api.dicebear.com/7.x/identicon/svg?seed=${address || 'user'}`

  const handleLogout = async () => {
    disconnect()
    setIsOpen(false)
    router.push('/')
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
    <div className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={`flex items-center space-x-3 rounded-lg bg-purple-600/10 border border-purple-500/30 hover:bg-purple-600/20 hover:border-purple-500/50 transition-all ${
          mobileLayout ? 'px-4 py-3 space-x-4' : 'px-3 py-2'
        }`}
      >
        {profile?.pfpUrl ? (
          <img
            src={avatarUrl}
            alt={displayName}
            className={mobileLayout ? 'w-10 h-10 rounded-full' : 'w-8 h-8 rounded-full'}
          />
        ) : (
          <div className={mobileLayout ? 'w-10 h-10' : 'w-8 h-8'}>
            <div className={`bg-gradient-to-br from-purple-500 to-pink-500 rounded-full flex items-center justify-center ${
              mobileLayout ? 'w-10 h-10' : 'w-8 h-8'
            }`}>
              <Wallet className={`${mobileLayout ? 'w-5 h-5' : 'w-4 h-4'} text-white`} />
            </div>
          </div>
        )}
        <div className={mobileLayout ? 'flex flex-col items-start min-w-0' : 'hidden md:flex flex-col items-start min-w-0'}>
          <span className={`text-xs font-medium ${mobileLayout ? 'text-purple-300' : 'text-purple-300'}`}>Connected</span>
          <span className={`${
            mobileLayout ? 'text-white text-base' : 'text-sm'
          } ${profile?.username ? 'text-white' : 'font-mono text-gray-300'} truncate`}>
            {displayName}
          </span>
        </div>
      </button>

      {isOpen && (
        <>
          {/* Backdrop */}
          <div
            className="fixed inset-0 z-10"
            onClick={() => setIsOpen(false)}
          />

          {/* Menu */}
          <div className="absolute right-0 mt-2 w-72 bg-gray-900 border border-purple-500/30 rounded-lg shadow-xl shadow-purple-500/10 z-20">
            <div className="p-4 border-b border-gray-700 bg-gradient-to-r from-purple-900/20 to-pink-900/20">
              <div className="flex items-center space-x-3">
                {profile?.pfpUrl ? (
                  <img
                    src={avatarUrl}
                    alt={displayName}
                    className="w-10 h-10 rounded-full"
                  />
                ) : (
                  <div className="w-10 h-10 bg-gradient-to-br from-purple-500 to-pink-500 rounded-full flex items-center justify-center">
                    <Wallet className="w-5 h-5 text-white" />
                  </div>
                )}
                <div className="flex-1 min-w-0">
                  <div className="font-medium text-white">{displayName}</div>
                  <div className="text-xs text-purple-300 mt-1 font-mono truncate">
                    {address}
                  </div>
                </div>
              </div>
            </div>

            <div className="p-2">
              <Link
                href="/profile"
                className="flex items-center space-x-3 w-full p-3 rounded-lg hover:bg-purple-600/10 transition-colors group"
                onClick={() => setIsOpen(false)}
              >
                <Settings className="w-4 h-4 text-purple-400 group-hover:text-purple-300" />
                <span className="text-gray-300 group-hover:text-white">Preferences</span>
              </Link>

              <Link
                href="/my-games"
                className="flex items-center space-x-3 w-full p-3 rounded-lg hover:bg-purple-600/10 transition-colors group"
                onClick={() => setIsOpen(false)}
              >
                <GamepadIcon className="w-4 h-4 text-purple-400 group-hover:text-purple-300" />
                <span className="text-gray-300 group-hover:text-white">My Games</span>
              </Link>

              <hr className="my-2 border-gray-700" />

              <button
                onClick={handleLogout}
                className="flex items-center space-x-3 w-full p-3 rounded-lg hover:bg-red-500/10 transition-colors group"
              >
                <LogOut className="w-4 h-4 text-red-400" />
                <span className="text-red-400 group-hover:text-red-300">Disconnect Wallet</span>
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  )
}