'use client'

import { useCallback, useState } from 'react'
import type { Address, Hash } from 'viem'
import { EYES_BURN_ADDRESS, EYES_TOKEN_ABI } from '@/lib/contracts/eyes-token'
import { getEyesTokenAddress } from '@/lib/eyes-token-config'
import { getSettlementTreasuryAddress } from '@/lib/settlement-treasury'
import { formatWalletTxError } from '@/lib/wallet-errors'
import { waitForWalletReceipt } from '@/lib/wallet-receipt-wait'
import { useEyesWalletSigning } from '@/hooks/useEyesWalletSigning'

type SettlementInput = {
  burnAmount: number
  treasuryAmount: number
}

type SettlementResult = {
  burnTxHash: Hash
  treasuryTxHash: Hash | null
}

export function useEyesSettlement() {
  const { transferErc20, canSign } = useEyesWalletSigning()
  const [pending, setPending] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const paySettlement = useCallback(
    async (amounts: SettlementInput): Promise<SettlementResult> => {
      const token = getEyesTokenAddress() as Address | null
      if (!token) throw new Error('$EYES token is not configured')
      if (!canSign) throw new Error('Sign in to pay fees from your Eyes wallet')

      setPending(true)
      setError(null)

      try {
        const unit = BigInt(10) ** BigInt(18)
        const burnWei = BigInt(Math.floor(amounts.burnAmount)) * unit
        const treasuryWei = BigInt(Math.floor(amounts.treasuryAmount)) * unit
        const treasuryAddr = getSettlementTreasuryAddress()
        if (treasuryWei > BigInt(0) && !treasuryAddr) {
          throw new Error('Settlement treasury is not configured')
        }

        const burnTxHash = await transferErc20(token, EYES_BURN_ADDRESS, burnWei)
        await waitForWalletReceipt(burnTxHash, {
          label: 'Burn transfer',
          required: false,
        })

        let treasuryTxHash: Hash | null = null
        if (treasuryWei > BigInt(0)) {
          treasuryTxHash = await transferErc20(token, treasuryAddr!, treasuryWei)
          if (treasuryTxHash.toLowerCase() === burnTxHash.toLowerCase()) {
            throw new Error(
              'Treasury transfer did not broadcast separately from burn — wait a moment and retry.',
            )
          }
          await waitForWalletReceipt(treasuryTxHash, {
            label: 'Treasury transfer',
            required: false,
          })
        }
        return { burnTxHash, treasuryTxHash }
      } catch (e) {
        const message = formatWalletTxError(e)
        setError(message)
        throw new Error(message)
      } finally {
        setPending(false)
      }
    },
    [canSign, transferErc20],
  )

  return { paySettlement, pending, error }
}

export { EYES_BURN_ADDRESS, EYES_TOKEN_ABI }
