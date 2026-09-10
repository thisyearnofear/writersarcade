'use client'

import { createContext, useContext } from 'react'

const WalletInsideContext = createContext(false)

export const WalletInsideProvider = WalletInsideContext.Provider

export function useWalletInside() {
  return useContext(WalletInsideContext)
}
