// E2E: SIWE wallet sign-in with deployer key → POST /api/credits/purchase-musd
// with the real 0.2 MUSD treasury-transfer tx, then replay for idempotency.
import { SiweMessage } from 'siwe'
import { privateKeyToAccount } from 'viem/accounts'
import * as fs from 'fs'

const BASE = process.env.E2E_BASE || 'https://writersarcade.vercel.app'
const TX_HASH = '0x67246c1504cca1ac99d7638c641a52a866f47f9b86aa17f1f220b605f1839ce1'
const env = {}
fs.readFileSync('.env.local','utf8').split('\n').forEach(l => { const m = l.match(/^([^#\s]+)="?(.*?)"?\s*$/); if (m) env[m[1]] = m[2] })
const account = privateKeyToAccount(env.MEZO_DEPLOYER_PRIVATE_KEY)
const host = new URL(BASE).host

function cookieFrom(res) {
  const sc = res.headers.get('set-cookie') || ''
  return sc.split(',').map(c => c.trim().split(';')[0]).filter(Boolean).join('; ')
}

// 1. nonce
const nonceRes = await fetch(`${BASE}/api/auth/nonce`)
const { nonce } = await nonceRes.json()
const nonceCookie = cookieFrom(nonceRes)
console.log('1. nonce:', nonce, '| cookie:', nonceCookie.slice(0, 40) + '…')

// 2. SIWE message + signature
const msg = new SiweMessage({
  domain: host,
  address: account.address,
  statement: 'Sign in to WritersArcade',
  uri: BASE,
  version: '1',
  chainId: 31611,
  nonce,
})
const message = msg.prepareMessage()
const signature = await account.signMessage({ message })
console.log('2. signed SIWE for', account.address)

// 3. verify → wallet_session
const verifyRes = await fetch(`${BASE}/api/auth/verify`, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json', cookie: nonceCookie },
  body: JSON.stringify({ message, signature }),
})
const verifyBody = await verifyRes.json().catch(() => ({}))
const sessionCookie = cookieFrom(verifyRes)
console.log('3. verify:', verifyRes.status, verifyBody.success ? 'OK' : JSON.stringify(verifyBody).slice(0, 200))
if (!verifyBody.success) process.exit(1)

// 4. purchase credits with the real MUSD transfer
const buyRes = await fetch(`${BASE}/api/credits/purchase-musd`, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json', cookie: sessionCookie },
  body: JSON.stringify({ transactionHash: TX_HASH, chainId: 31611 }),
})
const buyBody = await buyRes.json().catch(() => ({}))
console.log('4. purchase:', buyRes.status, JSON.stringify(buyBody))

// 5. replay — must be idempotent, no double grant
const replayRes = await fetch(`${BASE}/api/credits/purchase-musd`, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json', cookie: sessionCookie },
  body: JSON.stringify({ transactionHash: TX_HASH, chainId: 31611 }),
})
const replayBody = await replayRes.json().catch(() => ({}))
console.log('5. replay:', replayRes.status, JSON.stringify(replayBody))

// 6. negative: bogus tx hash must 4xx, not grant
const badRes = await fetch(`${BASE}/api/credits/purchase-musd`, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json', cookie: sessionCookie },
  body: JSON.stringify({ transactionHash: '0x' + 'ab'.repeat(32), chainId: 31611 }),
})
console.log('6. bogus tx:', badRes.status, JSON.stringify(await badRes.json().catch(() => ({}))).slice(0, 160))

// 7. balance check
const creditsRes = await fetch(`${BASE}/api/ramp/credits?wallet=${account.address}`)
console.log('7. credits balance:', JSON.stringify((await creditsRes.json()).data?.credits ?? 'n/a'))
