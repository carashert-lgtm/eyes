/**
 * Owner/admin manual $EYES sends to linked Discord wallets.
 */
import {
  createPublicClient,
  createWalletClient,
  http,
  parseUnits,
} from 'viem'
import { privateKeyToAccount } from 'viem/accounts'
import { base } from 'viem/chains'
import { db, exportSnapshot, logAudit } from './db.js'
import { normalizePrivateKey } from './private-key.js'
import { createNonceManager, writeContractWithNonceRetry } from './tx-send.js'

const erc20TransferAbi = [
  {
    type: 'function',
    name: 'transfer',
    stateMutability: 'nonpayable',
    inputs: [
      { name: 'to', type: 'address' },
      { name: 'amount', type: 'uint256' },
    ],
    outputs: [{ type: 'bool' }],
  },
  {
    type: 'function',
    name: 'balanceOf',
    stateMutability: 'view',
    inputs: [{ name: 'account', type: 'address' }],
    outputs: [{ type: 'uint256' }],
  },
]

function getChainConfig() {
  const chainId = Number(process.env.PRESALE_CHAIN_ID ?? '8453')
  const rpc = process.env.BASE_MAINNET_RPC_URL ?? 'https://mainnet.base.org'
  return { chainId, chain: base, rpc }
}

function getSenderKey() {
  const raw =
    process.env.DISCORD_TREASURY_PRIVATE_KEY ??
    process.env.PRESALE_DISTRIBUTOR_PRIVATE_KEY ??
    ''
  return normalizePrivateKey(raw, 'DISCORD_TREASURY_PRIVATE_KEY')
}

function getTokenAddress(tokenOverride) {
  return (
    tokenOverride ??
    process.env.EYES_TOKEN_ADDRESS ??
    process.env.NEXT_PUBLIC_EYES_TOKEN_ADDRESS ??
    ''
  )
}

export function getSendConfirmThreshold() {
  return Number(process.env.DISCORD_SEND_CONFIRM_THRESHOLD ?? '100000')
}

export function queueDiscordSend({
  discordId,
  walletAddress,
  tokenAddress,
  amount,
  actorId,
  note,
}) {
  const now = new Date().toISOString()
  const threshold = getSendConfirmThreshold()
  const status = amount >= threshold ? 'awaiting_confirm' : 'queued'
  const result = db
    .prepare(
      `INSERT INTO discord_token_sends
       (discord_id, wallet_address, token_address, amount, status, actor_id, note, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    )
    .run(discordId, walletAddress, tokenAddress, amount, status, actorId, note ?? null, now, now)
  exportSnapshot()
  return { id: result.lastInsertRowid, status }
}

export function listPendingDiscordSends(limit = 20) {
  return db
    .prepare(
      `SELECT * FROM discord_token_sends
       WHERE status IN ('queued', 'awaiting_confirm', 'sending')
       ORDER BY created_at ASC LIMIT ?`,
    )
    .all(limit)
    .map(mapSendRow)
}

export function getDiscordSend(id) {
  const row = db.prepare('SELECT * FROM discord_token_sends WHERE id = ?').get(id)
  return mapSendRow(row)
}

function mapSendRow(row) {
  if (!row) return null
  return {
    id: row.id,
    discordId: row.discord_id,
    walletAddress: row.wallet_address,
    tokenAddress: row.token_address,
    amount: row.amount,
    status: row.status,
    actorId: row.actor_id,
    note: row.note,
    txHash: row.tx_hash,
    error: row.error,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  }
}

export async function executeDiscordSend(id, { dryRun = false, force = false } = {}) {
  const row = db.prepare('SELECT * FROM discord_token_sends WHERE id = ?').get(id)
  if (!row) throw new Error('Send not found')
  if (row.status === 'sent') return { dryRun, alreadySent: true, send: mapSendRow(row) }
  if (row.status === 'awaiting_confirm' && !force) {
    throw new Error(`Send #${id} needs confirmation: !sendeyes confirm ${id}`)
  }
  if (!['queued', 'awaiting_confirm'].includes(row.status)) {
    throw new Error(`Send #${id} status is ${row.status}`)
  }

  const token = getTokenAddress(row.token_address)
  if (!token) throw new Error('Token address not configured')

  const { chain, rpc } = getChainConfig()
  const pk = getSenderKey()
  const account = privateKeyToAccount(pk)
  const amountWei = parseUnits(String(row.amount), 18)

  if (dryRun || process.env.DISCORD_SEND_DRY_RUN === 'true') {
    return {
      dryRun: true,
      send: mapSendRow(row),
      from: account.address,
      to: row.wallet_address,
      amount: row.amount,
      token,
    }
  }

  const publicClient = createPublicClient({ chain, transport: http(rpc) })
  const walletClient = createWalletClient({ account, chain, transport: http(rpc) })

  const now = new Date().toISOString()
  db.prepare(`UPDATE discord_token_sends SET status = 'sending', updated_at = ? WHERE id = ?`).run(
    now,
    id,
  )

  try {
    const nonceManager = createNonceManager(publicClient, account.address)
    const hash = await writeContractWithNonceRetry({
      publicClient,
      walletClient,
      account,
      chain,
      nonceManager,
      address: token,
      abi: erc20TransferAbi,
      functionName: 'transfer',
      args: [row.wallet_address, amountWei],
    })
    await publicClient.waitForTransactionReceipt({ hash })
    db.prepare(
      `UPDATE discord_token_sends SET status = 'sent', tx_hash = ?, updated_at = ? WHERE id = ?`,
    ).run(hash, new Date().toISOString(), id)
    logAudit('discord_send', row.actor_id, row.discord_id, row.amount, hash)
    exportSnapshot()
    return { dryRun: false, txHash: hash, send: getDiscordSend(id) }
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    db.prepare(
      `UPDATE discord_token_sends SET status = 'failed', error = ?, updated_at = ? WHERE id = ?`,
    ).run(msg.slice(0, 500), new Date().toISOString(), id)
    exportSnapshot()
    throw err
  }
}

export async function getDiscordSenderStatus() {
  const token = getTokenAddress()
  const pk = getSenderKey()
  const account = privateKeyToAccount(pk)
  const { chain, rpc } = getChainConfig()
  const publicClient = createPublicClient({ chain, transport: http(rpc) })
  let balanceEyes = null
  if (token) {
    try {
      const raw = await publicClient.readContract({
        address: token,
        abi: erc20TransferAbi,
        functionName: 'balanceOf',
        args: [account.address],
      })
      balanceEyes = Number(raw) / 1e18
    } catch {
      balanceEyes = null
    }
  }
  return {
    senderAddress: account.address,
    tokenAddress: token,
    balanceEyes,
    dryRun: process.env.DISCORD_SEND_DRY_RUN === 'true',
    confirmThreshold: getSendConfirmThreshold(),
    pending: listPendingDiscordSends(50).length,
  }
}
