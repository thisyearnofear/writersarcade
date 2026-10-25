'use client'

import { createContext, useContext } from 'react'
import type { AuthenticationStatus } from '@rainbow-me/rainbowkit'

// Kept dependency-free (type-only imports) so consumers outside the wagmi /
// RainbowKit tree (e.g. the Farcaster mini-app) can read wallet auth state
// without pulling that module graph into their prerender bundle.
export interface Web3AuthContextType {
  status: AuthenticationStatus
}

export const Web3AuthContext = createContext<Web3AuthContextType>({ status: 'loading' })

export const useWeb3Auth = () => useContext(Web3AuthContext)

// Opens the RainbowKit connect modal (SIWE prompt when connected but not
// authenticated) from components that can't import rainbowkit themselves.
// A listener inside RainbowKitProvider in Web3Provider handles the event.
export const OPEN_CONNECT_MODAL_EVENT = 'wa:open-connect-modal'

export function openWalletConnectModal() {
  window.dispatchEvent(new Event(OPEN_CONNECT_MODAL_EVENT))
}
