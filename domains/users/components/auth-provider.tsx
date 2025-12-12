'use client'

import { createContext, useContext, useEffect, useState } from 'react'
import { useWeb3Auth } from '@/components/providers/Web3Provider'

interface User {
  id: string
  // email: string // Removed email/pass fields
  // username: string
  walletAddress: string
  preferredModel: string
  private: boolean
  // isCreator: boolean // fetch dynamically if needed
  // isAdmin: boolean
}

interface AuthContextType {
  user: User | null
  loading: boolean
  refresh: () => Promise<void>
}

const AuthContext = createContext<AuthContextType | null>(null)

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const { status } = useWeb3Auth()
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)

  // Fetch user data whenever auth status becomes 'authenticated'
  useEffect(() => {
    async function fetchUser() {
      if (status === 'authenticated') {
        try {
          const response = await fetch('/api/auth/me')
          const data = await response.json()

          if (data.success) {
            setUser(data.user)
          } else {
            console.error('Failed to fetch user data despite being authenticated')
            setUser(null)
          }
        } catch (error) {
          console.error('Error fetching user:', error)
          setUser(null)
        }
      } else if (status === 'unauthenticated') {
        setUser(null)
      }
      setLoading(false)
    }

    if (status !== 'loading') {
      fetchUser()
    }
  }, [status])

  const refresh = async () => {
    if (status === 'authenticated') {
      const response = await fetch('/api/auth/me')
      const data = await response.json()
      if (data.success) setUser(data.user)
    }
  }

  return (
    <AuthContext.Provider value={{ user, loading: status === 'loading' || loading, refresh }}>
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