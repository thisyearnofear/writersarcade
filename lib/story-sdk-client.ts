/**
 * Story Protocol SDK Client
 * Initializes and manages the StoryClient for IP operations
 * 
 * SDK Reference: https://docs.story.foundation/sdk-reference/overview
 */

import { StoryClient } from "@story-protocol/core-sdk";
import { http } from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { getStoryNetwork } from "./story-config";

let storyClient: StoryClient | null = null;

/**
 * Initialize Story Protocol SDK client
 * Requires STORY_WALLET_KEY and STORY_RPC_URL environment variables
 */
export function initStoryClient(): StoryClient {
  if (storyClient) {
    return storyClient;
  }

  const rpcUrl = process.env.STORY_RPC_URL || getStoryNetwork().rpcUrl;
  const privateKey = process.env.STORY_WALLET_KEY;

  if (!rpcUrl) {
    throw new Error(
      "STORY_RPC_URL environment variable is required. Set to https://aeneid.storyrpc.io for testnet"
    );
  }

  if (!privateKey) {
    throw new Error(
      "STORY_WALLET_KEY environment variable is required. Get testnet tokens from https://faucet.story.foundation/"
    );
  }

  try {
    // Normalize private key format
    const normalizedKey = privateKey.startsWith("0x")
      ? privateKey
      : `0x${privateKey}`;

    // Create account from private key
    const account = privateKeyToAccount(normalizedKey as `0x${string}`);

    // Initialize Story Client
    storyClient = StoryClient.newClient({
      account,
      transport: http(rpcUrl),
    });

    console.log(`✓ Story Protocol SDK client initialized for ${account.address}`);
    return storyClient;
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Unknown initialization error";
    throw new Error(`Failed to initialize Story Protocol SDK: ${message}`);
  }
}

/**
 * Get the current Story client instance
 * Throws error if not initialized
 */
export function getStoryClient(): StoryClient {
  if (!storyClient) {
    return initStoryClient();
  }
  return storyClient;
}

/**
 * Reset client (useful for testing)
 */
export function resetStoryClient() {
  storyClient = null;
}
