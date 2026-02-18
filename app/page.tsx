'use client'

import { Suspense } from 'react'
import { motion } from 'framer-motion'
import { GameGrid } from '@/domains/games/components/game-grid'
import { GameGeneratorForm } from '@/domains/games/components/game-generator-form'
import { Header } from '@/components/layout/header'
import { Footer } from '@/components/layout/footer'
import { ThemeWrapper } from '@/components/layout/ThemeWrapper'
import { OnboardingModal } from '@/components/onboarding/OnboardingModal'
import { useOnboarding } from '@/hooks/useOnboarding'
import { useScrollReveal } from '@/hooks/useScrollReveal'
import { animationConfig } from '@/lib/animations'

const steps = [
  {
    number: '1',
    title: 'Submit Content',
    description: 'Paste a Paragraph.xyz article URL from supported authors',
  },
  {
    number: '2',
    title: 'Customize & Generate',
    description: 'Edit characters, tweak prompts, and regenerate images. Pay with writer coins to create.',
  },
  {
    number: '3',
    title: 'Play & Mint',
    description: 'Experience your unique game interpretation and mint it as an NFT',
  },
]

function HowItWorksSection() {
  const { ref, isVisible } = useScrollReveal()

  return (
    <section className="py-16 px-4" ref={ref}>
      <div className="max-w-4xl mx-auto">
        <motion.h2
          className="text-3xl font-bold mb-12 text-center text-white"
          initial={{ opacity: 0, y: 20 }}
          animate={isVisible ? { opacity: 1, y: 0 } : { opacity: 0, y: 20 }}
          transition={{ duration: 0.6 }}
        >
          How WritArcade Works
        </motion.h2>

        <motion.div
          className="grid grid-cols-1 sm:grid-cols-3 gap-6 sm:gap-8"
          initial="hidden"
          animate={isVisible ? 'visible' : 'hidden'}
          variants={animationConfig.variants.staggerContainer}
        >
          {steps.map((step, index) => (
            <motion.div
              key={step.number}
              className="text-center"
              variants={{
                hidden: { opacity: 0, y: 20 },
                visible: {
                  opacity: 1,
                  y: 0,
                  transition: { delay: index * 0.15, duration: 0.6 },
                },
              }}
            >
              {/* Animated number circle with glow */}
              <motion.div
                className="w-14 h-14 sm:w-16 sm:h-16 bg-purple-600 rounded-full flex items-center justify-center mx-auto mb-3 sm:mb-4 relative"
                animate={{
                  boxShadow: [
                    '0 0 20px rgba(168, 85, 247, 0.5)',
                    '0 0 40px rgba(168, 85, 247, 0.8)',
                    '0 0 20px rgba(168, 85, 247, 0.5)',
                  ],
                }}
                transition={{
                  boxShadow: {
                    duration: 2,
                    repeat: Infinity,
                  },
                }}
              >
                <span className="text-xl sm:text-2xl font-bold">{step.number}</span>
              </motion.div>

              {/* BUG FIX: was text-black (invisible on dark bg) → text-white */}
              <h3 className="text-lg sm:text-xl font-semibold mb-2 sm:mb-3 text-white">{step.title}</h3>
              <p className="text-sm sm:text-base text-gray-300">{step.description}</p>
            </motion.div>
          ))}
        </motion.div>
      </div>
    </section>
  )
}

export default function HomePage() {
  const { showOnboarding, dismissOnboarding } = useOnboarding()

  return (
    <ThemeWrapper theme="arcade">
      <div className="flex flex-col min-h-screen">
        <Header />

        <main className="flex-1">
          {/* Hero Section with Thematic Styling */}
          <section className="relative py-20 px-4 overflow-hidden writarcade-theme">
            {/* Animated background gradient layers */}
            <div className="absolute inset-0 -z-10">
              <motion.div
                className="absolute inset-0 bg-gradient-to-br from-purple-900/30 to-pink-900/30"
                animate={{
                  opacity: [0.5, 0.8, 0.5],
                }}
                transition={{
                  duration: 8,
                  repeat: Infinity,
                  ease: 'easeInOut',
                }}
              />
            </div>

            <div className="max-w-4xl mx-auto text-center relative z-10 writarcade-paper">
              {/* Kinetic title with typewriter font - staggered word animation with responsive sizing */}
              <h1 className="text-3xl sm:text-4xl md:text-5xl font-bold mb-6 typewriter-font">
                {['WritArcade'].map((word) => (
                  <motion.span
                    key={word}
                    className="inline-block"
                    initial={{ opacity: 0, scale: 0.5, y: 10 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    transition={{
                      duration: 0.6,
                      ease: 'easeOut',
                      type: 'spring',
                      stiffness: 100,
                    }}
                  >
                    {word}&nbsp;
                  </motion.span>
                ))}
              </h1>

              {/* Staggered description with responsive sizing */}
              <motion.p
                className="text-sm sm:text-base md:text-lg text-gray-700 mb-4 max-w-2xl mx-auto leading-relaxed"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2, duration: 0.6 }}
              >
                Turn any article into an interactive, mintable game.
                Pay with writer coins to create your unique interpretation.
              </motion.p>
              <motion.p
                className="text-xs sm:text-sm md:text-base text-gray-600 mb-8 max-w-xl mx-auto leading-relaxed"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.35, duration: 0.6 }}
              >
                Earn from plays. Browse assets. Own tradeable IP with on-chain, configurable revenue splits for generation and minting.
              </motion.p>

              {/* Game Generator */}
              <motion.div
                className="max-w-2xl mx-auto"
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 0.4, duration: 0.6 }}
              >
                <GameGeneratorForm />
              </motion.div>
            </div>
          </section>

          {/* Featured Games */}
          <section className="py-16 px-4 bg-black">
            <div className="max-w-6xl mx-auto">
              <div className="flex items-center justify-between mb-8">
                <h2 className="text-2xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-yellow-400 to-amber-600">
                  Featured Arcade Cabinets
                </h2>
                <a href="/games" className="text-sm text-yellow-500 hover:text-yellow-400 flex items-center gap-1">
                  View All <span className="text-xs">→</span>
                </a>
              </div>
              <Suspense fallback={<div className="h-64 bg-gray-900/50 rounded-lg animate-pulse" />}>
                <GameGrid limit={3} featured={true} />
              </Suspense>
            </div>
          </section>

          {/* Recent Games */}
          <section className="py-16 px-4 bg-gray-900/30 border-t border-gray-800">
            <div className="max-w-6xl mx-auto">
              <div className="flex items-center justify-between mb-8">
                <h2 className="text-2xl font-bold text-white">
                  Fresh from the Generator
                </h2>
                <a href="/games" className="text-sm text-purple-400 hover:text-purple-300">
                  Browse Gallery →
                </a>
              </div>
              <Suspense fallback={<div className="h-64 bg-gray-900/50 rounded-lg animate-pulse" />}>
                <GameGrid limit={4} />
              </Suspense>
            </div>
          </section>

          {/* How it Works - with scroll animations */}
          <HowItWorksSection />

        </main>

        <Footer />

        <OnboardingModal isOpen={showOnboarding} onClose={dismissOnboarding} />
      </div>
    </ThemeWrapper>
  )
}