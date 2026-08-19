/**
 * Send $EYES from treasury for pending presale purchases and team token claims.
 */
import {
  createPublicClient,
  createWalletClient,
  defineChain,
  formatEther,
  formatUnits,
  http,
  parseUnits,
} from 'viem'
import { privateKeyToAccount } from 'viem/accounts'
import { base } from 'viem/chains'
import { GAS_FUND_HINT, getTreasuryAddress } from './bot-format.js'
import {
  claimPresaleForSend,
  claimTeamClaimForSend,
  listPendingDistributions,
  markPresaleFailed,
  markPresaleSent,
  markTeamClaimFailed,
  markTeamClaimSent,
  releasePresaleSendClaim,
  releaseTeamClaimSendClaim,
} from './db.js'
import { normalizePrivateKey, inspectPrivateKeyEnv } from './private-key.js'

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

const anvilLocal = defineChain({
  id: 31_337,
  name: 'Anvil Local',
  nativeCurrency: { name: 'Ether', symbol: 'ETH', decimals: 18 },
  rpcUrls: {
    default: { http: ['http://127.0.0.1:8545'] },
  },
})

function getChainConfig() {
  const chainId = Number(process.env.PRESALE_CHAIN_ID ?? process.env.NEXT_PUBLIC_CHAIN_ID ?? '8453')
  if (chainId === 31337) {
    const rpc = process.env.NEXT_PUBLIC_ANVIL_RPC_URL ?? 'http://127.0.0.1:8545'
    return {
      chain: { ...anvilLocal, rpcUrls: { default: { http: [rpc] } } },
      rpc,
    }
  }
  return {
    chain: base,
    rpc: process.env.BASE_MAINNET_RPC_URL ?? 'https://mainnet.base.org',
  }
}

function getTokenAddress() {
  const addr =
    process.env.EYES_TOKEN_ADDRESS ??
    process.env.NEXT_PUBLIC_EYES_TOKEN_ADDRESS ??
    ''
  if (!addr) throw new Error('EYES_TOKEN_ADDRESS not set')
  return addr
}

function getDistributorKey() {
  const raw =
    process.env.PRESALE_DISTRIBUTOR_PRIVATE_KEY ??
    process.env.DEPLOYER_PRIVATE_KEY ??
    ''
  return normalizePrivateKey(raw, 'PRESALE_DISTRIBUTOR_PRIVATE_KEY')
}

function formatItemLabel(item) {
  return item.type === 'team' ? `team #${item.id}` : `presale #${item.id}`
}

function isInsufficientGasError(message) {
  return /gas required exceeds allowance|insufficient funds for gas|insufficient funds/i.test(message)
}

function formatSendError(err) {
  const msg = err instanceof Error ? err.message : String(err)
  if (isInsufficientGasError(msg)) return GAS_FUND_HINT
  return msg.slice(0, 160)
}

async function sendPendingItem(item, ctx) {
  const { dryRun, publicClient, walletClient, tokenAddress, balanceLeftRef } = ctx
  const amountWei = parseUnits(String(item.tokensOwed), 18)
  const label = formatItemLabel(item)

  if (amountWei <= 0n) {
    return { ok: false, skipped: { id: item.id, type: item.type, reason: 'zero amount' } }
  }
  if (balanceLeftRef.value < amountWei) {
    return {
      ok: false,
      skipped: {
        id: item.id,
        type: item.type,
        reason: `insufficient treasury balance (need ${formatUnits(amountWei, 18)} have ${formatUnits(balanceLeftRef.value, 18)})`,
      },
      stop: true,
    }
  }

  if (dryRun) {
    return {
      ok: true,
      sent: {
        id: item.id,
        type: item.type,
        receiveAddress: item.receiveAddress,
        tokens: item.tokensOwed,
        dryRun: true,
      },
    }
  }

  const claimed =
    item.type === 'team'
      ? claimTeamClaimForSend(item.id)
      : claimPresaleForSend(item.id)
  if (!claimed) {
    return {
      ok: false,
      skipped: { id: item.id, type: item.type, reason: 'already sent or in progress' },
    }
  }

  const receiveAddress =
    item.type === 'team' ? claimed.receiveAddress : claimed.receiveAddress
  const tokens =
    item.type === 'team' ? claimed.tokensAmount : claimed.tokensOwed

  try {
    const hash = await walletClient.writeContract({
      address: tokenAddress,
      abi: erc20TransferAbi,
      functionName: 'transfer',
      args: [receiveAddress, amountWei],
    })
    const receipt = await publicClient.waitForTransactionReceipt({ hash })
    if (receipt.status !== 'success') {
      if (item.type === 'team') {
        releaseTeamClaimSendClaim(item.id)
        markTeamClaimFailed(item.id, `tx reverted: ${hash}`)
      } else {
        releasePresaleSendClaim(item.id)
        markPresaleFailed(item.id, `tx reverted: ${hash}`)
      }
      return {
        ok: false,
        skipped: { id: item.id, type: item.type, reason: 'transfer reverted' },
      }
    }

    const marked =
      item.type === 'team'
        ? markTeamClaimSent(item.id, {
            distributionTxHash: hash,
            tokensSent: tokens,
          })
        : markPresaleSent(item.id, {
            distributionTxHash: hash,
            tokensSent: tokens,
          })

    if (!marked.updated) {
      return {
        ok: false,
        skipped: {
          id: item.id,
          type: item.type,
          reason: 'on-chain send ok but ledger already marked sent — no double credit',
          txHash: hash,
        },
      }
    }

    balanceLeftRef.value -= amountWei
    return {
      ok: true,
      sent: {
        id: item.id,
        type: item.type,
        receiveAddress,
        tokens,
        txHash: hash,
        label,
      },
    }
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    const friendly = formatSendError(err)
    if (item.type === 'team') {
      releaseTeamClaimSendClaim(item.id)
      if (!isInsufficientGasError(msg)) {
        markTeamClaimFailed(item.id, msg.slice(0, 200))
      }
    } else {
      releasePresaleSendClaim(item.id)
      if (!isInsufficientGasError(msg)) {
        markPresaleFailed(item.id, msg.slice(0, 200))
      }
    }
    return {
      ok: false,
      skipped: { id: item.id, type: item.type, reason: friendly },
      stop: isInsufficientGasError(msg),
    }
  }
}

function tryGetDistributorAccount() {
  try {
    return privateKeyToAccount(getDistributorKey())
  } catch (err) {
    return { error: err instanceof Error ? err.message : String(err) }
  }
}

export async function getDistributorStatus() {
  const treasury = getTreasuryAddress()
  const tokenAddress = process.env.EYES_TOKEN_ADDRESS ?? process.env.NEXT_PUBLIC_EYES_TOKEN_ADDRESS ?? ''
  const chainId = Number(process.env.PRESALE_CHAIN_ID ?? process.env.NEXT_PUBLIC_CHAIN_ID ?? '8453')
  const accountOrError = tryGetDistributorAccount()
  const issues = []

  if (accountOrError.error) {
    const keyCheck = inspectPrivateKeyEnv(
      process.env.PRESALE_DISTRIBUTOR_PRIVATE_KEY ?? '',
      'PRESALE_DISTRIBUTOR_PRIVATE_KEY',
    )
    issues.push(accountOrError.error)
    if (keyCheck.set) {
      issues.push(`Key env raw length: ${keyCheck.rawLength} chars (need 64, or 66 with 0x)`)
    }
    return {
      ready: false,
      treasury,
      tokenAddress,
      chainId,
      distributorAddress: null,
      matchesTreasury: false,
      balanceEyes: null,
      keyMeta: { set: keyCheck.set, rawLength: keyCheck.rawLength, valid: keyCheck.valid },
      issues,
    }
  }

  const account = accountOrError
  const matchesTreasury = account.address.toLowerCase() === treasury
  if (!matchesTreasury) {
    issues.push('Distributor private key does not match treasury wallet.')
  }
  if (!tokenAddress) {
    issues.push('EYES_TOKEN_ADDRESS not set')
  }

  let balanceEyes = null
  let balanceEth = null
  if (tokenAddress && !accountOrError.error) {
    try {
      const { chain, rpc } = getChainConfig()
      const publicClient = createPublicClient({ chain, transport: http(rpc) })
      const [tokenBal, ethBal] = await Promise.all([
        publicClient.readContract({
          address: tokenAddress,
          abi: erc20TransferAbi,
          functionName: 'balanceOf',
          args: [account.address],
        }),
        publicClient.getBalance({ address: account.address }),
      ])
      balanceEyes = formatUnits(tokenBal, 18)
      balanceEth = formatEther(ethBal)
      if (tokenBal === 0n) {
        issues.push('Distributor wallet holds 0 $EYES on-chain')
      }
      if (ethBal === 0n) {
        issues.push(GAS_FUND_HINT)
      }
    } catch (err) {
      issues.push(`On-chain balance check failed: ${err instanceof Error ? err.message : String(err)}`)
    }
  }

  return {
    ready: issues.length === 0,
    treasury,
    tokenAddress,
    chainId,
    distributorAddress: account.address,
    matchesTreasury,
    balanceEyes,
    balanceEth,
    issues,
  }
}

export async function distributePresaleTokens(options = {}) {
  const dryRun = options.dryRun ?? process.env.PRESALE_DISTRIBUTE_DRY_RUN === 'true'
  const limit = options.limit ?? Number(process.env.PRESALE_DISTRIBUTE_BATCH ?? '5')
  const pending = listPendingDistributions(limit)

  if (!pending.length) {
    return {
      ok: true,
      dryRun,
      sent: [],
      skipped: [],
      message: 'No pending presale purchases or team claims',
    }
  }

  const { chain, rpc } = getChainConfig()
  const tokenAddress = getTokenAddress()
  const account = privateKeyToAccount(getDistributorKey())

  const publicClient = createPublicClient({ chain, transport: http(rpc) })
  const walletClient = createWalletClient({
    account,
    chain,
    transport: http(rpc),
  })

  const treasuryBalance = await publicClient.readContract({
    address: tokenAddress,
    abi: erc20TransferAbi,
    functionName: 'balanceOf',
    args: [account.address],
  })

  const ethBalance = await publicClient.getBalance({ address: account.address })
  if (ethBalance === 0n && !dryRun) {
    return {
      ok: false,
      dryRun,
      treasury: account.address,
      tokenAddress,
      sent: [],
      skipped: [
        {
          id: 0,
          type: 'gas',
          reason: `${GAS_FUND_HINT} Then retry \`!presalesend run\`.`,
        },
      ],
      message: 'Blocked — treasury needs ETH for gas',
    }
  }

  const sent = []
  const skipped = []
  const balanceLeftRef = { value: treasuryBalance }

  for (const item of pending) {
    const result = await sendPendingItem(item, {
      dryRun,
      publicClient,
      walletClient,
      tokenAddress,
      balanceLeftRef,
    })
    if (result.sent) sent.push(result.sent)
    if (result.skipped) {
      skipped.push(result.skipped)
      if (result.stop) break
    }
  }

  const presaleCount = sent.filter((s) => s.type === 'presale').length
  const teamCount = sent.filter((s) => s.type === 'team').length

  return {
    ok: true,
    dryRun,
    treasury: account.address,
    tokenAddress,
    sent,
    skipped,
    message: dryRun
      ? `Dry run — would send ${sent.length} item(s) (${presaleCount} presale, ${teamCount} team)`
      : `Sent ${sent.length} item(s) (${presaleCount} presale, ${teamCount} team)`,
  }
}
