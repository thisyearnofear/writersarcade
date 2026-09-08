/**
 * Text parsing utilities for game content
 * 
 * ARCHITECTURE NOTE: Each game turn = ONE comic panel
 * AI is constrained to 2-3 sentences per turn, so we parse single panel per message
 * This simplifies rendering and ensures clear visual hierarchy in UI
 */

/**
 * Clean markdown formatting and AI markers from narrative text
 * Removes:
 * - All bold markers (** anywhere)
 * - Panel markers (Panel 1:, Panel 2:, etc.)
 * - Narration labels
 * - Opening Scene: labels
 * - Extra whitespace
 */
function cleanMarkdown(text: string): string {
  return text
    // Remove ALL ** markers (bold formatting)
    .replace(/\*\*/g, '')
    // Remove Panel X: markers (with optional bold around them)
    .replace(/Panel\s+\d+:\s*/gi, '')
    // Remove Narration: labels (with optional bold around them)
    .replace(/Narration:\s*/gi, '')
    // Remove Opening Scene: labels (with optional bold around them)
    .replace(/Opening\s+Scene:\s*/gi, '')
    // Remove Final Scene: labels (with optional bold around them)
    .replace(/Final\s+Scene:\s*/gi, '')
    // Remove "Choices:" marker if present
    .replace(/Choices:\s*/gi, '')
    // Remove extra whitespace (multiple spaces → single space)
    .replace(/\s+/g, ' ')
    .trim()
}

/**
 * Extract numbered options (1., 2., 3., 4.) from text
 * Handles both "1. Option text" and "1) Option text" formats, including
 * inline dumps where the model never inserted newlines between choices.
 */
function extractOptions(text: string): string[] {
  const options: string[] = []
  const optionPattern = /^[-*]?\s*(\d+)[.)]\s+(.+)$/
  const chunks = text.includes('\n')
    ? text.split('\n')
    : text.split(/\s+(?=[2-4][.)]\s+)/)

  for (const chunk of chunks) {
    const match = chunk.trim().match(optionPattern)
    if (match?.[2]) {
      const id = parseInt(match[1])
      if (id >= 1 && id <= 4) {
        options.push(match[2].trim())
      }
    }
  }

  return options
}

function splitNarrativeAndOptions(rawText: string): {
  narrative: string
  optionsSection: string | null
} {
  const lineMatch = rawText.match(/^[-*]?\s*1[.)]\s+/m)
  if (lineMatch && lineMatch.index !== undefined) {
    return {
      narrative: rawText.substring(0, lineMatch.index).trim(),
      optionsSection: rawText.substring(lineMatch.index).trim(),
    }
  }

  // Inline: "...life. 1. You approach the truck..."
  const inlineMatch = rawText.match(/(?<=[.!?"'`])\s+1[.)]\s+/)
  if (inlineMatch && inlineMatch.index !== undefined) {
    return {
      narrative: rawText.substring(0, inlineMatch.index).trim(),
      optionsSection: rawText.substring(inlineMatch.index).trim(),
    }
  }

  return { narrative: rawText.trim(), optionsSection: null }
}

/**
 * Parse a single comic panel from narrative text
 * 
 * @param rawText - AI-generated narrative with options
 * @returns { narrative: clean narrative text, options: array of choice strings }
 */
export function parsePanel(rawText: string): {
  narrative: string
  options: string[]
} {
  const { narrative, optionsSection } = splitNarrativeAndOptions(rawText)

  return {
    narrative: cleanMarkdown(narrative),
    options: optionsSection ? extractOptions(optionsSection) : [],
  }
}

/** First sentence of a panel, clipped for overlays and teaser cells. */
export function pullQuote(rawText: string, maxChars = 90): string {
  const { narrative } = parsePanel(rawText)
  const sentence = narrative.split(/(?<=[.!?])\s+/)[0] || narrative
  const stripped = sentence.replace(/^["']+|["']+$/g, '').trim()
  if (stripped.length <= maxChars) return stripped
  return `${stripped.slice(0, maxChars).replace(/\s+\S*$/, '')}…`
}

/**
 * DEPRECATED: Legacy multi-panel parsing
 * Kept for backward compatibility but should not be used
 * Use parsePanel() instead
 */
export function parsePanels(rawText: string): {
  panels: Array<{ narrative: string; imagePrompt?: string }>
  options: string[]
} {
  const { narrative, options } = parsePanel(rawText)
  return {
    panels: [{ narrative, imagePrompt: undefined }],
    options
  }
}

/**
 * DEPRECATED: Use parsePanel() instead
 */
export function parseNarrativeText(rawText: string): string {
  return parsePanel(rawText).narrative
}