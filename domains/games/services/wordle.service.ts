export type WordleLetterState = 'correct' | 'present' | 'absent'

export interface WordleGuessResult {
  guess: string
  letters: WordleLetterState[]
}

export class WordleService {
  static readonly DEFAULT_WORD_LENGTH = 5
  static readonly DEFAULT_MAX_ATTEMPTS = 6

  // Small fallback list to ensure we always have an answer
  private static readonly FALLBACK_WORDS = [
    'words',
    'panel',
    'token',
    'chain',
    'story',
    'games',
  ]

  static normalize(word: string): string {
    return word.trim().toLowerCase()
  }

  /**
   * Derive a Wordle answer from arbitrary article text.
   * Keeps logic pure so callers can pass in text from any source.
   */
  static deriveAnswerFromText(text: string, wordLength = WordleService.DEFAULT_WORD_LENGTH): string {
    const normalized = text.toLowerCase()
    const candidateWords = normalized.match(/\b[a-z]{3,}\b/g) || []

    const filtered = candidateWords.filter((w) => w.length === wordLength)

    if (filtered.length > 0) {
      // Pick a deterministic-but-simple index so the same text yields the same answer
      const index = Math.floor(filtered.length / 2)
      return filtered[index]
    }

    const fallback = WordleService.FALLBACK_WORDS.find((w) => w.length === wordLength)
    return fallback ?? WordleService.FALLBACK_WORDS[0]
  }

  static isValidGuess(guess: string, wordLength = WordleService.DEFAULT_WORD_LENGTH): boolean {
    const normalized = this.normalize(guess)
    return /^[a-z]+$/.test(normalized) && normalized.length === wordLength
  }

  /**
   * Standard Wordle evaluation: first mark greens, then yellows, then grays.
   */
  static evaluateGuess(answerRaw: string, guessRaw: string): WordleGuessResult {
    const answer = this.normalize(answerRaw)
    const guess = this.normalize(guessRaw)

    if (answer.length !== guess.length) {
      throw new Error('Guess length must match answer length')
    }

    const letters: WordleLetterState[] = new Array(answer.length).fill('absent')
    const answerCharCounts: Record<string, number> = {}

    // First pass: mark correct positions and count remaining answer chars
    for (let i = 0; i < answer.length; i++) {
      const a = answer[i]
      const g = guess[i]

      if (a === g) {
        letters[i] = 'correct'
      } else {
        answerCharCounts[a] = (answerCharCounts[a] || 0) + 1
      }
    }

    // Second pass: mark present (yellow) where appropriate
    for (let i = 0; i < answer.length; i++) {
      if (letters[i] === 'correct') continue

      const g = guess[i]
      if (answerCharCounts[g] && answerCharCounts[g] > 0) {
        letters[i] = 'present'
        answerCharCounts[g] -= 1
      } else {
        letters[i] = 'absent'
      }
    }

    return { guess, letters }
  }

  static deriveStatus(answer: string, guesses: WordleGuessResult[], maxAttempts: number): 'in_progress' | 'won' | 'lost' {
    if (guesses.some((g) => g.guess.toLowerCase() === answer.toLowerCase())) {
      return 'won'
    }
    if (guesses.length >= maxAttempts) {
      return 'lost'
    }
    return 'in_progress'
  }
}
