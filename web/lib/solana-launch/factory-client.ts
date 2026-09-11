import { AnchorProvider, Program, type Idl } from '@coral-xyz/anchor'
import {
  ComputeBudgetProgram,
  Connection,
  Keypair,
  PublicKey,
  SystemProgram,
  SYSVAR_RENT_PUBKEY,
  Transaction,
  VersionedTransaction,
} from '@solana/web3.js'
import {
  ASSOCIATED_TOKEN_PROGRAM_ID,
  getAssociatedTokenAddressSync,
  TOKEN_PROGRAM_ID,
} from '@solana/spl-token'
import idl from '@/lib/idl/eyes_launch_factory.json'
import { createSolanaConnection } from '@/lib/solana-rpc'
import {
  isSolanaBlockhashExpiredError,
  solanaSignatureSucceeded,
  waitForSolanaSignature,
} from '@/lib/solana-launch/confirm'

export function getSolanaLaunchProgramId(): PublicKey {
  const raw = process.env.NEXT_PUBLIC_SOLANA_LAUNCH_PROGRAM_ID?.trim()
  if (!raw) throw new Error('Solana launch program is not configured')
  return new PublicKey(raw)
}

export function deriveFactoryPda(programId: PublicKey): [PublicKey, number] {
  return PublicKey.findProgramAddressSync([Buffer.from('factory')], programId)
}

export function deriveLaunchPda(
  programId: PublicKey,
  factory: PublicKey,
  launchId: bigint,
): [PublicKey, number] {
  const idBuf = Buffer.alloc(8)
  idBuf.writeBigUInt64LE(launchId)
  return PublicKey.findProgramAddressSync(
    [Buffer.from('launch'), factory.toBuffer(), idBuf],
    programId,
  )
}

function programFor(signer: Keypair, connection?: Connection): Program {
  const conn = connection ?? createSolanaConnection()
  const provider = new AnchorProvider(
    conn,
    {
      publicKey: signer.publicKey,
      signAllTransactions: async (txs) => {
        txs.forEach((tx) => {
          if (tx instanceof VersionedTransaction) {
            tx.sign([signer])
          } else {
            tx.sign(signer)
          }
        })
        return txs
      },
      signTransaction: async (tx) => {
        if (tx instanceof VersionedTransaction) {
          tx.sign([signer])
        } else {
          tx.sign(signer)
        }
        return tx
      },
    },
    { commitment: 'confirmed' },
  )
  const programId = getSolanaLaunchProgramId()
  return new Program({ ...idl, address: programId.toBase58() } as Idl, provider)
}

export type FactoryState = {
  authority: PublicKey
  launchCount: bigint
  launchesEnabled: boolean
}

export async function fetchFactoryState(connection?: Connection): Promise<FactoryState | null> {
  const programId = getSolanaLaunchProgramId()
  const [factory] = deriveFactoryPda(programId)
  const conn = connection ?? createSolanaConnection()
  const info = await conn.getAccountInfo(factory)
  if (!info?.data) return null
  // Anchor account: 8-byte disc + Factory fields
  const data = info.data
  if (data.length < 8 + 32 + 8 + 1 + 1) return null
  let offset = 8
  const authority = new PublicKey(data.subarray(offset, offset + 32))
  offset += 32
  const launchCount = data.readBigUInt64LE(offset)
  offset += 8
  const launchesEnabled = data[offset] === 1
  return { authority, launchCount, launchesEnabled }
}

export type CreateLaunchResult = {
  launchId: bigint
  mint: PublicKey
  deployTx: string
}

export async function buildCreateLaunchTransaction(
  creator: Keypair,
  input: { name: string; symbol: string; windowSeconds: number },
): Promise<{ transaction: Transaction; mint: Keypair; launchId: bigint; mintAddress: PublicKey }> {
  const program = programFor(creator)
  const programId = getSolanaLaunchProgramId()
  const [factory] = deriveFactoryPda(programId)

  const factoryState = await fetchFactoryState(program.provider.connection)
  if (!factoryState) {
    throw new Error('Launch factory is not initialized on Solana — contact support')
  }
  if (!factoryState.launchesEnabled) {
    throw new Error('Solana launches are temporarily disabled')
  }

  const launchId = factoryState.launchCount + BigInt(1)
  const [launch] = deriveLaunchPda(programId, factory, launchId)
  const mint = Keypair.generate()
  const creatorAta = getAssociatedTokenAddressSync(mint.publicKey, creator.publicKey)

  const tx = await program.methods
    .createLaunch(input.name, input.symbol, input.windowSeconds)
    .accounts({
      factory,
      launch,
      mint: mint.publicKey,
      creatorTokenAccount: creatorAta,
      creator: creator.publicKey,
      tokenProgram: TOKEN_PROGRAM_ID,
      associatedTokenProgram: ASSOCIATED_TOKEN_PROGRAM_ID,
      systemProgram: SystemProgram.programId,
      rent: SYSVAR_RENT_PUBKEY,
    })
    .signers([creator, mint])
    .preInstructions([
      ComputeBudgetProgram.setComputeUnitLimit({ units: 400_000 }),
      ComputeBudgetProgram.setComputeUnitPrice({ microLamports: 50_000 }),
    ])
    .transaction()

  return { transaction: tx, mint, launchId, mintAddress: mint.publicKey }
}

export async function buildFinalizeLiquidityTransaction(
  creator: Keypair,
  launchId: bigint,
  pair: PublicKey,
): Promise<Transaction> {
  const program = programFor(creator)
  const programId = getSolanaLaunchProgramId()
  const [factory] = deriveFactoryPda(programId)
  const [launch] = deriveLaunchPda(programId, factory, launchId)

  return program.methods
    .finalizeLiquidity(pair)
    .accounts({
      launch,
      factory,
      creator: creator.publicKey,
    })
    .transaction()
}

function clearTransactionSignatures(transaction: Transaction) {
  for (const entry of transaction.signatures) {
    entry.signature = null
  }
}

export async function sendSignedTransaction(
  connection: Connection,
  transaction: Transaction,
  signers: Keypair[],
): Promise<string> {
  let lastError: unknown
  let lastSignature: string | null = null

  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      const { blockhash } = await connection.getLatestBlockhash('confirmed')
      transaction.recentBlockhash = blockhash
      transaction.feePayer = signers[0].publicKey
      clearTransactionSignatures(transaction)
      transaction.sign(...signers)

      const sig = await connection.sendRawTransaction(transaction.serialize(), {
        skipPreflight: false,
        preflightCommitment: 'confirmed',
        maxRetries: 2,
      })
      lastSignature = sig
      await waitForSolanaSignature(connection, sig)
      return sig
    } catch (e) {
      lastError = e
      const message = e instanceof Error ? e.message : String(e)
      if (lastSignature && (await solanaSignatureSucceeded(connection, lastSignature))) {
        return lastSignature
      }
      if (!isSolanaBlockhashExpiredError(message) || attempt >= 2) break
    }
  }

  if (lastSignature && (await solanaSignatureSucceeded(connection, lastSignature))) {
    return lastSignature
  }

  throw lastError instanceof Error ? lastError : new Error(String(lastError))
}

/** Parse LaunchCreated from transaction logs when available. */
export function parseLaunchCreatedFromLogs(
  logs: string[] | null | undefined,
): { launchId: bigint; mint: string } | null {
  if (!logs?.length) return null
  for (const line of logs) {
    const match = line.match(/launch_id:\s*(\d+)/i)
    if (match) {
      return { launchId: BigInt(match[1]), mint: '' }
    }
  }
  return null
}
