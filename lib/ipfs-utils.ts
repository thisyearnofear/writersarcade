/**
 * IPFS Utilities for Story Protocol
 * Handles metadata uploads to IPFS for IP asset registration
 */

import { createHash } from "crypto";

/**
 * Upload metadata to IPFS
 * Requires PINATA_JWT or similar IPFS provider credentials
 */
export async function uploadToIPFS(metadata: object): Promise<string> {
  const pinataBearerToken = process.env.PINATA_JWT;

  if (!pinataBearerToken) {
    console.warn(
      "PINATA_JWT not set. Using mock IPFS hash. Set PINATA_JWT to enable real uploads."
    );
    return generateMockIPFSHash(JSON.stringify(metadata));
  }

  try {
    // Upload to Pinata
    const response = await fetch("https://api.pinata.cloud/pinning/pinJSONToIPFS", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${pinataBearerToken}`,
      },
      body: JSON.stringify({
        pinataContent: metadata,
        pinataMetadata: {
          name: `WritArcade Asset ${Date.now()}`,
          keyvalues: {
            type: "asset-metadata",
            timestamp: new Date().toISOString(),
          },
        },
      }),
    });

    if (!response.ok) {
      throw new Error(`Pinata upload failed: ${response.statusText}`);
    }

    const data = (await response.json()) as { IpfsHash: string };
    const ipfsHash = data.IpfsHash;

    console.log(`✓ Uploaded to IPFS: ipfs://${ipfsHash}`);
    return `ipfs://${ipfsHash}`;
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Unknown IPFS error";
    console.error(`IPFS upload error: ${message}`);

    // Fall back to mock for development
    console.warn("Falling back to mock IPFS hash for development");
    return generateMockIPFSHash(JSON.stringify(metadata));
  }
}

/**
 * Generate a consistent mock IPFS hash for development
 */
function generateMockIPFSHash(data: string): string {
  // Simulate a real IPFS hash format
  const hash = createHash("sha256").update(data).digest("hex");
  return `ipfs://QmMock${hash.slice(0, 50)}`;
}

/**
 * Compute metadata hash for Story Protocol registration
 * Story requires a hash of metadata for integrity verification
 */
export function computeMetadataHash(metadata: object): string {
  const jsonString = JSON.stringify(metadata);
  const hash = createHash("sha256").update(jsonString).digest("hex");
  return `0x${hash}`;
}

/**
 * Format metadata for Story Protocol registration
 */
export interface IPAssetMetadata {
  title: string;
  description: string;
  creators?: Array<{
    name: string;
    address: string;
    contributionPercent: number;
  }>;
  attributes?: Array<{
    key: string;
    value: string;
  }>;
  mediaUrl?: string;
  ipfsUrl?: string;
  timestamp: string;
}

/**
 * Build asset metadata for IP registration
 */
export function buildAssetMetadata(params: {
  title: string;
  description: string;
  creatorAddress: string;
  creatorName?: string;
  genre: string;
  tags?: string[];
  articleUrl?: string;
  imageUrl?: string;
}): IPAssetMetadata {
  return {
    title: params.title,
    description: params.description,
    creators: [
      {
        name: params.creatorName || "Unknown Creator",
        address: params.creatorAddress,
        contributionPercent: 100,
      },
    ],
    attributes: [
      { key: "genre", value: params.genre },
      ...(params.tags
        ? params.tags.map((tag, i) => ({ key: `tag_${i}`, value: tag }))
        : []),
      ...(params.articleUrl
        ? [{ key: "articleUrl", value: params.articleUrl }]
        : []),
    ],
    ...(params.imageUrl ? { mediaUrl: params.imageUrl } : {}),
    timestamp: new Date().toISOString(),
  };
}
