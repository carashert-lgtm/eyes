/**
 * Simulate create_launch against mainnet factory (no send).
 * Usage: node scripts/simulate-create-launch-once.mjs [creatorSolanaPubkey]
 */
import { Keypair, PublicKey, SystemProgram, SYSVAR_RENT_PUBKEY } from '@solana/web3.js'
import { AnchorProvider, Program } from '@coral-xyz/anchor'
import {
  ASSOCIATED_TOKEN_PROGRAM_ID,
  TOKEN_PROGRAM_ID,
  getAssociatedTokenAddressSync,
} from '@solana/spl-token'
import idl from '../lib/idl/eyes_launch_factory.json' with { type: 'json' }
import { createSolanaConnection } from '../lib/solana-rpc.ts'
import {
  deriveFactoryPda,
  deriveLaunchPda,
  fetchFactoryState,
} from '../lib/solana-launch/factory-client.ts'

const PROGRAM_ID = new PublicKey(
  process.env.NEXT_PUBLIC_SOLANA_LAUNCH_PROGRAM_ID?.trim() ||
    '5RpsHikcarovDnb61ChFR36Ko3PYy8sxPS3aJiTQBpQF',
)
const CREATOR =
  process.argv[2]?.trim() || 'DVTHDa2Mx9eJDzA6tUoJZNv5bfm4csKPZnSFrcbi4qrt'

const connection = createSolanaConnection()
const creator = { publicKey: new PublicKey(CREATOR) }
const factoryState = await fetchFactoryState(connection)
console.log('factoryState', factoryState)

const [factory] = deriveFactoryPda(PROGRAM_ID)
const launchId = factoryState.launchCount + BigInt(1)
const [launch] = deriveLaunchPda(PROGRAM_ID, factory, launchId)
const mint = Keypair.generate()
const creatorAta = getAssociatedTokenAddressSync(mint.publicKey, creator.publicKey)

const provider = new AnchorProvider(
  connection,
  {
    publicKey: creator.publicKey,
    signTransaction: async (tx) => {
      tx.partialSign(mint)
      return tx
    },
    signAllTransactions: async (txs) => {
      txs.forEach((tx) => tx.partialSign(mint))
      return txs
    },
  },
  { commitment: 'confirmed' },
)

const program = new Program({ ...idl, address: PROGRAM_ID.toBase58() }, provider)
const tx = await program.methods
  .createLaunch('Eyes Smoke Test', 'SMOK', 3600)
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
  .signers([mint])
  .transaction()

const { blockhash } = await connection.getLatestBlockhash('confirmed')
tx.recentBlockhash = blockhash
tx.feePayer = creator.publicKey
tx.partialSign(mint)

const encoded = Buffer.from(
  tx.serialize({ requireAllSignatures: false, verifySignatures: false }),
).toString('base64')
const simResult = await connection._rpcRequest('simulateTransaction', [
  encoded,
  {
    encoding: 'base64',
    sigVerify: false,
    replaceRecentBlockhash: true,
    commitment: 'confirmed',
  },
])
const sim = simResult.result?.value ?? simResult.value ?? simResult

console.log('err', JSON.stringify(sim.err))
console.log('units', sim.unitsConsumed)
console.log('logs:\n', (sim.logs ?? []).join('\n'))
