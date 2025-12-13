/**
 * WritArcade Configuration & Feature Flags
 * Centralized environment and feature management
 */

/**
 * Environment Detection
 */
export const config = {
  // Environment info
  isProduction: process.env.NODE_ENV === 'production',
  isDevelopment: process.env.NODE_ENV === 'development',
  
  /**
   * IPFS Configuration
   * - Production: REQUIRES PINATA_JWT, throws error if missing
   * - Development: Uses mock IPFS for faster iteration
   */
  ipfs: {
    enableMock: process.env.NODE_ENV === 'development',
    pinataJwt: process.env.PINATA_JWT,
  },

  /**
   * Story Protocol Configuration
   * Enables/disables Story Protocol integration for IP registration
   */
  storyProtocol: {
    enabled: process.env.STORY_PROTOCOL_ENABLED !== 'false',
    rpcUrl: process.env.STORY_RPC_URL || 'https://aeneid.storyrpc.io',
    chainId: process.env.STORY_CHAIN_ID ? parseInt(process.env.STORY_CHAIN_ID) : 1516,
  },

  /**
   * Payment Verification
   * Async verification with polling (not immediate)
   */
  payments: {
    pollIntervalMs: 3000, // Check blockchain every 3 seconds
    maxRetries: 20, // Max 60 seconds total
  },

  /**
   * Database Configuration
   */
  database: {
    url: process.env.DATABASE_URL,
  },

  /**
   * API Rate Limiting & Security
   */
  api: {
    enableRateLimiting: process.env.ENABLE_RATE_LIMITING !== 'false',
    maxRequestsPerMinute: parseInt(process.env.API_RATE_LIMIT || '60'),
  },
} as const

/**
 * Validate critical configuration at startup
 */
export function validateConfig(): void {
  if (config.isProduction) {
    // Production requires IPFS
    if (!config.ipfs.pinataJwt) {
      throw new Error(
        'PINATA_JWT environment variable is required in production for IPFS uploads'
      )
    }

    // Production requires database
    if (!config.database.url) {
      throw new Error(
        'DATABASE_URL environment variable is required in production'
      )
    }
  }

  console.log('[Config] Environment:', {
    environment: process.env.NODE_ENV,
    ipfsEnabled: !config.ipfs.enableMock,
    storyProtocolEnabled: config.storyProtocol.enabled,
  })
}

/**
 * Logging Service
 * Centralized logging with context
 */
export interface LogContext {
  userId?: string
  requestId?: string
  endpoint?: string
  [key: string]: unknown
}

export const logger = {
  /**
   * Info: General informational messages
   */
  info: (message: string, context?: LogContext) => {
    if (config.isProduction) {
      console.log(`[INFO] ${message}`, context)
    } else {
      console.log(`ℹ️  ${message}`, context)
    }
  },

  /**
   * Warn: Warning messages (non-blocking issues)
   */
  warn: (message: string, context?: LogContext) => {
    if (config.isProduction) {
      console.warn(`[WARN] ${message}`, context)
    } else {
      console.warn(`⚠️  ${message}`, context)
    }
  },

  /**
   * Error: Error messages (blocking issues)
   */
  error: (message: string, error?: unknown, context?: LogContext) => {
    if (config.isProduction) {
      console.error(`[ERROR] ${message}`, error, context)
    } else {
      console.error(`❌ ${message}`, error, context)
    }
  },

  /**
   * Debug: Development-only debugging
   */
  debug: (message: string, data?: unknown) => {
    if (!config.isProduction) {
      console.log(`🔍 ${message}`, data)
    }
  },

  /**
   * Payment-specific logging
   */
  payment: (action: string, context: LogContext) => {
    logger.info(`[Payment] ${action}`, context)
  },

  /**
   * Story Protocol-specific logging
   */
  storyProtocol: (action: string, context: LogContext) => {
    if (config.storyProtocol.enabled) {
      logger.info(`[Story Protocol] ${action}`, context)
    }
  },

  /**
   * IPFS-specific logging
   */
  ipfs: (action: string, context: LogContext) => {
    logger.info(`[IPFS] ${action}`, context)
  },
}
