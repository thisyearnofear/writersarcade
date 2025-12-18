import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'WritArcade - Turn Articles into Games',
  description: 'Generate AI-powered games from articles using writer coins. Play, mint, and earn on Base.',
  openGraph: {
    title: 'WritArcade',
    description: 'Turn articles into mintable games',
    images: [
      {
        url: 'https://writarcade.vercel.app/images/og-image.png',
        width: 1200,
        height: 630,
        alt: 'WritArcade - Article Games',
      },
    ],
  },
}

export default function MiniAppLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <>
      {/* Mini App Embed Metadata - Required for feed discovery */}
      <meta
        name="fc:miniapp"
        content={JSON.stringify({
          version: '1',
          imageUrl: 'https://writarcade.vercel.app/images/og-image.png',
          button: {
            title: 'Play WritArcade',
            action: {
              type: 'launch_frame',
              name: 'WritArcade',
              url: 'https://writarcade.vercel.app/mini-app',
              splashImageUrl: 'https://writarcade.vercel.app/android-chrome-192x192.png',
              splashBackgroundColor: '#1a1a2e',
            },
          },
        })}
      />
      {children}
    </>
  )
}
