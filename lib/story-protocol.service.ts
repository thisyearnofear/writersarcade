/**
 * Story Protocol Service (v1.4.2)
 *
 * Handles IP registration, royalty configuration, and license management for WritArcade games.
 * Connects to Story Protocol to register games as intellectual property assets.
 *
 * This service is a placeholder for Story Protocol integration.
 * Full implementation requires completing the SDK API integration based on official examples.
 */

import { Address, toHex } from "viem";
import { getStoryClient } from "./story-sdk-client";
import { computeMetadataHash } from "./ipfs-utils";
import { IpMetadata } from "@story-protocol/core-sdk";

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
  _input: IPRegistrationInput
): Promise<IPRegistrationResult> {
  try {
    // Validate configuration
    const config = initializeStoryClient();

    if (!config.hasValidConfig) {
      throw new Error("Story Protocol client not properly configured");
    }

    // Initialize Story Client
    const client = getStoryClient();

    // Prepare IP Metadata
    const ipMetadata: IpMetadata = client.ipAsset.generateIpMetadata({
      title: _input.title,
      description: _input.description,
      watermarkImg: _input.gameMetadataUri, // Use game metadata URI as "watermark" or similar
      attributes: [
        { key: "GameCreator", value: _input.gameCreatorAddress },
        { key: "Author", value: _input.authorParagraphUsername },
        { key: "Genre", value: _input.genre },
        { key: "Difficulty", value: _input.difficulty },
        { key: "ArticleURL", value: _input.articleUrl },
      ],
    });

    const ipMetadataHash = computeMetadataHash(ipMetadata);
    const nftMetadataHash = computeMetadataHash({
      name: _input.title,
      description: _input.description,
    }); // Simplified for now, really should hash the NFT metadata content

    // Use default SPG NFT Contract if not configured
    // Note: In production, this should be your own deployed SPG collection
    const spgNftContract = (process.env.STORY_SPG_NFT_CONTRACT ||
      "0xc32A8a09943AA28dD9240317BDD0cb70A88B983d") as Address;
    // 0xc32... is a public testnet SPG collection often used in examples

    console.log(" Minting and Registering IP on Story Protocol...");

    const response = await client.ipAsset.mintAndRegisterIp({
      spgNftContract,
      ipMetadata: {
        ipMetadataURI: _input.nftMetadataUri, // URI for the IP metadata
        ipMetadataHash: ipMetadataHash as `0x${string}`,
        nftMetadataURI: _input.nftMetadataUri, // URI for the NFT metadata
        nftMetadataHash: nftMetadataHash as `0x${string}`,
      },
    });

    if (!response.ipId) {
      throw new Error("Failed to register IP: No IP ID returned");
    }

    console.log(`✓ IP Registered. IP ID: ${response.ipId}, Tx: ${response.txHash}`);

    return {
      storyIPAssetId: response.ipId as string,
      ipId: response.ipId as string,
      txHash: response.txHash as string,
      registeredAt: Math.floor(Date.now() / 1000),
      licenseTermsIds: [], // We could attach license terms here if needed
    };
  } catch (error) {
    console.error("Error registering IP on Story Protocol:", error);
    // In hackathon mode, we might want to return a mock if it fails to not block UI
    // But strict implementation requires throwing
    if (process.env.NODE_ENV === 'production') {
      throw new Error(
        `IP registration failed: ${error instanceof Error ? error.message : "Unknown error"}`
      );
    }

    console.warn("Falling back to mock response due to error (dev mode):", error);
    return {
      storyIPAssetId: "mock-ip-" + Date.now(),
      ipId: "mock-ip-" + Date.now(),
      txHash: "0x0000000000000000000000000000000000000000000000000000000000000000",
      registeredAt: Math.floor(Date.now() / 1000),
      licenseTermsIds: [],
    };
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
  _ipId: string,
  _licenseTermsId: number | bigint
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
  _licensorIpId: string,
  _licenseTermsId: number | bigint,
  _receiver: Address,
  _amount: number = 1
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
  _parentIpId: string,
  _licenseTokenId: number | bigint,
  _derivativeTitle: string,
  _derivativeDescription: string
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
  _ancestorIpId: string,
  _claimer: Address,
  _childIpIds: string[],
  _royaltyPolicies: Address[],
  _currencyTokens: Address[]
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
  _royaltyVaultIpId: string,
  _claimer: Address,
  _token: Address
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
