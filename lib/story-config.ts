/**
 * Story Protocol Configuration
 * 
 * Network settings and constants for Story Protocol integration.
 * All registration uses client-side wallet signing (no server keys).
 * 
 * Single source of truth for Story Protocol configuration.
 */

export type StoryNetwork = "testnet" | "mainnet";

export interface StoryNetworkConfig {
  name: string;
  rpcUrl: string;
  chainId: number;
  explorer: string;
  spgContract: string; // Story Protocol Gateway for fast minting
}

/**
 * Story Protocol Networks
 * Currently using Aeneid testnet for development
 */
export const STORY_NETWORKS: Record<StoryNetwork, StoryNetworkConfig> = {
  testnet: {
    name: "Story Aeneid",
    rpcUrl: "https://aeneid.storyrpc.io",
    chainId: 1315,
    explorer: "https://aeneid.storyscan.xyz",
    spgContract: "0xc32A8a0FF3beDDDa58393d022aF433e78739FAbc",
  },
  mainnet: {
    name: "Story Mainnet",
    rpcUrl: "https://story-rpc.xyz",
    chainId: 1513,
    explorer: "https://www.storyscan.io",
    spgContract: "0x...", // TBD when mainnet launches
  },
};

/**
 * Get the current Story network configuration
 */
export function getStoryNetwork(): StoryNetworkConfig {
  const network = (process.env.NEXT_PUBLIC_STORY_NETWORK || "testnet") as StoryNetwork;
  return STORY_NETWORKS[network];
}

/**
 * WritArcade Story Protocol Settings
 */
export const WRITARCADE_STORY_CONFIG = {
  // Royalty splits (basis points: 10000 = 100%)
  royaltyShares: {
    author: 6000,   // 60% - Article author
    creator: 3000,  // 30% - Game creator
    platform: 1000, // 10% - Platform
  },

  // Supported content types
  supportedGenres: ["horror", "comedy", "mystery"] as const,
  supportedDifficulties: ["easy", "hard"] as const,

  // IPFS gateway
  ipfsGateway: process.env.IPFS_GATEWAY || "https://gateway.pinata.cloud",

  // Whether IP registration is enabled
  // Set NEXT_PUBLIC_STORY_ENABLED=false to disable (e.g., for testing)
  enabled: process.env.NEXT_PUBLIC_STORY_ENABLED !== "false",
};

/**
 * Export chain ID for easy access
 */
export const STORY_CHAIN_ID = getStoryNetwork().chainId;
