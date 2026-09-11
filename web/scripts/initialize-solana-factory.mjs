import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { join, dirname } from 'node:path'
import { AnchorProvider, Program } from '@coral-xyz/anchor'
import { Connection, Keypair, PublicKey, SystemProgram } from '@solana/web3.js'
import idl from '../lib/idl/eyes_launch_factory.json' with { type: 'json' }

const programIdStr = process.env.NEXT_PUBLIC_SOLANA_LAUNCH_PROGRAM_ID?.trim()
if (!programIdStr) throw new Error('Set NEXT_PUBLIC_SOLANA_LAUNCH_PROGRAM_ID')

const rpc = process.env.SOLANA_RPC_URL?.trim() || 'https://api.mainnet-beta.solana.com'
const keypairPath =
  process.env.SOLANA_DEPLOYER_KEYPAIR?.trim() ||
  join(dirname(fileURLToPath(import.meta.url)), '..', '..', 'deploy', 'devnet-keypair.json')

const secret = JSON.parse(readFileSync(keypairPath, 'utf8'))
const authority = Keypair.fromSecretKey(Uint8Array.from(secret))
const connection = new Connection(rpc, 'confirmed')
const programId = new PublicKey(programIdStr)

const provider = new AnchorProvider(
  connection,
  {
    publicKey: authority.publicKey,
    signTransaction: async (tx) => {
      tx.sign(authority)
      return tx
    },
    signAllTransactions: async (txs) => {
      txs.forEach((tx) => tx.sign(authority))
      return txs
    },
  },
  { commitment: 'confirmed' },
)

const program = new Program({ ...idl, address: programId.toBase58() }, provider)
const [factory] = PublicKey.findProgramAddressSync([Buffer.from('factory')], programId)

const existing = await connection.getAccountInfo(factory)
if (existing) {
  console.log('Factory already initialized:', factory.toBase58())
  process.exit(0)
}

const sig = await program.methods
  .initialize()
  .accounts({
    factory,
    authority: authority.publicKey,
    systemProgram: SystemProgram.programId,
  })
  .rpc()

console.log('Factory initialized:', factory.toBase58())
console.log('Tx:', sig)
