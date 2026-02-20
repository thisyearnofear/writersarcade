import type { Metadata, Viewport } from 'next'
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

// Viewport must be exported separately in Next.js 14+ (not nested inside metadata)
// Allow user scaling up to 5x for accessibility (WCAG 1.4.4 Resize Text)
// Double-tap zoom prevention is handled in JS (useMobileOptimizations hook)
export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 5,
  userScalable: true,
}

export const metadata: Metadata = {
  title: 'writersarcade - Turn Articles into Mintable Games',
  description: 'Generate AI-powered games from articles using writer coins. Play, create, and mint games as NFTs on Base.',
  keywords: ['AI', 'games', 'articles', 'NFT', 'memecoin', 'paragraph', 'farcaster', 'base'],
  openGraph: {
    title: 'writersarcade - Turn Articles into Games',
    description: 'Generate AI-powered games from articles using writer coins. Mint games as NFTs on Base.',
    images: [
      {
        url: `${process.env.NEXT_PUBLIC_SITE_URL || 'https://writersarcade.vercel.app'}/api/og-image`,
        width: 1200,
        height: 630,
        alt: 'writersarcade',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'writersarcade - Turn Articles into Games',
    description: 'Generate AI-powered games from articles using writer coins. Mint games as NFTs on Base.',
    images: [`${process.env.NEXT_PUBLIC_SITE_URL || 'https://writersarcade.vercel.app'}/api/og-image`],
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
