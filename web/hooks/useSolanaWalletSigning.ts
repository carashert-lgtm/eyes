'use client'

import { useCallback } from 'react'
import {
  PublicKey,
  Transaction,
  VersionedTransaction,
  type SendOptions,
} from '@solana/web3.js'
import type { Hex } from 'viem'
import { useAppWallet } from '@/hooks/useAppWallet'
import { deriveSolanaKeypairFromEvmPrivateKey } from '@/lib/eyes-account/solana-keypair'
import { assertWalletSessionIntegrity } from '@/lib/wallet-session-verify'
import { formatWalletTxError } from '@/lib/wallet-errors'
import { waitForSolanaSignature } from '@/lib/solana-launch/confirm'
import { createSolanaConnection } from '@/lib/solana-rpc'

/** Sign and send Solana transactions from the paired Eyes wallet keypair. */
export function useSolanaWalletSigning() {
  const { embeddedSession } = useAppWallet()

  const signAndSend = useCallback(
    async (
      buildTx: (
        connection: ReturnType<typeof createSolanaConnection>,
        payer: PublicKey,
      ) => Promise<Transaction | VersionedTransaction>,
      options?: SendOptions,
    ): Promise<string> => {
      if (!embeddedSession?.privateKey) {
        throw new Error('Sign in and unlock your Eyes wallet first')
      }

      assertWalletSessionIntegrity(embeddedSession)
      const keypair = deriveSolanaKeypairFromEvmPrivateKey(embeddedSession.privateKey as Hex)
      const connection = createSolanaConnection()
      const tx = await buildTx(connection, keypair.publicKey)

      try {
        if (tx instanceof VersionedTransaction) {
          tx.sign([keypair])
          const sig = await connection.sendTransaction(tx, options)
          await waitForSolanaSignature(connection, sig)
          return sig
        }

        tx.feePayer = keypair.publicKey
        tx.recentBlockhash = (await connection.getLatestBlockhash('confirmed')).blockhash
        tx.sign(keypair)
        const sig = await connection.sendRawTransaction(tx.serialize(), options)
        await waitForSolanaSignature(connection, sig)
        return sig
      } catch (e) {
        throw new Error(formatWalletTxError(e))
      }
    },
    [embeddedSession],
  )

  return {
    signAndSend,
    canSign: Boolean(embeddedSession?.privateKey),
    publicKey: embeddedSession?.privateKey
      ? deriveSolanaKeypairFromEvmPrivateKey(embeddedSession.privateKey as Hex).publicKey.toBase58()
      : null,
  }
}
