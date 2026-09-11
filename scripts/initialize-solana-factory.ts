/**
 * One-time factory bootstrap after program deploy.
 * Usage (from repo root):
 *   cd web && npx tsx ../scripts/initialize-solana-factory.ts
 *
 * Requires: SOLANA_RPC_URL, deployer keypair at ~/.config/solana/id.json
 */
import { readFileSync } from 'node:fs'
import { homedir } from 'node:os'
import { join } from 'node:path'
import { AnchorProvider, Program, type Idl } from '@coral-xyz/anchor'
import { Connection, Keypair, PublicKey, SystemProgram } from '@solana/web3.js'
import idl from '../web/lib/idl/eyes_launch_factory.json'

async function main() {
  const programIdStr = process.env.NEXT_PUBLIC_SOLANA_LAUNCH_PROGRAM_ID?.trim()
  if (!programIdStr) throw new Error('Set NEXT_PUBLIC_SOLANA_LAUNCH_PROGRAM_ID')
  const rpc = process.env.SOLANA_RPC_URL?.trim() || 'https://api.devnet.solana.com'
  const keypairPath = process.env.SOLANA_DEPLOYER_KEYPAIR?.trim() || join(homedir(), '.config', 'solana', 'id.json')
  const secret = JSON.parse(readFileSync(keypairPath, 'utf8')) as number[]
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

  const program = new Program({ ...idl, address: programId.toBase58() } as Idl, provider)
  const [factory] = PublicKey.findProgramAddressSync([Buffer.from('factory')], programId)

  const existing = await connection.getAccountInfo(factory)
  if (existing) {
    console.log('Factory already initialized:', factory.toBase58())
    return
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
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
