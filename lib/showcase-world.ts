/**
 * The world a judge should walk before they wait on a new generation.
 *
 * The Missing Ship is a completed production scene (stone ground, dusk, a
 * goal, two characters). The same sentence returns this row instead of
 * planning another copy.
 */

export const SHOWCASE_WORLD = {
  slug: 'a-lighthouse-on-a-cliff-at-dusk-its-beam-sweepi-l2vt',
  title: 'The Missing Ship',
  prompt: 'A lighthouse on a cliff at dusk, its beam sweeping the fog where a ship is missing',
} as const

export function isShowcasePrompt(prompt: string): boolean {
  return prompt.replace(/\s+/g, ' ').trim() === SHOWCASE_WORLD.prompt
}

/** A reshape of this slug must open a new world. The lighthouse row stays. */
export function isShowcaseSlug(slug: string): boolean {
  return slug === SHOWCASE_WORLD.slug
}
