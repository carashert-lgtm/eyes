/**
 * Minimal mainnet launch smoke test — mint only, no Raydium.
 * Usage:
 *   EYES_CREATOR_EVM_PRIVATE_KEY=0x... \
 *   NEXT_PUBLIC_SOLANA_LAUNCH_PROGRAM_ID=5RpsHik... \
 *   node scripts/test-solana-mainnet-mint.mjs
 */
import { Connection, Keypair, PublicKey, SystemProgram, SYSVAR_RENT_PUBKEY } from '@solana/web3.js'
import { AnchorProvider, Program } from '@coral-xyz/anchor'
import {
  ASSOCIATED_TOKEN_PROGRAM_ID,
  TOKEN_PROGRAM_ID,
  getAssociatedTokenAddressSync,
} from '@solana/spl-token'
import { keccak256, toBytes } from 'viem'
import idl from '../lib/idl/eyes_launch_factory.json' with { type: 'json' }

const PROGRAM_ID = process.env.NEXT_PUBLIC_SOLANA_LAUNCH_PROGRAM_ID?.trim() || '5RpsHikcarovDnb61ChFR36Ko3PYy8sxPS3aJiTQBpQF'
const RPC = process.env.SOLANA_RPC_URL?.trim() || 'https://api.mainnet-beta.solana.com'
const EXPECTED_SOL = process.env.EYES_EXPECTED_SOLANA_ADDRESS?.trim()

const SOLANA_DERIVE_PREFIX = 'eyes-open-solana-v1:'
function seedFromEvmPk(hex) {
  const normalized = hex.startsWith('0x') ? hex : `0x${hex}`
  const seedHex = keccak256(toBytes(`${SOLANA_DERIVE_PREFIX}${normalized}`)).slice(2, 66)
  const seed = new Uint8Array(32)
  for (let i = 0; i < 32; i++) seed[i] = Number.parseInt(seedHex.slice(i * 2, i * 2 + 2), 16)
  return seed
}

async function main() {
  const evmPk = process.env.EYES_CREATOR_EVM_PRIVATE_KEY?.trim()
  if (!evmPk) throw new Error('Set EYES_CREATOR_EVM_PRIVATE_KEY (Eyes wallet export)')

  const seed = seedFromEvmPk(evmPk)
  const creator = Keypair.fromSeed(seed)
  const solAddr = creator.publicKey.toBase58()

  if (EXPECTED_SOL && EXPECTED_SOL !== solAddr) {
    throw new Error(`Solana address mismatch: derived ${solAddr}, expected ${EXPECTED_SOL}`)
  }

  const connection = new Connection(RPC, 'confirmed')
  const bal = await connection.getBalance(creator.publicKey)
  console.log('Creator Solana:', solAddr)
  console.log('Balance:', (bal / 1e9).toFixed(4), 'SOL')
  if (bal < 0.02 * 1e9) throw new Error('Need at least ~0.02 SOL in creator wallet')

  const programId = new PublicKey(PROGRAM_ID)
  const provider = new AnchorProvider(
    connection,
    {
      publicKey: creator.publicKey,
      signTransaction: async (tx) => {
        tx.sign(creator)
        return tx
      },
      signAllTransactions: async (txs) => {
        txs.forEach((tx) => tx.sign(creator))
        return txs
      },
    },
    { commitment: 'confirmed' },
  )
  const program = new Program({ ...idl, address: programId.toBase58() }, provider)
  const [factory] = PublicKey.findProgramAddressSync([Buffer.from('factory')], programId)

  const factoryInfo = await connection.getAccountInfo(factory)
  if (!factoryInfo) throw new Error('Factory not initialized')

  const launchCount = factoryInfo.data.readBigUInt64LE(8 + 32)
  const launchId = launchCount + BigInt(1)
  const idBuf = Buffer.alloc(8)
  idBuf.writeBigUInt64LE(launchId)
  const [launch] = PublicKey.findProgramAddressSync(
    [Buffer.from('launch'), factory.toBuffer(), idBuf],
    programId,
  )

  const mint = Keypair.generate()
  const creatorAta = getAssociatedTokenAddressSync(mint.publicKey, creator.publicKey)

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
    .signers([creator, mint])
    .transaction()

  const { blockhash, lastValidBlockHeight } = await connection.getLatestBlockhash('confirmed')
  tx.recentBlockhash = blockhash
  tx.feePayer = creator.publicKey
  tx.sign(creator, mint)
  const sig = await connection.sendRawTransaction(tx.serialize(), { skipPreflight: false })
  await connection.confirmTransaction({ signature: sig, blockhash, lastValidBlockHeight }, 'confirmed')

  console.log(JSON.stringify({ ok: true, launchId: launchId.toString(), mint: mint.publicKey.toBase58(), tx: sig }, null, 2))
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
