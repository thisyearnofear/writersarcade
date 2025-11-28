/**
 * Text parsing utilities for game content
 */

/**
 * Parse and clean narrative text from AI responses
 * Removes markdown formatting like **Panel 1:**, **Narration:**, etc.
 */
export function parseNarrativeText(rawText: string): string {
  let cleaned = rawText
    // Remove panel indicators
    .replace(/\*\*Panel \d+:?\*\*\s*/gi, '')
    // Remove narration markers
    .replace(/\*\*Narration:?\*\*\s*/gi, '')
    // Remove options markers
    .replace(/\*\*Options:?\*\*\s*/gi, '')
    // Remove other bold markers that might slip through
    .replace(/\*\*(.*?)\*\*/g, '$1')
    // Clean up extra whitespace
    .replace(/\n\s*\n/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()

  return cleaned
}

/**
 * Extract clean options from AI response text
 */
export function extractOptions(rawText: string): string[] {
  // Look for numbered options (1., 2., 3., 4.)
  const optionMatches = rawText.match(/^\d+\.\s*(.+)$/gm)
  
  if (optionMatches) {
    return optionMatches.map(match => 
      match.replace(/^\d+\.\s*/, '').trim()
    )
  }
  
  return []
}

/**
 * Parse multiple panels from AI response
 */
export function parsePanels(rawText: string): {
  panels: Array<{ narrative: string; imagePrompt?: string }>
  options: string[]
} {
  // Split text into sections - panels come before options
  const optionSplit = rawText.split(/(?:\*\*Options:?\*\*|\n\s*(?=\d+\.))/i)
  const panelText = optionSplit[0] || ''
  const optionsText = optionSplit.slice(1).join('\n')
  
  // Extract options
  const options = extractOptions(optionsText)
  
  // Split panels by "Panel X:" markers
  const panelSections = panelText.split(/\*\*Panel \d+:?\*\*/i).filter(section => section.trim())
  
  const panels = panelSections.map(section => {
    const cleanNarrative = parseNarrativeText(section)
    return {
      narrative: cleanNarrative,
      // TODO: Extract image prompts if specified
      imagePrompt: undefined
    }
  })
  
  // If no panels found, treat entire text as single panel
  if (panels.length === 0 && panelText.trim()) {
    panels.push({
      narrative: parseNarrativeText(panelText),
      imagePrompt: undefined
    })
  }
  
  return { panels, options }
}

/**
 * Split text into clean narrative and options (legacy)
 */
export function parseGameResponse(rawText: string): {
  narrative: string
  options: string[]
} {
  const { panels, options } = parsePanels(rawText)
  
  // Combine all panels into single narrative for backward compatibility
  const narrative = panels.map(p => p.narrative).join(' ')
  
  return { narrative, options }
}