import { GameGeneratorForm as GameGenerator } from '@/domains/games/components/game-generator-form'
import { ThemeWrapper } from '@/components/layout/ThemeWrapper'

export default function GeneratePage() {
  return (
    <ThemeWrapper theme="arcade">
      <div className="py-12">
        <div className="max-w-4xl mx-auto px-4">
          <h1 className="text-4xl font-bold text-center mb-8 typewriter-font">
            Generate Your Game
          </h1>
          <GameGenerator />
        </div>
      </div>
    </ThemeWrapper>
  )
}
