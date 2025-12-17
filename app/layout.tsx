import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'
import { Toaster } from '@/components/ui/toaster'
import { AuthProvider } from '@/domains/users/components/auth-provider'
import { Web3Provider } from '@/components/providers/Web3Provider'
import { WalletSync } from '@/components/providers/WalletSync'
import { ToastProvider } from '@/components/ui/use-toast'
import { DarkModeProvider } from '@/components/providers/DarkModeProvider'
import { MobileBottomNav } from '@/components/navigation/MobileBottomNav'

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: 'WritArcade - Turn Articles into Mintable Games',
  description: 'Transform Paragraph.xyz articles into interactive, mintable games using AI',
  keywords: ['AI', 'games', 'articles', 'NFT', 'memecoin', 'paragraph'],
  viewport: {
    width: 'device-width',
    initialScale: 1,
    maximumScale: 1,
    userScalable: false,
  },
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" className="dark">
      <body className={`${inter.className} bg-black text-white min-h-screen pb-16 md:pb-0`}>
        <Web3Provider>
          <ToastProvider>
            <WalletSync />
            <DarkModeProvider>
              <AuthProvider>
                {children}
                <Toaster />
              </AuthProvider>
            </DarkModeProvider>
          </ToastProvider>
        </Web3Provider>
        <MobileBottomNav />
      </body>
    </html>
  )
}
