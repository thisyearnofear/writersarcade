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
import { AnimatedBackground, FloatingElement, GradientText, StaggerContainer, StaggerItem, FadeIn } from '@/components/effects'
import { Sparkles, Gamepad2, Coins, ChevronDown } from 'lucide-react'

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
    <section className="py-16 px-4 relative overflow-hidden" ref={ref}>
      {/* Subtle animated background */}
      <AnimatedBackground variant="particles" className="opacity-30" />
      
      <div className="max-w-4xl mx-auto relative z-10">
        <FadeIn direction="up" className="text-center mb-12">
          <GradientText className="text-3xl font-bold" colors={['#8b5cf6', '#ec4899', '#8b5cf6']}>
            How WritArcade Works
          </GradientText>
        </FadeIn>

        <StaggerContainer 
          className="grid grid-cols-1 sm:grid-cols-3 gap-6 sm:gap-8"
          staggerDelay={0.15}
        >
          {steps.map((step, index) => (
            <StaggerItem key={step.number} direction="up">
              <FloatingElement delay={index * 0.2} distance={5} duration={5}>
                <div className="text-center p-6 rounded-xl bg-gray-900/50 border border-gray-800 hover:border-purple-500/50 transition-colors group">
                  {/* Animated number circle with enhanced glow */}
                  <motion.div
                    className="w-14 h-14 sm:w-16 sm:h-16 bg-gradient-to-br from-purple-600 to-pink-600 rounded-full flex items-center justify-center mx-auto mb-3 sm:mb-4 relative group-hover:scale-110 transition-transform"
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

                  <h3 className="text-lg sm:text-xl font-semibold mb-2 sm:mb-3 text-white group-hover:text-purple-300 transition-colors">{step.title}</h3>
                  <p className="text-sm sm:text-base text-gray-300">{step.description}</p>
                </div>
              </FloatingElement>
            </StaggerItem>
          ))}
        </StaggerContainer>
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
            {/* Enhanced animated background */}
            <AnimatedBackground variant="gradient" className="-z-10" />
            
            {/* Floating decorative elements */}
            <div className="absolute inset-0 -z-5 pointer-events-none overflow-hidden">
              <FloatingElement delay={0} distance={15} duration={6} className="absolute top-20 left-[10%]">
                <Sparkles className="w-8 h-8 text-purple-400/30" />
              </FloatingElement>
              <FloatingElement delay={1} distance={12} duration={7} className="absolute top-32 right-[15%]">
                <Gamepad2 className="w-10 h-10 text-pink-400/30" />
              </FloatingElement>
              <FloatingElement delay={2} distance={10} duration={5} className="absolute bottom-40 left-[20%]">
                <Coins className="w-6 h-6 text-yellow-400/30" />
              </FloatingElement>
            </div>

            <div className="max-w-4xl mx-auto text-center relative z-10 writarcade-paper">
              {/* Kinetic title with gradient animation */}
              <motion.h1 
                className="text-3xl sm:text-4xl md:text-5xl font-bold mb-6 typewriter-font"
                initial={{ opacity: 0, scale: 0.8, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                transition={{
                  duration: 0.8,
                  ease: 'easeOut',
                  type: 'spring',
                  stiffness: 100,
                }}
              >
                <GradientText colors={['#8b5cf6', '#ec4899', '#3b82f6', '#8b5cf6']}>
                  WritArcade
                </GradientText>
              </motion.h1>

              {/* Staggered description with enhanced animations */}
              <motion.p
                className="text-sm sm:text-base md:text-lg text-gray-700 mb-4 max-w-2xl mx-auto leading-relaxed"
                initial={{ opacity: 0, y: 20, filter: 'blur(10px)' }}
                animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
                transition={{ delay: 0.3, duration: 0.8, ease: 'easeOut' }}
              >
                Turn any article into an interactive, mintable game.
                Pay with writer coins to create your unique interpretation.
              </motion.p>
              <motion.p
                className="text-xs sm:text-sm md:text-base text-gray-600 mb-8 max-w-xl mx-auto leading-relaxed"
                initial={{ opacity: 0, y: 20, filter: 'blur(10px)' }}
                animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
                transition={{ delay: 0.5, duration: 0.8, ease: 'easeOut' }}
              >
                Earn from plays. Browse assets. Own tradeable IP with on-chain, configurable revenue splits for generation and minting.
              </motion.p>

              {/* Game Generator with enhanced entrance */}
              <motion.div
                className="max-w-2xl mx-auto"
                initial={{ opacity: 0, y: 30, scale: 0.95 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                transition={{ delay: 0.7, duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
              >
                <GameGeneratorForm />
              </motion.div>
            </div>

            {/* Scroll indicator */}
            <motion.div
              className="absolute bottom-8 left-1/2 -translate-x-1/2"
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 1.2, duration: 0.6 }}
            >
              <motion.div
                animate={{ y: [0, 8, 0] }}
                transition={{ duration: 1.5, repeat: Infinity, ease: "easeInOut" }}
              >
                <ChevronDown className="w-6 h-6 text-gray-400" />
              </motion.div>
            </motion.div>
          </section>

          {/* Featured Games */}
          <section className="py-16 px-4 bg-black relative overflow-hidden">
            {/* Subtle mesh gradient background */}
            <AnimatedBackground variant="mesh" className="opacity-20" />
            
            <div className="max-w-6xl mx-auto relative z-10">
              <FadeIn direction="up" className="flex items-center justify-between mb-8">
                <h2 className="text-2xl font-bold">
                  <GradientText colors={['#fbbf24', '#f59e0b', '#fbbf24']}>
                    Featured Arcade Cabinets
                  </GradientText>
                </h2>
                <motion.a 
                  href="/games" 
                  className="text-sm text-yellow-500 hover:text-yellow-400 flex items-center gap-1 group"
                  whileHover={{ x: 5 }}
                  transition={{ type: 'spring', stiffness: 400, damping: 10 }}
                >
                  View All <span className="text-xs group-hover:translate-x-1 transition-transform">→</span>
                </motion.a>
              </FadeIn>
              <Suspense fallback={<div className="h-64 bg-gray-900/50 rounded-lg animate-pulse" />}>
                <GameGrid limit={3} featured={true} />
              </Suspense>
            </div>
          </section>

          {/* Recent Games */}
          <section className="py-16 px-4 bg-gray-900/30 border-t border-gray-800 relative overflow-hidden">
            <div className="max-w-6xl mx-auto relative z-10">
              <FadeIn direction="up" delay={0.1} className="flex items-center justify-between mb-8">
                <h2 className="text-2xl font-bold text-white">
                  Fresh from the Generator
                </h2>
                <motion.a 
                  href="/games" 
                  className="text-sm text-purple-400 hover:text-purple-300 flex items-center gap-1 group"
                  whileHover={{ x: 5 }}
                  transition={{ type: 'spring', stiffness: 400, damping: 10 }}
                >
                  Browse Gallery <span className="group-hover:translate-x-1 transition-transform">→</span>
                </motion.a>
              </FadeIn>
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