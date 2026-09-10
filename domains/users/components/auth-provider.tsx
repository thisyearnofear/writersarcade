'use client'

import { createContext, useContext, useEffect, useState } from 'react'
import { logger } from '@/lib/config'

interface User {
  id: string
  walletAddress: string
  preferredModel: string
  private: boolean
}

interface AuthContextType {
  user: User | null
  loading: boolean
  refresh: () => Promise<void>
}

const AuthContext = createContext<AuthContextType | null>(null)

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)

  const refresh = async () => {
    try {
      const response = await fetch('/api/auth/me', { credentials: 'include' })
      const data = await response.json()
      if (data.success) {
        setUser(data.user)
      } else {
        setUser(null)
      }
    } catch (error) {
      logger.error('AuthProvider: failed to fetch user', error)
      setUser(null)
    }
  }

  useEffect(() => {
    let cancelled = false
    async function init() {
      await refresh()
      if (!cancelled) setLoading(false)
    }
    init()
    return () => { cancelled = true }
  }, [])

  return (
    <AuthContext.Provider value={{ user, loading, refresh }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}
