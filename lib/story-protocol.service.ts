/**
 * Story Protocol Service (v1.4.2)
 *
 * Handles IP registration, royalty configuration, and license management for WritArcade games.
 * Connects to Story Protocol to register games as intellectual property assets.
 *
 * This service is a placeholder for Story Protocol integration.
 * Full implementation requires completing the SDK API integration based on official examples.
 */

import { Address } from "viem";

export interface IPRegistrationInput {
  title: string;
  description: string;
  articleUrl: string;
  gameCreatorAddress: Address;
  authorParagraphUsername: string;
  authorWalletAddress: Address;
  genre: "horror" | "comedy" | "mystery";
  difficulty: "easy" | "hard";
  gameMetadataUri: string; // IPFS URI pointing to full game JSON
  nftMetadataUri: string; // IPFS URI pointing to NFT metadata
}

export interface IPRegistrationResult {
  storyIPAssetId: string;
  ipId: string;
  txHash: string;
  registeredAt: number;
  licenseTermsIds: string[] | bigint[];
}

/**
 * Initialize Story Protocol client
 * Requires: STORY_RPC_URL and STORY_WALLET_KEY in environment
 */
export function initializeStoryClient() {
  const rpcUrl = process.env.STORY_RPC_URL;
  const privateKey = process.env.STORY_WALLET_KEY;

  if (!rpcUrl) {
    throw new Error("STORY_RPC_URL environment variable is required");
  }

  if (!privateKey) {
    throw new Error("STORY_WALLET_KEY environment variable is required");
  }

  // SDK initialization will happen here once fully integrated
  // See docs/STORY_PROTOCOL_SETUP.md for complete setup guide

  return {
    rpcUrl,
    hasValidConfig: true,
  };
}

/**
 * Register a game as an IP Asset on Story Protocol
 *
 * This creates a new IP Asset with commercial remix license terms
 * that allows others to create derivatives and share revenue.
 *
 * See: https://docs.story.foundation/developers/typescript-sdk/register-ip-asset
 * Example: https://github.com/storyprotocol/typescript-tutorial/blob/main/scripts/registration/register.ts
 */
export async function registerGameAsIP(
  input: IPRegistrationInput
): Promise<IPRegistrationResult> {
  try {
    // Validate configuration
    const config = initializeStoryClient();

    if (!config.hasValidConfig) {
      throw new Error("Story Protocol client not properly configured");
    }

    // TODO: Implement full Story Protocol SDK registration
    // Steps:
    // 1. Initialize StoryClient with wallet and RPC
    // 2. Generate IP metadata using client.ipAsset.generateIpMetadata()
    // 3. Hash metadata for integrity verification
    // 4. Call client.ipAsset.registerIpAsset() with:
    //    - spgNftContract address
    //    - ipMetadata with URIs and hashes
    //    - licenseTermsData (commercial remix flavor)
    // 5. Wait for transaction confirmation
    // 6. Return response with ipId, txHash, and license terms

    console.warn(
      "Story Protocol IP registration placeholder - full SDK integration needed"
    );

    return {
      storyIPAssetId: "placeholder",
      ipId: "placeholder",
      txHash: "0x0000000000000000000000000000000000000000000000000000000000000000",
      registeredAt: Math.floor(Date.now() / 1000),
      licenseTermsIds: [],
    };
  } catch (error) {
    console.error("Error registering IP on Story Protocol:", error);
    throw new Error(
      `IP registration failed: ${error instanceof Error ? error.message : "Unknown error"}`
    );
  }
}

/**
 * Get IP Asset details from Story Protocol
 *
 * See: https://docs.story.foundation/sdk-reference/ip-asset
 */
export async function getIPAssetDetails(ipId: string) {
  try {
    initializeStoryClient();

    // TODO: Implement using client.ipAsset APIs
    // Call appropriate SDK method to fetch IP asset metadata from Story

    return {
      ipId,
      title: "Placeholder",
      description: "This is a placeholder IP asset",
    };
  } catch (error) {
    console.error("Error retrieving IP asset:", error);
    throw new Error(
      `Failed to retrieve IP asset: ${error instanceof Error ? error.message : "Unknown error"}`
    );
  }
}

/**
 * Attach additional license terms to an existing IP Asset
 * This allows the IP owner to offer more licensing options
 *
 * See: https://docs.story.foundation/sdk-reference/license
 */
export async function attachLicenseTermsToIP(
  ipId: string,
  licenseTermsId: number | bigint
): Promise<{ txHash: string; attachedAt: number }> {
  try {
    initializeStoryClient();

    // TODO: Implement using client.license.attachLicenseTerms()

    return {
      txHash: "0x0000000000000000000000000000000000000000000000000000000000000000",
      attachedAt: Math.floor(Date.now() / 1000),
    };
  } catch (error) {
    console.error("Error attaching license terms:", error);
    throw new Error(
      `Failed to attach license terms: ${error instanceof Error ? error.message : "Unknown error"}`
    );
  }
}

/**
 * Mint license tokens for an IP Asset
 * This allows users to create derivatives of the IP based on the license terms
 *
 * See: https://docs.story.foundation/sdk-reference/license
 */
export async function mintLicenseTokens(
  licensorIpId: string,
  licenseTermsId: number | bigint,
  receiver: Address,
  amount: number = 1
): Promise<{ txHash: string; licenseTokenIds: bigint[] }> {
  try {
    initializeStoryClient();

    // TODO: Implement using client.license.mintLicenseTokens()

    return {
      txHash: "0x0000000000000000000000000000000000000000000000000000000000000000",
      licenseTokenIds: [],
    };
  } catch (error) {
    console.error("Error minting license tokens:", error);
    throw new Error(
      `Failed to mint license tokens: ${error instanceof Error ? error.message : "Unknown error"}`
    );
  }
}

/**
 * Register a derivative IP Asset based on a parent IP Asset
 * This creates a new IP that inherits the parent's license terms
 *
 * Derivatives automatically configured with:
 * - Parent's license terms (immutable)
 * - Revenue sharing to parent based on license terms
 * - Same royalty policy as parent
 */
export async function registerDerivativeIP(
  parentIpId: string,
  licenseTokenId: number | bigint,
  derivativeTitle: string,
  derivativeDescription: string
): Promise<IPRegistrationResult> {
  try {
    initializeStoryClient();

    // TODO: Implement using client.ipAsset.registerIpAndMakeDerivative() or similar
    // This should:
    // 1. Create new IP asset for the derivative
    // 2. Link it to parent through license token burn
    // 3. Inherit license terms from parent
    // 4. Establish royalty stream

    return {
      storyIPAssetId: "placeholder",
      ipId: "placeholder",
      txHash: "0x0000000000000000000000000000000000000000000000000000000000000000",
      registeredAt: Math.floor(Date.now() / 1000),
      licenseTermsIds: [],
    };
  } catch (error) {
    console.error("Error registering derivative IP:", error);
    throw new Error(
      `Failed to register derivative IP: ${error instanceof Error ? error.message : "Unknown error"}`
    );
  }
}

/**
 * Claim royalties from an IP Asset
 * This allows IP owners to collect revenue generated by their IP
 *
 * See: https://docs.story.foundation/sdk-reference/royalty
 */
export async function claimRoyalties(
  ancestorIpId: string,
  claimer: Address,
  childIpIds: string[],
  royaltyPolicies: Address[],
  currencyTokens: Address[]
): Promise<{ txHash: string; claimedAt: number }> {
  try {
    initializeStoryClient();

    // TODO: Implement using client.royalty.claimAllRevenue()

    return {
      txHash: "0x0000000000000000000000000000000000000000000000000000000000000000",
      claimedAt: Math.floor(Date.now() / 1000),
    };
  } catch (error) {
    console.error("Error claiming royalties:", error);
    throw new Error(
      `Failed to claim royalties: ${error instanceof Error ? error.message : "Unknown error"}`
    );
  }
}

/**
 * Get claimable royalty revenue for an IP
 */
export async function getClaimableRevenue(
  royaltyVaultIpId: string,
  claimer: Address,
  token: Address
): Promise<bigint> {
  try {
    initializeStoryClient();

    // TODO: Implement using client.royalty.claimableRevenue()

    return BigInt(0);
  } catch (error) {
    console.error("Error retrieving claimable revenue:", error);
    throw new Error(
      `Failed to retrieve claimable revenue: ${error instanceof Error ? error.message : "Unknown error"}`
    );
  }
}
