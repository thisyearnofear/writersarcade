/**
 * Story Protocol Service (Client-Side)
 *
 * Handles IP registration for WritArcade games and assets.
 * ALL operations use the user's wallet - THEY sign transactions.
 * 
 * This is the single source of truth for Story Protocol interactions.
 * 
 * SDK Reference: https://docs.story.foundation/sdk-reference/overview
 */

import { Address } from "viem";
import { StoryClient, IpMetadata } from "@story-protocol/core-sdk";
import { computeMetadataHash } from "./ipfs-utils";
import {
  STORY_SPG_CONTRACT,
  getIPAssetExplorerUrl,
  getTxExplorerUrl
} from "./story-sdk-client";

// ============================================================================
// Types
// ============================================================================

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
  parentIpIds?: string[]; // Optional: Assets this game is derived from
}

export interface IPRegistrationResult {
  ipId: string;
  txHash: string;
  registeredAt: number;
  explorerUrl: string;
  txExplorerUrl: string;
  licenseTermsIds: bigint[];
}

export interface AssetIPRegistrationInput {
  title: string;
  description: string;
  type: "character" | "mechanic" | "plot" | "world" | "dialog";
  genre: string;
  tags: string[];
  creatorAddress: Address;
  metadataUri: string;
}

// ============================================================================
// Core Registration Functions (Client-Side - User Signs)
// ============================================================================

/**
 * Register a game as an IP Asset on Story Protocol
 * 
 * USER FLOW:
 * 1. User is on Story Aeneid network (via chain switch)
 * 2. User clicks "Register IP"
 * 3. Wallet prompts for signature
 * 4. Transaction sent from USER'S wallet
 * 5. IP registered with USER as owner
 * 
 * @param client - StoryClient created from user's wallet
 * @param input - Game metadata for IP registration
 */
export async function registerGameAsIP(
  client: StoryClient,
  input: IPRegistrationInput
): Promise<IPRegistrationResult> {
  console.log(`📝 Registering game IP: ${input.title}`);
  console.log(`   Creator: ${input.gameCreatorAddress}`);
  console.log(`   Metadata: ${input.nftMetadataUri}`);

  // 1. Generate IP metadata with attribution
  const ipMetadata: IpMetadata = client.ipAsset.generateIpMetadata({
    title: input.title,
    description: input.description,
    watermarkImg: input.gameMetadataUri,
    attributes: [
      { key: "GameCreator", value: input.gameCreatorAddress },
      { key: "Author", value: input.authorParagraphUsername },
      { key: "AuthorWallet", value: input.authorWalletAddress },
      { key: "Genre", value: input.genre },
      { key: "Difficulty", value: input.difficulty },
      { key: "ArticleURL", value: input.articleUrl },
      { key: "Platform", value: "WritArcade" },
      { key: "ParentAssets", value: input.parentIpIds?.join(",") || "None" },
    ],
  });

  // 2. Compute metadata hashes for integrity
  const ipMetadataHash = computeMetadataHash(ipMetadata);
  const nftMetadataHash = computeMetadataHash({
    name: input.title,
    description: input.description,
  });

  // 3. Mint and register IP - USER SIGNS THIS TRANSACTION
  const response = await client.ipAsset.mintAndRegisterIp({
    spgNftContract: STORY_SPG_CONTRACT,
    ipMetadata: {
      ipMetadataURI: input.nftMetadataUri,
      ipMetadataHash: ipMetadataHash as `0x${string}`,
      nftMetadataURI: input.nftMetadataUri,
      nftMetadataHash: nftMetadataHash as `0x${string}`,
    },
  });

  if (!response.ipId) {
    throw new Error("IP registration failed: No IP ID returned");
  }

  const ipId = response.ipId as string;
  const txHash = response.txHash as string;

  console.log(`✅ Game IP registered: ${ipId}`);
  console.log(`   Transaction: ${txHash}`);

  // 4. Attach license terms (allow derivatives with royalties)
  let licenseTermsIds: bigint[] = [];
  try {
    await client.license.attachLicenseTerms({
      ipId: ipId as `0x${string}`,
      licenseTermsId: 1n, // Default PIL commercial remix terms
    });
    licenseTermsIds = [1n];
    console.log(`✅ License terms attached (PIL Commercial Remix)`);
  } catch (licenseError) {
    console.warn(`⚠️ Could not attach license terms:`, licenseError);
    // Non-fatal - IP is still registered
  }

  // 5. Register as derivative if parent assets provided
  if (input.parentIpIds?.length) {
    console.log(`🔗 Linking to ${input.parentIpIds.length} parent asset(s)...`);
    for (const parentId of input.parentIpIds) {
      try {
        await client.ipAsset.registerDerivative({
          childIpId: ipId as `0x${string}`,
          parentIpIds: [parentId as `0x${string}`],
          licenseTermsIds: [1n],
        });
        console.log(`   ✅ Linked to parent: ${parentId}`);
      } catch (linkError) {
        console.warn(`   ⚠️ Failed to link to ${parentId}:`, linkError);
      }
    }
  }

  return {
    ipId,
    txHash,
    registeredAt: Math.floor(Date.now() / 1000),
    explorerUrl: getIPAssetExplorerUrl(ipId),
    txExplorerUrl: getTxExplorerUrl(txHash),
    licenseTermsIds,
  };
}

/**
 * Register a standalone asset as IP
 * Used for marketplace assets (characters, mechanics, etc.)
 */
export async function registerAssetAsIP(
  client: StoryClient,
  input: AssetIPRegistrationInput
): Promise<IPRegistrationResult> {
  console.log(`📝 Registering asset IP: ${input.title} (${input.type})`);

  const ipMetadata: IpMetadata = client.ipAsset.generateIpMetadata({
    title: input.title,
    description: input.description,
    attributes: [
      { key: "Type", value: input.type },
      { key: "Genre", value: input.genre },
      { key: "Tags", value: input.tags.join(",") },
      { key: "Creator", value: input.creatorAddress },
      { key: "Platform", value: "WritArcade" },
    ],
  });

  const ipMetadataHash = computeMetadataHash(ipMetadata);
  const nftMetadataHash = computeMetadataHash({
    name: input.title,
    description: input.description,
  });

  // USER SIGNS THIS TRANSACTION
  const response = await client.ipAsset.mintAndRegisterIp({
    spgNftContract: STORY_SPG_CONTRACT,
    ipMetadata: {
      ipMetadataURI: input.metadataUri,
      ipMetadataHash: ipMetadataHash as `0x${string}`,
      nftMetadataURI: input.metadataUri,
      nftMetadataHash: nftMetadataHash as `0x${string}`,
    },
  });

  if (!response.ipId) {
    throw new Error("Asset IP registration failed: No IP ID returned");
  }

  const ipId = response.ipId as string;
  const txHash = response.txHash as string;

  console.log(`✅ Asset IP registered: ${ipId}`);

  // Attach commercial remix license for derivatives
  let licenseTermsIds: bigint[] = [];
  try {
    await client.license.attachLicenseTerms({
      ipId: ipId as `0x${string}`,
      licenseTermsId: 1n,
    });
    licenseTermsIds = [1n];
  } catch (error) {
    console.warn(`⚠️ License attachment skipped:`, error);
  }

  return {
    ipId,
    txHash,
    registeredAt: Math.floor(Date.now() / 1000),
    explorerUrl: getIPAssetExplorerUrl(ipId),
    txExplorerUrl: getTxExplorerUrl(txHash),
    licenseTermsIds,
  };
}

// ============================================================================
// Royalty & Revenue Functions
// ============================================================================

/**
 * Claim royalties from derivative works
 * IP owners can claim revenue generated by derivatives of their IP
 */
export async function claimRoyalties(
  client: StoryClient,
  ancestorIpId: string,
  claimer: Address,
  childIpIds: string[],
  royaltyPolicies: Address[],
  currencyTokens: Address[]
): Promise<{ txHash: string; claimedAt: number }> {
  console.log(`💰 Claiming royalties for IP ${ancestorIpId}`);

  const response = await client.royalty.claimAllRevenue({
    ancestorIpId: ancestorIpId as `0x${string}`,
    claimer: claimer as `0x${string}`,
    childIpIds: childIpIds.map((id) => id as `0x${string}`),
    royaltyPolicies: royaltyPolicies.map((p) => p as `0x${string}`),
    currencyTokens: currencyTokens.map((t) => t as `0x${string}`),
  });

  const txHash = Array.isArray(response.txHashes)
    ? response.txHashes[0]
    : response.txHashes;

  console.log(`✅ Royalties claimed: ${txHash}`);

  return {
    txHash: txHash as string,
    claimedAt: Math.floor(Date.now() / 1000),
  };
}

// ============================================================================
// License Functions
// ============================================================================

/**
 * Mint license tokens for an IP
 * Required for others to create derivatives
 */
export async function mintLicenseTokens(
  client: StoryClient,
  licensorIpId: string,
  licenseTermsId: bigint,
  receiver: Address,
  amount: number = 1
): Promise<{ txHash: string; licenseTokenIds: bigint[] }> {
  console.log(`🎫 Minting ${amount} license token(s) for IP ${licensorIpId}`);

  const response = await client.license.mintLicenseTokens({
    licensorIpId: licensorIpId as `0x${string}`,
    licenseTermsId,
    receiver: receiver,
    amount: BigInt(amount),
  });

  console.log(`✅ License tokens minted: ${response.txHash}`);

  return {
    txHash: response.txHash as string,
    licenseTokenIds: response.licenseTokenIds || [],
  };
}

// ============================================================================
// Utility Exports
// ============================================================================

export {
  STORY_SPG_CONTRACT,
  getIPAssetExplorerUrl,
  getTxExplorerUrl
} from "./story-sdk-client";

export { PILFlavor } from "@story-protocol/core-sdk";
