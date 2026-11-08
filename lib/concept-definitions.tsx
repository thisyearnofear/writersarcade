import { ConceptTooltip } from '@/components/ui/concept-tooltip'

export const CONCEPTS = {
  mint: {
    term: 'Mint',
    explanation:
      'Create a unique digital collectible on Base that proves you own this game. Required to decrypt the hidden ending.',
  },
  secretEpilogue: {
    term: 'Hidden ending',
    explanation:
      'A bonus ending encrypted on Base. Play through all 5 panels, then mint the NFT to reveal it.',
  },
  inco: {
    term: 'Encrypted unlock',
    explanation:
      'Your hidden ending and daily modifier cards stay encrypted until you mint and unlock them.',
  },
  dailyChallenge: {
    term: 'Daily Challenge',
    explanation:
      'Everyone plays the same source today with different encrypted modifier cards. Compare scores on the leaderboard.',
  },
  writerCoin: {
    term: 'Writer coin',
    explanation:
      'Tokens tied to supported writers. Creating and minting games routes a share of fees to the original author.',
  },
} as const

type ConceptKey = keyof typeof CONCEPTS

export function ConceptTerm({
  concept,
  children,
}: {
  concept: ConceptKey
  children: React.ReactNode
}) {
  const { term, explanation } = CONCEPTS[concept]
  return (
    <ConceptTooltip term={term} explanation={explanation}>
      {children}
    </ConceptTooltip>
  )
}
