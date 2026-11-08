import type { SceneObject } from '@/domains/games/services/scene-planner.service'

/**
 * Curated CC0 asset pack for diorama scenes (Kenney "Mini" series, CC0 —
 * see public/assets/scene/kenney/*-LICENSE.txt). The planner emits `assetKey`
 * values from this manifest; the renderer loads the matching GLB and falls
 * back to the object's `primitive` when a key is absent or fails to load.
 *
 * Keys are stable slugs — add new kits by dropping GLBs under
 * public/assets/scene/<kit>/ and extending this map.
 */
export interface SceneAssetDef {
  src: string
  label: string
  /** Categories this asset naturally fills — used to sanity-check planner output */
  categories: SceneObject['category'][]
}

const forest = (name: string) => `/assets/scene/kenney/forest/${name}.glb`
const dungeon = (name: string) => `/assets/scene/kenney/dungeon/${name}.glb`

export const SCENE_ASSETS: Record<string, SceneAssetDef> = {
  // Mini Forest kit — outdoor / nature
  'forest-tree': { src: forest('tree'), label: 'tree', categories: ['flora'] },
  'forest-tree-high': { src: forest('tree-high'), label: 'tall pine', categories: ['flora'] },
  'forest-plant': { src: forest('plant'), label: 'shrub', categories: ['flora'] },
  'forest-rocks-low': { src: forest('rocks-low'), label: 'rock cluster', categories: ['prop', 'flora'] },
  'forest-rocks-high': { src: forest('rocks-high'), label: 'large rocks', categories: ['landmark', 'prop'] },
  'forest-rocks-ramp': { src: forest('rocks-ramp'), label: 'rock ramp', categories: ['prop', 'structure'] },
  'forest-stones': { src: forest('stones'), label: 'stones', categories: ['prop'] },
  'forest-tent': { src: forest('tent'), label: 'tent', categories: ['structure'] },
  'forest-bridge': { src: forest('bridge'), label: 'bridge', categories: ['structure'] },
  'forest-fence': { src: forest('fence'), label: 'fence', categories: ['structure', 'prop'] },
  'forest-ladder': { src: forest('ladder'), label: 'ladder', categories: ['prop'] },
  'forest-flag': { src: forest('flag'), label: 'flag', categories: ['prop', 'interactable'] },
  'forest-platform': { src: forest('platform'), label: 'platform', categories: ['structure'] },
  'forest-building-platform': { src: forest('building-platform'), label: 'building platform', categories: ['structure'] },
  'forest-building-structure': { src: forest('building-structure'), label: 'building frame', categories: ['structure'] },
  'forest-building-roof': { src: forest('building-roof'), label: 'building roof', categories: ['structure'] },
  'forest-patch-grass': { src: forest('patch-grass'), label: 'grass patch', categories: ['flora'] },
  'forest-patch-dirt': { src: forest('patch-dirt'), label: 'dirt patch', categories: ['flora'] },
  'forest-target': { src: forest('target'), label: 'target', categories: ['interactable', 'prop'] },
  'forest-character-archer': { src: forest('character-archer'), label: 'archer', categories: ['npc'] },
  'forest-weapon-bow': { src: forest('weapon-bow'), label: 'bow', categories: ['prop'] },
  'forest-weapon-arrow': { src: forest('weapon-arrow'), label: 'arrow', categories: ['prop'] },

  // Mini Dungeon kit — interior / structure
  'dungeon-wall': { src: dungeon('wall'), label: 'wall', categories: ['structure'] },
  'dungeon-wall-half': { src: dungeon('wall-half'), label: 'half wall', categories: ['structure'] },
  'dungeon-wall-narrow': { src: dungeon('wall-narrow'), label: 'narrow wall', categories: ['structure'] },
  'dungeon-wall-opening': { src: dungeon('wall-opening'), label: 'wall with doorway', categories: ['structure'] },
  'dungeon-floor': { src: dungeon('floor'), label: 'floor tile', categories: ['structure'] },
  'dungeon-floor-detail': { src: dungeon('floor-detail'), label: 'floor detail', categories: ['prop'] },
  'dungeon-stairs': { src: dungeon('stairs'), label: 'stairs', categories: ['structure'] },
  'dungeon-column': { src: dungeon('column'), label: 'column', categories: ['structure', 'landmark'] },
  'dungeon-gate': { src: dungeon('gate'), label: 'gate', categories: ['landmark', 'structure'] },
  'dungeon-door-banner': { src: dungeon('banner'), label: 'banner', categories: ['prop', 'interactable'] },
  'dungeon-barrel': { src: dungeon('barrel'), label: 'barrel', categories: ['prop'] },
  'dungeon-chest': { src: dungeon('chest'), label: 'chest', categories: ['interactable', 'prop'] },
  'dungeon-chair': { src: dungeon('chair'), label: 'chair', categories: ['prop'] },
  'dungeon-table': { src: dungeon('table'), label: 'table', categories: ['prop', 'interactable'] },
  'dungeon-pot': { src: dungeon('pot'), label: 'pot', categories: ['prop'] },
  'dungeon-potion': { src: dungeon('potion'), label: 'potion', categories: ['interactable', 'prop'] },
  'dungeon-key': { src: dungeon('key'), label: 'key', categories: ['interactable'] },
  'dungeon-coin': { src: dungeon('coin'), label: 'coin', categories: ['interactable', 'prop'] },
  'dungeon-shield-round': { src: dungeon('shield-round'), label: 'round shield', categories: ['prop'] },
  'dungeon-shield-rectangle': { src: dungeon('shield-rectangle'), label: 'shield', categories: ['prop'] },
  'dungeon-weapon-sword': { src: dungeon('weapon-sword'), label: 'sword', categories: ['prop'] },
  'dungeon-weapon-spear': { src: dungeon('weapon-spear'), label: 'spear', categories: ['prop'] },
  'dungeon-trap': { src: dungeon('trap'), label: 'trap', categories: ['interactable'] },
  'dungeon-wood-structure': { src: dungeon('wood-structure'), label: 'wooden structure', categories: ['structure'] },
  'dungeon-wood-support': { src: dungeon('wood-support'), label: 'wooden support', categories: ['structure'] },
  'dungeon-dirt': { src: dungeon('dirt'), label: 'dirt pile', categories: ['prop'] },
  'dungeon-rocks': { src: dungeon('rocks'), label: 'rocks', categories: ['prop', 'flora'] },
  'dungeon-stones': { src: dungeon('stones'), label: 'stones', categories: ['prop'] },
  'dungeon-character-human': { src: dungeon('character-human'), label: 'human', categories: ['npc'] },
  'dungeon-character-orc': { src: dungeon('character-orc'), label: 'orc', categories: ['npc'] },
}

export const SCENE_ASSET_KEYS = Object.keys(SCENE_ASSETS)

/** Compact "key: label" listing for LLM prompts. */
export function sceneAssetVocabulary(): string {
  return SCENE_ASSET_KEYS.map((k) => `${k} (${SCENE_ASSETS[k].label})`).join(', ')
}

export function getSceneAsset(key: string | undefined | null): SceneAssetDef | null {
  return key ? SCENE_ASSETS[key] ?? null : null
}
