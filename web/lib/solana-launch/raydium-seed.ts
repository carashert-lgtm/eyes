import {
  CREATE_CPMM_POOL_FEE_ACC,
  CREATE_CPMM_POOL_PROGRAM,
  Raydium,
  TxVersion,
} from '@raydium-io/raydium-sdk-v2'
import { Connection, Keypair, PublicKey, VersionedTransaction } from '@solana/web3.js'
import {
  createBurnInstruction,
  getAssociatedTokenAddressSync,
  TOKEN_PROGRAM_ID,
} from '@solana/spl-token'
import BN from 'bn.js'
import { TransactionMessage } from '@solana/web3.js'
import { isSolanaDevnet } from '@/lib/solana-cluster'
import { createSolanaConnection } from '@/lib/solana-rpc'
import { DEFAULT_LP_TOKEN_AMOUNT_SOL } from '@/lib/solana-launch/constants'

const NATIVE_MINT = new PublicKey('So11111111111111111111111111111111111111112')

export type RaydiumSeedResult = {
  seedTx: string
  poolId: PublicKey
  burnTx: string | null
}

export async function seedRaydiumCpmmPoolAndBurnLp(input: {
  creator: Keypair
  tokenMint: PublicKey
  solAmount: number
  tokenAmount?: bigint
  connection?: Connection
}): Promise<RaydiumSeedResult> {
  if (isSolanaDevnet()) {
    throw new Error('Raydium pools are mainnet-only — use devnet to test token mint, mainnet for LP seed')
  }

  const connection = input.connection ?? createSolanaConnection()
  const tokenAmount = input.tokenAmount ?? DEFAULT_LP_TOKEN_AMOUNT_SOL
  const lamports = Math.floor(input.solAmount * 1e9)
  if (lamports <= 0) throw new Error('LP SOL amount must be greater than zero')

  const raydium = await Raydium.load({
    connection,
    owner: input.creator,
    cluster: 'mainnet',
    disableFeatureCheck: true,
    blockhashCommitment: 'confirmed',
  })

  const feeConfigs = await raydium.api.getCpmmConfigs()
  const feeConfig = feeConfigs.find((c) => c.index === 0)
  if (!feeConfig) throw new Error('Could not load Raydium CPMM fee config')

  const mintAInfo = await raydium.token.getTokenInfo(NATIVE_MINT)
  const mintBInfo = await raydium.token.getTokenInfo(input.tokenMint)

  const { execute, extInfo } = await raydium.cpmm.createPool({
    programId: CREATE_CPMM_POOL_PROGRAM,
    poolFeeAccount: CREATE_CPMM_POOL_FEE_ACC,
    mintA: mintAInfo,
    mintB: mintBInfo,
    mintAAmount: new BN(lamports),
    mintBAmount: new BN(tokenAmount.toString()),
    startTime: new BN(0),
    feeConfig,
    associatedOnly: false,
    ownerInfo: { useSOLBalance: true },
    txVersion: TxVersion.V0,
    computeBudgetConfig: { units: 600_000, microLamports: 100_000 },
  })

  const { txId } = await execute({ sendAndConfirm: true })
  const poolId = extInfo.address.poolId as PublicKey

  let burnTx: string | null = null
  try {
    const lpMint = extInfo.address.lpMint as PublicKey
    const lpAta = getAssociatedTokenAddressSync(lpMint, input.creator.publicKey)
    const balance = await connection.getTokenAccountBalance(lpAta)
    const amount = BigInt(balance.value.amount)
    if (amount > BigInt(0)) {
      const burnIx = createBurnInstruction(lpAta, lpMint, input.creator.publicKey, amount)
      const { blockhash, lastValidBlockHeight } = await connection.getLatestBlockhash('confirmed')
      const msg = new TransactionMessage({
        payerKey: input.creator.publicKey,
        recentBlockhash: blockhash,
        instructions: [burnIx],
      }).compileToV0Message()
      const tx = new VersionedTransaction(msg)
      tx.sign([input.creator])
      burnTx = await connection.sendTransaction(tx)
      await connection.confirmTransaction({ signature: burnTx, blockhash, lastValidBlockHeight }, 'confirmed')
    }
  } catch {
    // LP burn is best-effort; pool is still live
  }

  return { seedTx: txId, poolId, burnTx }
}

/** Burn unsold token inventory after LP seed (mirrors EVM dead-address disposal). */
export async function burnRemainingLaunchTokens(input: {
  creator: Keypair
  tokenMint: PublicKey
  amount: bigint
  connection?: Connection
}): Promise<string | null> {
  if (input.amount <= BigInt(0)) return null
  const connection = input.connection ?? createSolanaConnection()
  const ata = getAssociatedTokenAddressSync(input.tokenMint, input.creator.publicKey)
  const burnIx = createBurnInstruction(ata, input.tokenMint, input.creator.publicKey, input.amount)
  const { blockhash, lastValidBlockHeight } = await connection.getLatestBlockhash('confirmed')
  const msg = new TransactionMessage({
    payerKey: input.creator.publicKey,
    recentBlockhash: blockhash,
    instructions: [burnIx],
  }).compileToV0Message()
  const tx = new VersionedTransaction(msg)
  tx.sign([input.creator])
  const sig = await connection.sendTransaction(tx)
  await connection.confirmTransaction({ signature: sig, blockhash, lastValidBlockHeight }, 'confirmed')
  return sig
}

export { TOKEN_PROGRAM_ID, NATIVE_MINT }
