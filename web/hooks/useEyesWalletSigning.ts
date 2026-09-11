'use client'

import { useCallback } from 'react'
import {
  createPublicClient,
  createWalletClient,
  type Abi,
  type Address,
  type Hash,
  type Hex,
} from 'viem'
import { privateKeyToAccount } from 'viem/accounts'
import { useAppWallet } from '@/hooks/useAppWallet'
import { getLaunchEvmChain, type LaunchEvmChainKey } from '@/lib/viem-chain'
import { assertWalletSessionIntegrity } from '@/lib/wallet-session-verify'
import { formatWalletTxError } from '@/lib/wallet-errors'
import { eyesWalletTransport } from '@/lib/wallet-transport'

function clientsForSession(privateKey: Hex, chainKey: LaunchEvmChainKey) {
  const chain = getLaunchEvmChain(chainKey)
  const transport = eyesWalletTransport(chainKey)
  const account = privateKeyToAccount(privateKey)
  return {
    account,
    chain,
    publicClient: createPublicClient({ chain, transport }),
    walletClient: createWalletClient({ account, chain, transport }),
  }
}

/** Sign and broadcast contract calls from the embedded Eyes wallet. */
export function useEyesWalletSigning(launchChainKey: LaunchEvmChainKey = 'base') {
  const { embeddedSession } = useAppWallet()

  const writeContract = useCallback(
    async (input: {
      address: Address
      abi: Abi
      functionName: string
      args?: readonly unknown[]
      value?: bigint
    }): Promise<Hash> => {
      if (!embeddedSession?.privateKey) {
        throw new Error('Sign in and unlock your Eyes wallet first')
      }

      const signerAddress = assertWalletSessionIntegrity(embeddedSession)
      const { account, chain, publicClient, walletClient } = clientsForSession(
        embeddedSession.privateKey as Hex,
        launchChainKey,
      )

      try {
        await publicClient.simulateContract({
          account,
          address: input.address,
          abi: input.abi,
          functionName: input.functionName,
          args: input.args ?? [],
          value: input.value,
        })

        return walletClient.writeContract({
          address: input.address,
          abi: input.abi,
          functionName: input.functionName,
          args: input.args,
          value: input.value,
          chain,
        })
      } catch (e) {
        const message = formatWalletTxError(e)
        if (/unlock|log out|session/i.test(message)) throw new Error(message)
        throw new Error(
          `${message} (signer ${signerAddress.slice(0, 6)}…${signerAddress.slice(-4)})`,
        )
      }
    },
    [embeddedSession, launchChainKey],
  )

  const transferErc20 = useCallback(
    async (token: Address, to: Address, amountWei: bigint): Promise<Hash> => {
      return writeContract({
        address: token,
        abi: [
          {
            type: 'function',
            name: 'transfer',
            stateMutability: 'nonpayable',
            inputs: [
              { name: 'to', type: 'address' },
              { name: 'amount', type: 'uint256' },
            ],
            outputs: [{ name: '', type: 'bool' }],
          },
        ],
        functionName: 'transfer',
        args: [to, amountWei],
      })
    },
    [writeContract],
  )

  const sendNative = useCallback(
    async (to: Address, valueWei: bigint): Promise<Hash> => {
      if (!embeddedSession?.privateKey) {
        throw new Error('Sign in and unlock your Eyes wallet first')
      }

      const signerAddress = assertWalletSessionIntegrity(embeddedSession)
      const { account, chain, walletClient } = clientsForSession(
        embeddedSession.privateKey as Hex,
        launchChainKey,
      )

      try {
        return walletClient.sendTransaction({
          account,
          to,
          value: valueWei,
          chain,
        })
      } catch (e) {
        const message = formatWalletTxError(e)
        if (/unlock|log out|session/i.test(message)) throw new Error(message)
        throw new Error(
          `${message} (signer ${signerAddress.slice(0, 6)}…${signerAddress.slice(-4)})`,
        )
      }
    },
    [embeddedSession, launchChainKey],
  )

  return {
    writeContract,
    transferErc20,
    sendNative,
    canSign: Boolean(embeddedSession?.privateKey),
  }
}
