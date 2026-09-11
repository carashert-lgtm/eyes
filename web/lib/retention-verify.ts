import {
  createPublicClient,
  decodeEventLog,
  defineChain,
  formatUnits,
  getAddress,
  http,
  type Hash,
  type TransactionReceipt,
} from 'viem'
import { base, baseSepolia } from 'viem/chains'
import { ANVIL_RPC_URL, APP_ENV, IS_LOCAL_ANVIL } from '@/lib/chain-config'
import { getAcceptedTreasuryAddresses, getSettlementTreasuryAddress } from '@/lib/settlement-treasury'
import { EYES_TOKEN_ABI, EYES_BURN_ADDRESS } from '@/lib/contracts/eyes-token'
import { BASE_MAINNET_EYES_TOKEN, getEyesTokenAddress } from '@/lib/eyes-token-config'
import { minLaunchFeeTreasuryAmount } from '@/lib/retention-config'
import { getPublicRpcUrls } from '@/lib/viem-chain'

export type VerifiedEyesTransfer = {
  txHash: Hash
  from: `0x${string}`
  to: `0x${string}`
  amount: bigint
  amountFormatted: number
  blockTimestamp: Date
}

function chainClient(rpc: string) {
  if (IS_LOCAL_ANVIL) {
    const anvil = defineChain({
      id: 31_337,
      name: 'Anvil Local',
      nativeCurrency: { name: 'Ether', symbol: 'ETH', decimals: 18 },
      rpcUrls: { default: { http: [ANVIL_RPC_URL] } },
    })
    return createPublicClient({ chain: anvil, transport: http(rpc) })
  }
  if (APP_ENV === 'production') {
    return createPublicClient({ chain: base, transport: http(rpc) })
  }
  return createPublicClient({ chain: baseSepolia, transport: http(rpc) })
}

async function getReceiptWithFallback(hash: Hash): Promise<TransactionReceipt> {
  let lastError: unknown
  for (const rpc of getPublicRpcUrls()) {
    try {
      const client = chainClient(rpc)
      return await client.getTransactionReceipt({ hash })
    } catch (e) {
      lastError = e
    }
  }
  throw lastError instanceof Error ? lastError : new Error('Could not load transaction receipt')
}

function eyesTokenAddress(): `0x${string}` {
  const addr = getEyesTokenAddress()
  if (!addr) throw new Error('$EYES token address is not configured')
  return getAddress(addr)
}

function settlementTreasury(): `0x${string}` {
  const addr = getSettlementTreasuryAddress()
  if (!addr) throw new Error('Settlement treasury is not configured')
  return addr
}

async function findEyesTransferInReceipt(
  hash: Hash,
  receipt: TransactionReceipt,
  expectedFrom: string,
  expectedToAddresses: `0x${string}`[],
  minAmount: number,
  leg: 'burn' | 'treasury',
): Promise<VerifiedEyesTransfer> {
  const token = eyesTokenAddress()
  const from = getAddress(expectedFrom)
  const allowedTo = new Set(expectedToAddresses.map((a) => a.toLowerCase()))

  let matched: VerifiedEyesTransfer | null = null
  for (const log of receipt.logs) {
    if (log.address.toLowerCase() !== token.toLowerCase()) continue
    try {
      const decoded = decodeEventLog({
        abi: EYES_TOKEN_ABI,
        data: log.data,
        topics: log.topics,
        strict: false,
      })
      if (decoded.eventName !== 'Transfer') continue
      const args = decoded.args as { from: `0x${string}`; to: `0x${string}`; value: bigint }
      if (args.from.toLowerCase() !== from.toLowerCase()) continue
      if (!allowedTo.has(args.to.toLowerCase())) continue
      const rpc = getPublicRpcUrls()[0]
      const client = chainClient(rpc)
      const block = await client.getBlock({ blockNumber: receipt.blockNumber })
      matched = {
        txHash: hash,
        from: args.from,
        to: args.to,
        amount: args.value,
        amountFormatted: Number(formatUnits(args.value, 18)),
        blockTimestamp: new Date(Number(block.timestamp) * 1000),
      }
      break
    } catch {
      continue
    }
  }

  if (!matched) {
    const label = leg === 'burn' ? 'burn (dead address)' : 'treasury'
    const sawBurn =
      leg === 'treasury' &&
      receipt.logs.some((log) => {
        if (log.address.toLowerCase() !== token.toLowerCase()) return false
        try {
          const decoded = decodeEventLog({
            abi: EYES_TOKEN_ABI,
            data: log.data,
            topics: log.topics,
            strict: false,
          })
          if (decoded.eventName !== 'Transfer') return false
          const args = decoded.args as { from: `0x${string}`; to: `0x${string}`; value: bigint }
          return (
            args.from.toLowerCase() === from.toLowerCase() &&
            args.to.toLowerCase() === EYES_BURN_ADDRESS.toLowerCase()
          )
        } catch {
          return false
        }
      })
    if (sawBurn) {
      throw new Error(
        'Treasury hash looks like your burn transaction — confirm both $EYES transfers completed (burn, then treasury).',
      )
    }
    throw new Error(
      `No matching $EYES ${label} transfer in transaction — expected ${minAmount.toLocaleString()} $EYES from your wallet via token ${token}`,
    )
  }
  if (matched.amountFormatted + 0.000001 < minAmount) {
    throw new Error(
      `${leg === 'burn' ? 'Burn' : 'Treasury'} transfer amount below required minimum (${matched.amountFormatted} < ${minAmount})`,
    )
  }
  return matched
}

export async function verifyEyesTransfer(
  txHash: string,
  expectedFrom: string,
  expectedTo: string,
  minAmount: number,
  leg: 'burn' | 'treasury' = 'burn',
): Promise<VerifiedEyesTransfer> {
  const hash = txHash as Hash
  const receipt = await getReceiptWithFallback(hash)
  if (receipt.status !== 'success') {
    throw new Error('Transaction did not succeed')
  }
  return findEyesTransferInReceipt(
    hash,
    receipt,
    expectedFrom,
    [getAddress(expectedTo)],
    minAmount,
    leg,
  )
}

export async function verifyEyesTransferToAny(
  txHash: string,
  expectedFrom: string,
  expectedToAddresses: `0x${string}`[],
  minAmount: number,
  leg: 'burn' | 'treasury' = 'treasury',
): Promise<VerifiedEyesTransfer> {
  const hash = txHash as Hash
  const receipt = await getReceiptWithFallback(hash)
  if (receipt.status !== 'success') {
    throw new Error('Transaction did not succeed')
  }
  return findEyesTransferInReceipt(hash, receipt, expectedFrom, expectedToAddresses, minAmount, leg)
}

export async function findTreasuryTxAfterBurn(
  burnTxHash: string,
  wallet: string,
  treasuryAmount: number,
): Promise<Hash | null> {
  if (treasuryAmount <= 0) return null
  const burnHash = burnTxHash as Hash
  const burnReceipt = await getReceiptWithFallback(burnHash)
  if (burnReceipt.status !== 'success') return null

  const token = eyesTokenAddress()
  const from = getAddress(wallet)
  const allowedTo = new Set(getAcceptedTreasuryAddresses().map((a) => a.toLowerCase()))
  const searchFloor = Math.min(treasuryAmount, minLaunchFeeTreasuryAmount())
  const minWei = BigInt(Math.floor(searchFloor)) * BigInt(10) ** BigInt(18)
  const fromBlock = burnReceipt.blockNumber
  const toBlock = fromBlock + BigInt(50)
  const transferEvent = {
    type: 'event' as const,
    name: 'Transfer',
    inputs: [
      { name: 'from', type: 'address', indexed: true },
      { name: 'to', type: 'address', indexed: true },
      { name: 'value', type: 'uint256', indexed: false },
    ],
  }

  for (const rpc of getPublicRpcUrls()) {
    const client = chainClient(rpc)
    const chunk = BigInt(8)
    for (let start = fromBlock; start <= toBlock; start += chunk) {
      const end = start + chunk - BigInt(1) > toBlock ? toBlock : start + chunk - BigInt(1)
      try {
        const logs = await client.getLogs({
          address: token,
          event: transferEvent,
          args: { from },
          fromBlock: start,
          toBlock: end,
        })
        for (const log of logs) {
          const args = log.args as { to?: string; value?: bigint }
          if (!args.to || args.value === undefined) continue
          const to = getAddress(args.to)
          if (!allowedTo.has(to.toLowerCase())) continue
          if (args.value < minWei) continue
          if (log.transactionHash.toLowerCase() === burnHash.toLowerCase()) continue
          return log.transactionHash
        }
      } catch {
        continue
      }
    }
  }

  for (const rpc of getPublicRpcUrls()) {
    try {
      const client = chainClient(rpc)
      const scanEnd = fromBlock + BigInt(25) > toBlock ? toBlock : fromBlock + BigInt(25)
      for (let blockNum = fromBlock; blockNum <= scanEnd; blockNum++) {
        const block = await client.getBlock({ blockNumber: blockNum, includeTransactions: true })
        for (const tx of block.transactions) {
          if (typeof tx === 'string') continue
          if (tx.from.toLowerCase() !== from.toLowerCase()) continue
          if (tx.to?.toLowerCase() !== token.toLowerCase()) continue
          if (tx.hash.toLowerCase() === burnHash.toLowerCase()) continue
          const receipt = await client.getTransactionReceipt({ hash: tx.hash })
          if (receipt.status !== 'success') continue
          try {
            const verified = await findEyesTransferInReceipt(
              tx.hash,
              receipt,
              from,
              getAcceptedTreasuryAddresses(),
              treasuryAmount,
              'treasury',
            )
            if (verified) return tx.hash
          } catch {
            continue
          }
        }
      }
    } catch {
      continue
    }
  }

  return null
}

function walletFromBurnReceipt(receipt: TransactionReceipt): `0x${string}` | null {
  const token = eyesTokenAddress()
  for (const log of receipt.logs) {
    if (log.address.toLowerCase() !== token.toLowerCase()) continue
    try {
      const decoded = decodeEventLog({
        abi: EYES_TOKEN_ABI,
        data: log.data,
        topics: log.topics,
        strict: false,
      })
      if (decoded.eventName !== 'Transfer') continue
      const args = decoded.args as { from: `0x${string}`; to: `0x${string}`; value: bigint }
      if (args.to.toLowerCase() !== EYES_BURN_ADDRESS.toLowerCase()) continue
      return getAddress(args.from)
    } catch {
      continue
    }
  }
  return null
}

async function verifyTreasuryLeg(
  burnTxHash: string,
  treasuryTxHash: string | undefined,
  wallet: string,
  treasuryAmount: number,
): Promise<VerifiedEyesTransfer> {
  const candidates: string[] = []
  const discovered = await findTreasuryTxAfterBurn(burnTxHash, wallet, treasuryAmount)
  if (discovered) candidates.push(discovered)

  const normalized = treasuryTxHash?.trim()
  if (normalized) candidates.push(normalized)

  const tried = new Set<string>()
  let lastError: Error | null = null
  const allowed = getAcceptedTreasuryAddresses()

  for (const hash of candidates) {
    const key = hash.toLowerCase()
    if (tried.has(key) || key === burnTxHash.toLowerCase()) continue
    tried.add(key)
    try {
      return await verifyEyesTransferToAny(hash, wallet, allowed, treasuryAmount, 'treasury')
    } catch (e) {
      lastError = e instanceof Error ? e : new Error(String(e))
    }
  }

  throw (
    lastError ??
    new Error(
      'Treasury transfer not found — confirm the second $EYES transfer (treasury leg) completed after the burn.',
    )
  )
}

export async function resolveTreasuryTxHash(
  burnTxHash: string,
  treasuryTxHash: string | undefined,
  wallet: string,
  treasuryAmount: number,
): Promise<string | undefined> {
  if (treasuryAmount <= 0) return undefined
  const normalized = treasuryTxHash?.trim()
  if (
    normalized &&
    normalized.toLowerCase() !== burnTxHash.toLowerCase()
  ) {
    return normalized
  }
  const found = await findTreasuryTxAfterBurn(burnTxHash, wallet, treasuryAmount)
  return found ?? normalized
}

export async function verifyBoostSettlement(
  burnTxHash: string,
  treasuryTxHash: string | undefined,
  wallet: string,
  burnAmount: number,
  treasuryAmount: number,
): Promise<{ burn: VerifiedEyesTransfer; treasury: VerifiedEyesTransfer | null }> {
  let signer = getAddress(wallet)
  const burnHash = burnTxHash as Hash
  let burn: VerifiedEyesTransfer
  try {
    burn = await verifyEyesTransfer(burnTxHash, signer, EYES_BURN_ADDRESS, burnAmount, 'burn')
  } catch (firstError) {
    const receipt = await getReceiptWithFallback(burnHash)
    const onChainSigner = walletFromBurnReceipt(receipt)
    if (onChainSigner && onChainSigner.toLowerCase() !== signer.toLowerCase()) {
      signer = onChainSigner
      burn = await verifyEyesTransfer(burnTxHash, signer, EYES_BURN_ADDRESS, burnAmount, 'burn')
    } else {
      throw firstError
    }
  }

  if (treasuryAmount <= 0) return { burn, treasury: null }
  const treasury = await verifyTreasuryLeg(burnTxHash, treasuryTxHash, signer, treasuryAmount)
  return { burn, treasury }
}

export async function verifyLaunchFeeSettlement(
  burnTxHash: string,
  treasuryTxHash: string | undefined,
  wallet: string,
  burnAmount: number,
  treasuryAmount: number,
) {
  return verifyBoostSettlement(burnTxHash, treasuryTxHash, wallet, burnAmount, treasuryAmount)
}

export function settlementTreasuryAddress(): string {
  return settlementTreasury()
}

export { EYES_BURN_ADDRESS, BASE_MAINNET_EYES_TOKEN }
