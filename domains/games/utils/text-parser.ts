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
    // Remove "Choices:" marker if present
    .replace(/Choices:\s*/gi, '')
    // Remove extra whitespace (multiple spaces → single space)
    .replace(/\s+/g, ' ')
    .trim()
}

/**
 * Extract numbered options (1., 2., 3., 4.) from text
 * Handles both "1. Option text" and "1) Option text" formats
 */
function extractOptions(text: string): string[] {
  const options: string[] = []
  const lines = text.split('\n')
  
  const optionPattern = /^[-*]?\s*(\d+)[.)]\s+(.+)$/
  
  for (const line of lines) {
    const match = line.trim().match(optionPattern)
    if (match?.[2]) {
      const id = parseInt(match[1])
      if (id >= 1 && id <= 4) {
        options.push(match[2].trim())
      }
    }
  }
  
  return options
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
  // Split narrative from options section
  const optionPattern = /^[-*]?\s*1[.)]\s+/m
  const match = rawText.match(optionPattern)
  
  if (!match || match.index === undefined) {
    // No options found, treat entire text as narrative
    return {
      narrative: cleanMarkdown(rawText),
      options: []
    }
  }
  
  const narrativeSection = rawText.substring(0, match.index).trim()
  const optionsSection = rawText.substring(match.index).trim()
  
  return {
    narrative: cleanMarkdown(narrativeSection),
    options: extractOptions(optionsSection)
  }
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