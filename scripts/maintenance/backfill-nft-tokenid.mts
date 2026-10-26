#!/usr/bin/env tsx
/**
 * Backfill nftTokenId for games that have a mint transaction but a NULL
 * tokenId. The mint route now recovers the tokenId from the on-chain
 * GameMinted/Transfer event, but the 4 games minted before that fix are
 * stuck — and promptVaultUuid ('inco:<tokenId>') can never be set for them,
 * so their secret panels can't go through Inco encryption.
 *
 * For each row we read the mint receipt and find the ERC-721 Transfer event
 * emitted by the game's NFT contract where `from` is the zero address —
 * topics[3] is the tokenId.
 *
 * Dry-run by default; pass --write to persist.
 *
 * Usage: pnpm exec tsx scripts/maintenance/backfill-nft-tokenid.mts [--write]
 */
import { PrismaClient } from '@prisma/client'
import { PrismaNeon } from '@prisma/adapter-neon'
import ws from 'ws'
import { config as dotenv } from 'dotenv'
import { createPublicClient, http, fallback, type Chain } from 'viem'

dotenv({ path: '.env.local' }); dotenv()

const WRITE = process.argv.includes('--write')
const ERC721_TRANSFER_TOPIC =
  '0xddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef'
const ZERO_ADDR_TOPIC = '0x0000000000000000000000000000000000000000000000000000000000000000'

const connectionString = process.env.DATABASE_URL
if (!connectionString) throw new Error('DATABASE_URL not set')
const { neonConfig } = await import('@neondatabase/serverless')
neonConfig.webSocketConstructor = ws
const prisma = new PrismaClient({ adapter: new PrismaNeon({ connectionString }) })

const RPC_BY_CHAIN: Record<number, string[]> = {
  8453: ['https://mainnet.base.org', 'https://base.llamarpc.com'],
}

function clientFor(chainId: number) {
  const urls = RPC_BY_CHAIN[chainId]
  if (!urls?.length) throw new Error(`No RPC configured for chain ${chainId}`)
  return createPublicClient({
    chain: { id: chainId, name: `Chain ${chainId}`, nativeCurrency: { name: 'Ether', symbol: 'ETH', decimals: 18 }, rpcUrls: { default: { http: urls } } } as Chain,
    transport: fallback(urls.map((u) => http(u, { timeout: 15_000 }))),
  })
}

const games = await prisma.game.findMany({
  where: { nftTransactionHash: { not: null }, nftTokenId: null },
  select: { id: true, slug: true, nftTransactionHash: true, nftChainId: true, nftContractAddress: true, ownerWallet: true },
})

console.log(`${games.length} game(s) with a mint tx but no tokenId${WRITE ? '' : ' (dry-run — pass --write to persist)'}`)

for (const game of games) {
  try {
    if (!game.nftChainId || !game.nftContractAddress) {
      console.log(`  ${game.slug}: skipped — missing nftChainId/nftContractAddress`)
      continue
    }
    const receipt = await clientFor(game.nftChainId).getTransactionReceipt({
      hash: game.nftTransactionHash as `0x${string}`,
    })
    if (receipt.status !== 'success') {
      // The recorded "mint" reverted on-chain — the game was never minted.
      // Report only: clearing nftTransactionHash is a destructive call the
      // operator should make after reviewing the tx.
      console.log(`  ${game.slug}: MINT REVERTED on-chain (${game.nftTransactionHash}) — never minted; safe to re-mint`)
      continue
    }
    const mintLog = receipt.logs.find(
      (l) =>
        l.address.toLowerCase() === game.nftContractAddress!.toLowerCase() &&
        l.topics[0]?.toLowerCase() === ERC721_TRANSFER_TOPIC &&
        l.topics[1]?.toLowerCase() === ZERO_ADDR_TOPIC &&
        l.topics.length >= 4
    )
    if (!mintLog) {
      console.log(`  ${game.slug}: no mint Transfer event from ${game.nftContractAddress} in ${game.nftTransactionHash}`)
      continue
    }
    const tokenId = BigInt(mintLog.topics[3]!).toString()
    const to = `0x${mintLog.topics[2]!.slice(-40)}`
    console.log(`  ${game.slug}: tokenId=${tokenId} minted to ${to}${to.toLowerCase() !== game.ownerWallet?.toLowerCase() ? ' (≠ ownerWallet!)' : ''}`)
    if (WRITE) {
      await prisma.game.update({ where: { id: game.id }, data: { nftTokenId: tokenId } })
    }
  } catch (err) {
    console.error(`  ${game.slug}: failed —`, err instanceof Error ? err.message : err)
  }
}

await prisma.$disconnect()
