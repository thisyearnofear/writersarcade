import { createPublicClient, http, type Chain, type PublicClient } from 'viem'
import { decodeFunctionData, decodeEventLog, keccak256, parseAbi, toBytes } from 'viem'
import { base as baseChain } from 'viem/chains'
import { getWriterCoinById, MUSD_CONFIG, MEZO_CONFIG, MEZO_TREASURY_ADDRESS } from '@/lib/writer-coins'
import { BASE_MAINNET_CHAIN_ID, MEZO_TESTNET_CHAIN_ID, MEZO_MAINNET_CHAIN_ID } from '@/lib/wallet/chains'
import { baseRpcTransport } from '@/lib/base-rpc'

export type PaymentAction = 'generate-game' | 'mint-nft'

export interface VerifyPaymentParams {
  transactionHash: `0x${string}`
  writerCoinId: string
  userAddress: string
  action: PaymentAction
  chainId: number
  /** For mint, the on-chain token ID that must match the emitted GameMinted event. */
  expectedTokenId?: string
}

/**
 * Base mainnet WriterCoinPayment ABI (the subset needed for calldata + event
 * verification). `payForGameGeneration` and `payAndMintGame` are the only
 * payment entry points that should unlock generation / minting.
 */
const GAME_METADATA_STRUCT =
  'struct GameMetadata { string articleUrl; address creator; address writerCoin; string genre; string difficulty; uint256 createdAt; string gameTitle }'

/**
 * Base mainnet WriterCoinPayment ABI (the subset needed for calldata + event
 * verification). `payForGameGeneration` and `payAndMintGame` are the only
 * payment entry points that should unlock generation / minting.
 */
const BASE_PAYMENT_ABI = parseAbi([
  GAME_METADATA_STRUCT,
  'function payForGameGeneration(address writerCoin) external',
  'function payAndMintGame(address writerCoin, string tokenURI, GameMetadata metadata) external returns (uint256)',
])

/** Mezo (MUSD) splitter ABI — payForGeneration / payAndMintGame. */
const MEZO_PAYMENT_ABI = parseAbi([
  GAME_METADATA_STRUCT,
  'function payForGeneration(uint256 amount) external',
  'function payAndMintGame(string tokenURI, GameMetadata metadata) external',
])

// Events emitted by each payment contract for the two unlockable actions.
const BASE_GENERATE_EVENT = parseAbi([
  'event GameGenerated(address indexed user, address indexed writerCoin, uint256 amountPaid, uint256 writerShare, uint256 platformShare, uint256 creatorPoolShare)',
])
const BASE_MINT_EVENT = parseAbi([
  'event GameMinted(address indexed minter, address indexed writerCoin, uint256 tokenId, uint256 amountPaid, uint256 creatorShare, uint256 writerShare, uint256 platformShare, uint256 minterRefund)',
])
const MEZO_GENERATE_EVENT = parseAbi([
  'event GameGenerationPaid(address indexed user, uint256 amount, uint256 platformFee, uint256 writerFee, bool boosted)',
])
const MEZO_MINT_EVENT = parseAbi([
  GAME_METADATA_STRUCT,
  'event GameMintedAndPaid(address indexed creator, string tokenURI, GameMetadata metadata, uint256 creatorFee, uint256 platformFee, bool boosted)',
])

// Canonical (unnamed) signatures, used to compute event topic0 = keccak256(sig).
const BASE_GENERATE_SIG = 'GameGenerated(address,address,uint256,uint256,uint256,uint256)'
const BASE_MINT_SIG = 'GameMinted(address,address,uint256,uint256,uint256,uint256,uint256,uint256)'
const MEZO_GENERATE_SIG = 'GameGenerationPaid(address,uint256,uint256,uint256,bool)'
const MEZO_MINT_SIG = 'GameMintedAndPaid(address,string,(string,address,address,string,string,uint256,string),uint256,uint256,bool)'

export function isMezoWriterCoin(writerCoinId: string): boolean {
  return writerCoinId.startsWith('musd')
}

export function getExpectedPaymentContract(writerCoinId: string): string {
  if (isMezoWriterCoin(writerCoinId)) {
    const network = writerCoinId === 'musd-mainnet' ? 'mainnet' : 'testnet'
    return MUSD_CONFIG[network].paymentSplitter
  }
  const writerCoin = getWriterCoinById(writerCoinId)
  if (!writerCoin) throw new Error(`Writer coin "${writerCoinId}" is not configured`)
  return writerCoin.paymentContractAddress
}

export function getPaymentAmount(writerCoinId: string, action: PaymentAction): bigint {
  if (isMezoWriterCoin(writerCoinId)) {
    const network = writerCoinId === 'musd-mainnet' ? 'mainnet' : 'testnet'
    const config = MUSD_CONFIG[network]
    // The deployed Mezo splitter fixes mint cost at 1 MUSD on-chain even though
    // MUSD_CONFIG.mintCost is 0.5 MUSD (informational).
    return action === 'generate-game' ? config.gameGenerationCost : 1_000_000_000_000_000_000n
  }
  const writerCoin = getWriterCoinById(writerCoinId)
  if (!writerCoin) throw new Error(`Writer coin "${writerCoinId}" is not configured`)
  return action === 'generate-game' ? writerCoin.gameGenerationCost : writerCoin.mintCost
}


function expectedFunction(action: PaymentAction, mezo: boolean): string {
  if (action === 'generate-game') return mezo ? 'payForGeneration' : 'payForGameGeneration'
  return 'payAndMintGame'
}

function selectedEventAbi(mezo: boolean, action: PaymentAction): readonly unknown[] {
  if (mezo) return action === 'generate-game' ? MEZO_GENERATE_EVENT : MEZO_MINT_EVENT
  return action === 'generate-game' ? BASE_GENERATE_EVENT : BASE_MINT_EVENT
}

/** topic0 = keccak256 of the canonical event signature. */
function eventTopic0(mezo: boolean, action: PaymentAction): string {
  const sig = mezo
    ? action === 'generate-game'
      ? MEZO_GENERATE_SIG
      : MEZO_MINT_SIG
    : action === 'generate-game'
      ? BASE_GENERATE_SIG
      : BASE_MINT_SIG
  return keccak256(toBytes(sig))
}

function decodePaymentCall(input: `0x${string}`, mezo: boolean) {
  const abi = mezo ? MEZO_PAYMENT_ABI : BASE_PAYMENT_ABI
  try {
    return decodeFunctionData({ abi: abi as never, data: input })
  } catch {
    return null
  }
}

function toNativeBigInt(value: unknown): bigint {
  if (typeof value === 'bigint') return value
  if (typeof value === 'number' || typeof value === 'string') return BigInt(value)
  if (value && typeof value === 'object' && '$type' in value && (value as { $type?: unknown }).$type === 'BigInt') {
    return BigInt(String((value as { value?: unknown }).value))
  }
  throw new Error('Invalid payment amount')
}

function getRpcUrl(chainId: number): string | null {
  if (chainId === MEZO_TESTNET_CHAIN_ID) return process.env.NEXT_PUBLIC_MEZO_TESTNET_RPC || 'https://rpc.test.mezo.org'
  if (chainId === MEZO_MAINNET_CHAIN_ID) {
    return (
      process.env.MEZO_MAINNET_RPC ||
      process.env.NEXT_PUBLIC_MEZO_MAINNET_RPC ||
      'https://rpc-http.mezo.boar.network'
    )
  }
  return null
}

/** Map a Mezo chain id to the MUSD_CONFIG network key. */
function mezoNetworkForChain(chainId: number): 'testnet' | 'mainnet' | null {
  if (chainId === MEZO_TESTNET_CHAIN_ID) return 'testnet'
  if (chainId === MEZO_MAINNET_CHAIN_ID) return 'mainnet'
  return null
}

const ERC20_TRANSFER_ABI = parseAbi([
  'function transfer(address to, uint256 amount) returns (bool)',
])
const ERC20_TRANSFER_EVENT = parseAbi([
  'event Transfer(address indexed from, address indexed to, uint256 value)',
])
const ERC20_TRANSFER_SIG = 'Transfer(address,address,uint256)'

export function createReceiptClient(chainId: number): PublicClient | null {
  if (chainId === BASE_MAINNET_CHAIN_ID) {
    return createPublicClient({ chain: baseChain, transport: baseRpcTransport() }) as PublicClient
  }
  const rpcUrl = getRpcUrl(chainId)
  if (!rpcUrl) return null
  const chain = {
    id: chainId,
    name: `Chain ${chainId}`,
    nativeCurrency: { name: 'Ether', symbol: 'ETH', decimals: 18 },
    rpcUrls: { default: { http: [rpcUrl] } },
  } as Chain
  return createPublicClient({ chain, transport: http(rpcUrl, { timeout: 15000 }) })
}

export interface PaymentEvidence {
  status: string
  logs: Array<{
    address?: string
    topics?: ReadonlyArray<string>
    data?: string
  }>
}

export interface PaymentTransaction {
  from: string
  to?: string | null
  input?: string
}

export interface VerifiedPayment {
  txHash: `${'0x'}${string}`
  amount: string
  /** Fully-qualified on-chain payment function for the action. */
  functionName: string
}

export interface VerifyEvidenceParams extends VerifyPaymentParams {
  receipt: PaymentEvidence
  transaction: PaymentTransaction
}

/**
 * Pure, network-free verification of already-fetched on-chain evidence:
 *   1. Receipt succeeded, sender matches, destination is the payment contract.
 *   2. Calldata calls the expected payment function for the requested action and
 *      (Base) the writer-coin argument matches the configured coin.
 *   3. The receipt emits the expected event for the requested action.
 *   4. Event sender matches, and the paid amount >= the configured cost.
 * Throws on any mismatch so the caller can map it to a 4xx rejection.
 */
export function verifyPaymentEvidence(params: VerifyEvidenceParams): VerifiedPayment {
  const mezo = isMezoWriterCoin(params.writerCoinId)
  const { receipt, transaction } = params
  const expectedContract = getExpectedPaymentContract(params.writerCoinId)
  const expectedAmount = getPaymentAmount(params.writerCoinId, params.action)

  if (receipt.status !== 'success') throw new Error('Transaction did not succeed')
  if (transaction.from.toLowerCase() !== params.userAddress.toLowerCase()) {
    throw new Error('Payment sender does not match connected wallet')
  }
  if (transaction.to?.toLowerCase() !== expectedContract.toLowerCase()) {
    throw new Error('Transaction was not sent to the expected payment contract')
  }

  // 2. Decode calldata and confirm the expected function.
  const requiredFn = expectedFunction(params.action, mezo)
  const decoded = decodePaymentCall((transaction.input ?? '0x') as `0x${string}`, mezo)
  if (!decoded || decoded.functionName !== requiredFn) {
    throw new Error(`Transaction did not call the expected payment function (${requiredFn})`)
  }

  // Base generate: the writer-coin argument must equal the selected coin.
  if (decoded.functionName === 'payForGameGeneration') {
    const writerCoinArg = decoded.args?.[0] as string | undefined
    const writerCoin = getWriterCoinById(params.writerCoinId)
    if (!writerCoinArg || !writerCoin || writerCoinArg.toLowerCase() !== writerCoin.address.toLowerCase()) {
      throw new Error('Writer coin in transaction does not match the selected coin')
    }
  }

  // 3. Require the expected event in the logs.
  const topic = eventTopic0(mezo, params.action)
  const matchedLog = receipt.logs.find((log) => log.topics?.[0]?.toLowerCase() === topic.toLowerCase())
  if (!matchedLog) throw new Error('Expected payment event was not found in the transaction logs')

  // 4. Decode the matched event to verify sender + amount + (Base) coin.
  const parsed = decodeEventLog({
    abi: selectedEventAbi(mezo, params.action) as never,
    data: (matchedLog.data ?? '0x') as `0x${string}`,
    topics: matchedLog.topics as [`0x${string}`, ...`0x${string}`[]],
  })
  const evArgs = (parsed.args as unknown) as Record<string, unknown>

  const eventSender = mezo
    ? params.action === 'generate-game'
      ? evArgs.user
      : evArgs.creator
    : params.action === 'generate-game'
      ? evArgs.user
      : evArgs.minter
  if (typeof eventSender !== 'string' || eventSender.toLowerCase() !== params.userAddress.toLowerCase()) {
    throw new Error('Payment event sender does not match the connected wallet')
  }

  if (!mezo) {
    const eventCoin = evArgs.writerCoin
    const writerCoin = getWriterCoinById(params.writerCoinId)
    if (!writerCoin || typeof eventCoin !== 'string' || eventCoin.toLowerCase() !== writerCoin.address.toLowerCase()) {
      throw new Error('Payment event writer coin does not match the selected coin')
    }
  }

  // Mint: the emitted token ID must match the expected minted token.
  if (!mezo && params.action === 'mint-nft' && params.expectedTokenId !== undefined) {
    const eventTokenId = evArgs.tokenId
    if (eventTokenId === undefined || toNativeBigInt(eventTokenId).toString() !== params.expectedTokenId) {
      throw new Error('Minted token ID does not match the on-chain event')
    }
  }

  // 5. Amount must meet the configured cost for the action.
  const eventAmount = mezo && params.action === 'generate-game' ? evArgs.amount : evArgs.amountPaid
  if (eventAmount !== undefined && toNativeBigInt(eventAmount) < expectedAmount) {
    throw new Error('Payment amount is less than the required cost')
  }

  return {
    txHash: params.transactionHash,
    amount: expectedAmount.toString(),
    functionName: requiredFn,
  }
}

/**
 * Fetch transaction evidence and run full on-chain verification.
 */
export async function verifyOnChainPayment(params: VerifyPaymentParams): Promise<VerifiedPayment> {
  const client = createReceiptClient(params.chainId)
  if (!client) throw new Error(`Unsupported payment chain: ${params.chainId}`)

  const [receipt, transaction] = await Promise.all([
    (client as unknown as {
      getTransactionReceipt: (args: { hash: string }) => Promise<PaymentEvidence>
    }).getTransactionReceipt({ hash: params.transactionHash }),
    (client as unknown as {
      getTransaction: (args: { hash: string }) => Promise<PaymentTransaction>
    }).getTransaction({ hash: params.transactionHash }),
  ])

  return verifyPaymentEvidence({
    ...params,
    receipt,
    transaction,
  })
}

export interface VerifyMusdTreasuryTransferParams {
  transactionHash: `0x${string}`
  userAddress: string
  chainId: number
  /** Destination treasury; defaults to the configured platform treasury. */
  treasury?: string
}

export interface VerifiedMusdTreasuryTransfer {
  txHash: `0x${string}`
  /** MUSD amount in wei paid to the treasury. */
  amount: bigint
  network: 'testnet' | 'mainnet'
}

export interface VerifyMusdTransferEvidenceParams extends VerifyMusdTreasuryTransferParams {
  receipt: PaymentEvidence
  transaction: PaymentTransaction
}

/**
 * Pure, network-free verification of a plain MUSD `transfer(treasury, amount)`
 * used to top up credits:
 *   1. Receipt succeeded; tx sender is the connected wallet.
 *   2. tx.to is the canonical MUSD token for that chain; calldata is a
 *      `transfer` whose recipient is the platform treasury.
 *   3. The MUSD contract emitted a Transfer(user → treasury) event whose
 *      value matches the calldata amount.
 * Throws on any mismatch so the caller can map it to a 4xx rejection.
 */
export function verifyMusdTransferEvidence(
  params: VerifyMusdTransferEvidenceParams
): VerifiedMusdTreasuryTransfer {
  const network = mezoNetworkForChain(params.chainId)
  if (!network) throw new Error(`Unsupported Mezo chain: ${params.chainId}`)

  const treasury = (params.treasury ?? MEZO_TREASURY_ADDRESS).toLowerCase()
  const musdToken = MUSD_CONFIG[network].address.toLowerCase()
  const { receipt, transaction } = params

  if (receipt.status !== 'success') throw new Error('Transaction did not succeed')
  if (transaction.from.toLowerCase() !== params.userAddress.toLowerCase()) {
    throw new Error('Payment sender does not match connected wallet')
  }
  if (transaction.to?.toLowerCase() !== musdToken) {
    throw new Error('Transaction was not sent to the MUSD token contract')
  }

  let callTo: string | undefined
  let callAmount: bigint | undefined
  try {
    const call = decodeFunctionData({ abi: ERC20_TRANSFER_ABI, data: (transaction.input ?? '0x') as `0x${string}` })
    if (call.functionName !== 'transfer') throw new Error('not-transfer')
    callTo = (call.args?.[0] as string)?.toLowerCase()
    callAmount = toNativeBigInt(call.args?.[1])
  } catch {
    throw new Error('Transaction did not call MUSD transfer')
  }
  if (callTo !== treasury) {
    throw new Error('MUSD transfer recipient is not the platform treasury')
  }
  if (!callAmount || callAmount <= 0n) {
    throw new Error('MUSD transfer amount is invalid')
  }

  // Require the matching Transfer(from=user, to=treasury) log emitted by MUSD.
  const topic0 = keccak256(toBytes(ERC20_TRANSFER_SIG))
  const matchedLog = receipt.logs.find(
    (log) =>
      log.address?.toLowerCase() === musdToken &&
      log.topics?.[0]?.toLowerCase() === topic0.toLowerCase() &&
      log.topics?.[1] &&
      ('0x' + log.topics[1].slice(26)).toLowerCase() === params.userAddress.toLowerCase() &&
      log.topics?.[2] &&
      ('0x' + log.topics[2].slice(26)).toLowerCase() === treasury
  )
  if (!matchedLog) {
    throw new Error('Expected MUSD Transfer event to treasury was not found')
  }

  const parsed = decodeEventLog({
    abi: ERC20_TRANSFER_EVENT,
    data: (matchedLog.data ?? '0x') as `0x${string}`,
    topics: matchedLog.topics as [`0x${string}`, ...`0x${string}`[]],
  })
  const evArgs = parsed.args as unknown as Record<string, unknown>
  const eventAmount = toNativeBigInt(evArgs.value)
  if (eventAmount !== callAmount) {
    throw new Error('Transfer event amount does not match transaction input')
  }

  return { txHash: params.transactionHash, amount: eventAmount, network }
}

/**
 * Fetch transaction evidence and verify an MUSD treasury transfer on-chain.
 */
export async function verifyMusdTreasuryTransfer(
  params: VerifyMusdTreasuryTransferParams
): Promise<VerifiedMusdTreasuryTransfer> {
  const client = createReceiptClient(params.chainId)
  if (!client) throw new Error(`Unsupported payment chain: ${params.chainId}`)

  const [receipt, transaction] = await Promise.all([
    (client as unknown as {
      getTransactionReceipt: (args: { hash: string }) => Promise<PaymentEvidence>
    }).getTransactionReceipt({ hash: params.transactionHash }),
    (client as unknown as {
      getTransaction: (args: { hash: string }) => Promise<PaymentTransaction>
    }).getTransaction({ hash: params.transactionHash }),
  ])

  return verifyMusdTransferEvidence({ ...params, receipt, transaction })
}

const ERC20_BALANCE_OF_ABI = parseAbi([
  'function balanceOf(address account) view returns (uint256)',
])

/**
 * On-chain MEZO-holder check (MEZO precompile balance >= holderThreshold).
 * Returns false on any read failure — a missed boost is graceful, a wrong
 * grant is not.
 */
export async function isMezoHolderOnChain(userAddress: string, chainId: number): Promise<boolean> {
  if (mezoNetworkForChain(chainId) === null) return false
  const client = createReceiptClient(chainId)
  if (!client) return false
  try {
    const bal = await (client as unknown as {
      readContract: (args: unknown) => Promise<bigint>
    }).readContract({
      address: MEZO_CONFIG.address,
      abi: ERC20_BALANCE_OF_ABI,
      functionName: 'balanceOf',
      args: [userAddress],
    })
    return bal >= MEZO_CONFIG.holderThreshold
  } catch {
    return false
  }
}

