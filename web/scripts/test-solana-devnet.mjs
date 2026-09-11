/**
 * Solana devnet smoke test — RPC, optional program + factory PDA.
 * Usage:
 *   NEXT_PUBLIC_SOLANA_CLUSTER=devnet node scripts/test-solana-devnet.mjs
 *   NEXT_PUBLIC_SOLANA_LAUNCH_PROGRAM_ID=<id> node scripts/test-solana-devnet.mjs
 */
import { Connection, Keypair, PublicKey } from '@solana/web3.js'

function deriveFactoryPda(programId) {
  return PublicKey.findProgramAddressSync([Buffer.from('factory')], programId)
}

const RPC = process.env.NEXT_PUBLIC_SOLANA_RPC_URL?.trim() || 'https://api.devnet.solana.com'
const PROGRAM_ID = process.env.NEXT_PUBLIC_SOLANA_LAUNCH_PROGRAM_ID?.trim()

async function main() {
  const connection = new Connection(RPC, 'confirmed')
  const version = await connection.getVersion()
  const slot = await connection.getSlot()

  const result = {
    ok: true,
    cluster: 'devnet',
    rpc: RPC,
    solanaVersion: version['solana-core'],
    slot,
    programId: PROGRAM_ID ?? null,
    factoryInitialized: false,
    airdropTest: null,
    issues: [],
  }

  if (!PROGRAM_ID) {
    result.issues.push('NEXT_PUBLIC_SOLANA_LAUNCH_PROGRAM_ID not set — deploy program to devnet first')
    result.ok = false
  } else {
    try {
      const programId = new PublicKey(PROGRAM_ID)
      const [factory] = deriveFactoryPda(programId)
      const info = await connection.getAccountInfo(factory)
      result.factoryPda = factory.toBase58()
      result.factoryInitialized = Boolean(info?.data && info.data.length > 8)
      if (!result.factoryInitialized) {
        result.issues.push('Factory PDA not initialized — run initialize-solana-factory.ts')
        result.ok = false
      }
    } catch (e) {
      result.issues.push(`Program check failed: ${e instanceof Error ? e.message : String(e)}`)
      result.ok = false
    }
  }

  // Free devnet airdrop sanity (ephemeral keypair — no user funds)
  try {
    const probe = Keypair.generate()
    const sig = await connection.requestAirdrop(probe.publicKey, 1_000_000_000)
    await connection.confirmTransaction(sig, 'confirmed')
    const bal = await connection.getBalance(probe.publicKey)
    result.airdropTest = { ok: bal >= 1_000_000_000, signature: sig, lamports: bal }
  } catch (e) {
    result.airdropTest = { ok: false, error: e instanceof Error ? e.message : String(e) }
    result.issues.push('Devnet airdrop failed — try again or use faucet.solana.com')
  }

  console.log(JSON.stringify(result, null, 2))
  process.exit(result.ok ? 0 : 1)
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
