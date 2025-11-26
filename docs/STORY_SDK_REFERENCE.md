# Story Protocol SDK v1.4.2 - Integration Reference

This document provides concrete examples of the SDK calls needed to complete the WritArcade integration.

## Client Initialization

```typescript
import { StoryClient } from "@story-protocol/core-sdk";
import { http } from "viem";
import { privateKeyToAccount } from "viem/accounts";

const account = privateKeyToAccount(`0x${STORY_WALLET_KEY.replace(/^0x/, "")}`);

const client = StoryClient.newClient({
  account,
  transport: http(STORY_RPC_URL),
});
```

## IP Asset Registration

### Function: `registerGameAsIP()`

**Current Status:** Placeholder implementation returns mock data
**Target SDK Call:** `client.ipAsset.registerIpAsset()`

**Implementation Steps:**

```typescript
export async function registerGameAsIP(
  input: IPRegistrationInput
): Promise<IPRegistrationResult> {
  const client = initializeStoryClient();

  // 1. Generate metadata using SDK helper
  const ipMetadata = client.ipAsset.generateIpMetadata({
    title: input.title,
    description: input.description,
    creators: [{
      name: input.authorParagraphUsername,
      address: input.authorWalletAddress,
      contributionPercent: 100,
    }],
    attributes: [
      { key: "articleUrl", value: input.articleUrl },
      { key: "genre", value: input.genre },
      { key: "difficulty", value: input.difficulty },
      { key: "gameCreator", value: input.gameCreatorAddress },
    ],
  });

  // 2. Hash metadata
  const ipHash = createHash('sha256')
    .update(JSON.stringify(ipMetadata))
    .digest('hex');

  // 3. Register on Story
  const response = await client.ipAsset.registerIpAsset({
    // API structure from v1.4.2 - check actual SDK types
    spgNftContract: process.env.NEXT_PUBLIC_STORY_SPG_CONTRACT,
    ipMetadata: {
      ipMetadataURI: input.gameMetadataUri,
      ipMetadataHash: `0x${ipHash}`,
      nftMetadataURI: input.nftMetadataUri,
      nftMetadataHash: `0x...`, // compute hash
    },
  });

  return {
    storyIPAssetId: response.ipId,
    ipId: response.ipId,
    txHash: response.txHash,
    registeredAt: Math.floor(Date.now() / 1000),
    licenseTermsIds: response.licenseTermsIds || [],
  };
}
```

**Reference:**
- Docs: https://docs.story.foundation/developers/typescript-sdk/register-ip-asset
- Example: https://github.com/storyprotocol/typescript-tutorial/blob/main/scripts/registration/register.ts

## License Management

### Function: `attachLicenseTermsToIP()`

**Target SDK Call:** `client.license.attachLicenseTerms()`

```typescript
const response = await client.license.attachLicenseTerms({
  ipId: ipId as Address,
  licenseTermsId: licenseTermsId, // number or bigint
  licenseTemplate: "0x...", // optional
});

return {
  txHash: response.txHash,
  attachedAt: Math.floor(Date.now() / 1000),
};
```

**Reference:** https://docs.story.foundation/sdk-reference/license

### Function: `mintLicenseTokens()`

**Target SDK Call:** `client.license.mintLicenseTokens()`

```typescript
const response = await client.license.mintLicenseTokens({
  licensorIpId: licensorIpId as Address,
  licenseTermsId: licenseTermsId,
  receiver: receiver,
  amount: amount, // number of tokens
  maxMintingFee: "0", // string or bigint
  maxRevenueShare: 100, // number in basis points
});

return {
  txHash: response.txHash,
  licenseTokenIds: response.licenseTokenIds || [],
};
```

**Key Points:**
- User must have mint license tokens to create derivatives
- License tokens are burned when registering derivative
- Different from license terms (terms are reusable, tokens are consumable)

## Derivative Registration

### Function: `registerDerivativeIP()`

**Target SDK Call:** `client.ipAsset.registerIpAndMakeDerivative()`

```typescript
const response = await client.ipAsset.registerIpAndMakeDerivative({
  parentIpId: parentIpId as Address,
  licenseTokenId: licenseTokenId, // from minting step
  ipMetadata: {
    ipMetadataURI: derivativeMetadataUri,
    ipMetadataHash: `0x${metadataHash}`,
    nftMetadataURI: derivativeNftUri,
    nftMetadataHash: `0x${nftHash}`,
  },
});

return {
  storyIPAssetId: response.ipId,
  ipId: response.ipId,
  txHash: response.txHash,
  registeredAt: Math.floor(Date.now() / 1000),
  licenseTermsIds: [],
};
```

**Important:**
- Derivative inherits parent's license terms (immutable)
- Revenue automatically flows to parent based on license
- Derivative cannot attach new license terms
- License token is burned in process

**Reference:** https://docs.story.foundation/concepts/licensing-module/license-terms

## Royalty Management

### Function: `claimRoyalties()`

**Target SDK Call:** `client.royalty.claimAllRevenue()`

```typescript
const response = await client.royalty.claimAllRevenue({
  ancestorIpId: ancestorIpId as Address,
  claimer: claimer, // wallet or IP address
  childIpIds: childIpIds.map(id => id as Address),
  royaltyPolicies: royaltyPolicies, // array of policy addresses
  currencyTokens: currencyTokens, // array of token addresses
  claimOptions: {
    autoTransferAllClaimedTokensFromIp: true,
    autoUnwrapIpTokens: true, // convert $WIP back to $IP
  },
});

return {
  txHash: response.txHashes?.[0] || "",
  claimedAt: Math.floor(Date.now() / 1000),
};
```

**Key Points:**
- Claims revenue from all child/derivative IPs
- Distributes according to royalty policy (LAP = Linear Amount Per)
- Auto-unwraps $WIP tokens back to $IP
- Can be called by IP owner or claimer address

### Function: `getClaimableRevenue()`

**Target SDK Call:** `client.royalty.claimableRevenue()`

```typescript
const revenue = await client.royalty.claimableRevenue({
  ipId: royaltyVaultIpId as Address,
  claimer: claimer,
  token: currencyToken,
});

return revenue || BigInt(0);
```

**Returns:** Claimable amount in smallest token unit (wei)

**Reference:** https://docs.story.foundation/sdk-reference/royalty

## Network & Contract Addresses

### Aeneid Testnet (1315)

```typescript
const AENEID_ADDRESSES = {
  rpc: "https://aeneid.storyrpc.io",
  spgNftContract: "0xc32A8a0FF3beDDDa58393d022aF433e78739FAbc",
  ipToken: "0x1514000000000000000000000000000000000000",
  wipToken: "0x1514000000000000000000000000000000000000",
  royaltyPolicyLap: "0xBe54FB168b3c982b7AaE60dB6CF75Bd8447b390E",
  faucet: "https://faucet.story.foundation/",
  explorer: "https://aeneid-testnet-explorer.story.foundation/",
};
```

### Mainnet (1513)

```typescript
const MAINNET_ADDRESSES = {
  rpc: "https://story-rpc.xyz", // or other providers
  spgNftContract: "0x...", // mainnet contract
  ipToken: "0x...", // mainnet IP token
  wipToken: "0x...", // mainnet WIP token
  royaltyPolicyLap: "0x...", // mainnet policy
  explorer: "https://www.storyscan.io/",
};
```

## Error Handling

### Common Errors & Solutions

```typescript
try {
  // SDK call
} catch (error) {
  if (error.message.includes("insufficient balance")) {
    // Need more testnet tokens
    console.log("Visit faucet: https://faucet.story.foundation/");
  } else if (error.message.includes("license terms already attached")) {
    // IP already has this license - check existing terms first
  } else if (error.message.includes("invalid metadata hash")) {
    // Recompute hash - ensure JSON serialization is consistent
  } else if (error.message.includes("STORY_RPC_URL")) {
    // Environment variable not set
  } else if (error instanceof Error) {
    console.error(`SDK Error: ${error.message}`);
  }
}
```

## Testing Pattern

```typescript
// 1. Fund wallet
console.log("Fund this wallet:", account.address);

// 2. Register IP
const reg = await registerGameAsIP({
  title: "Test Game",
  description: "Test",
  articleUrl: "https://example.com",
  gameCreatorAddress: creatorAddress,
  authorParagraphUsername: "testauthor",
  authorWalletAddress: authorAddress,
  genre: "horror",
  difficulty: "easy",
  gameMetadataUri: "ipfs://...",
  nftMetadataUri: "ipfs://...",
});
console.log("IP Registered:", reg.ipId);

// 3. Check on explorer
console.log(`https://aeneid-testnet-explorer.story.foundation/tx/${reg.txHash}`);

// 4. Verify on Story Explorer
console.log(`https://aeneid-testnet-explorer.story.foundation/ipa/${reg.ipId}`);
```

## Type Definitions Needed

From SDK:

```typescript
// Export these types for use in WritArcade
import {
  IpMetadata,
  PILFlavor,
  WIP_TOKEN_ADDRESS,
  Address,
  RegisterIpResponse,
  LicenseTermsIdInput,
  TxOptions,
} from "@story-protocol/core-sdk";
```

## Version Notes

- **Current Version:** 1.4.2 (latest stable)
- **Previous Attempt:** 0.8.0 (never released, doesn't exist)
- **API Stability:** v1.4.x is stable and production-ready
- **Docs Updated:** November 2025

## Implementation Checklist

- [ ] Client initialization working
- [ ] IP registration returns real ipId
- [ ] License terms attached successfully
- [ ] License tokens minted successfully
- [ ] Derivatives registered successfully
- [ ] Royalties claimed successfully
- [ ] All 6 functions fully implemented
- [ ] Database models created
- [ ] API route tested end-to-end
- [ ] UI updated with real data
- [ ] Error handling for all cases
- [ ] Documentation updated

---

**Next Step:** Replace placeholder implementations with actual SDK calls using this reference.
