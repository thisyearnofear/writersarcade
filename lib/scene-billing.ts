/**
 * Scene billing markers shared by the bundled generation pipeline, the paid
 * POST route, and read surfaces (worlds manifest, scene gate). Kept in a
 * dependency-free module so client-safe libs can import it.
 */

/** GameScene.paymentRef value marking a scene bundled into generate-game —
 * retries via POST /api/games/[slug]/scene are free. */
export const BUNDLED_SCENE_PAYMENT_REF = 'bundled:generation'

/** A 'pending' GameScene older than this is treated as dead (the after() job
 * was killed) and may be regenerated. */
export const STALE_PENDING_MS = 10 * 60 * 1000
