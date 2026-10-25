import { ImageResponse } from 'next/og'

export const runtime = 'nodejs'

export async function GET() {
  return new ImageResponse(
    (
      <div
        style={{
          width: '1200px',
          height: '630px',
          background: '#050507',
          display: 'flex',
          position: 'relative',
          overflow: 'hidden',
          fontFamily: 'system-ui, -apple-system, sans-serif',
        }}
      >
        {/* Ambient glow — top-left purple */}
        <div
          style={{
            position: 'absolute',
            top: '-120px',
            left: '-80px',
            width: '500px',
            height: '500px',
            borderRadius: '50%',
            background: 'radial-gradient(circle, rgba(139,92,246,0.25) 0%, transparent 70%)',
            display: 'flex',
          }}
        />
        {/* Ambient glow — bottom-right blue */}
        <div
          style={{
            position: 'absolute',
            bottom: '-100px',
            right: '-60px',
            width: '450px',
            height: '450px',
            borderRadius: '50%',
            background: 'radial-gradient(circle, rgba(59,130,246,0.18) 0%, transparent 70%)',
            display: 'flex',
          }}
        />
        {/* Subtle grid lines */}
        <div
          style={{
            position: 'absolute',
            inset: 0,
            backgroundImage:
              'linear-gradient(rgba(255,255,255,0.02) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.02) 1px, transparent 1px)',
            backgroundSize: '60px 60px',
            display: 'flex',
          }}
        />

        {/* Main content column */}
        <div
          style={{
            position: 'relative',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'space-between',
            width: '100%',
            height: '100%',
            padding: '56px 64px',
          }}
        >
          {/* Top row: brand + badge */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
            }}
          >
            <div
              style={{
                display: 'flex',
                fontSize: '30px',
                fontWeight: 800,
                color: '#d8b4fe',
                letterSpacing: '-0.5px',
              }}
            >
              writersarcade
            </div>
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                borderRadius: '999px',
                background: 'rgba(139,92,246,0.15)',
                border: '1px solid rgba(139,92,246,0.4)',
                color: '#c4b5fd',
                fontSize: '18px',
                fontWeight: 600,
                padding: '8px 20px',
              }}
            >
              ⚡ Text it. Play it. Film it.
            </div>
          </div>

          {/* Middle: headline + description */}
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              gap: '20px',
              maxWidth: '900px',
            }}
          >
            <div
              style={{
                display: 'flex',
                fontSize: '64px',
                fontWeight: 900,
                lineHeight: 1.08,
                color: '#ffffff',
                letterSpacing: '-2px',
              }}
            >
              Turn Articles into Playable Games
            </div>
            <div
              style={{
                display: 'flex',
                fontSize: '28px',
                color: '#9ca3af',
                lineHeight: 1.4,
              }}
            >
              AI-powered interactive fiction, mintable on-chain.
              Send an article in iMessage — get a game and a film back.
            </div>
          </div>

          {/* Bottom row: feature pills + powered-by */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
            }}
          >
            <div style={{ display: 'flex', gap: '16px' }}>
              {[
                { icon: '🎮', label: 'Play' },
                { icon: '🎨', label: 'Create' },
                { icon: '💎', label: 'Mint' },
                { icon: '🎬', label: 'Film' },
              ].map((f) => (
                <div
                  key={f.label}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    background: 'rgba(255,255,255,0.06)',
                    border: '1px solid rgba(255,255,255,0.1)',
                    borderRadius: '12px',
                    padding: '10px 18px',
                    fontSize: '20px',
                    color: '#e5e7eb',
                    fontWeight: 600,
                  }}
                >
                  <span>{f.icon}</span>
                  <span>{f.label}</span>
                </div>
              ))}
            </div>
            <div
              style={{
                display: 'flex',
                fontSize: '20px',
                color: '#6b7280',
              }}
            >
              Powered by Base
            </div>
          </div>
        </div>
      </div>
    ),
    {
      width: 1200,
      height: 630,
      headers: {
        'Cache-Control': 'public, max-age=300, s-maxage=300, stale-while-revalidate=86400',
      },
    }
  )
}
