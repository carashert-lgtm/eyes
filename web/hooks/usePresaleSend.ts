'use client'

import { useMemo } from 'react'
import { useSendTransaction, useWaitForTransactionReceipt } from 'wagmi'
import { parseEther } from 'viem'
import { PRESALE_RECIPIENT } from '@/lib/presale-config'
import type { TxStatus } from '@/components/presale/TransactionResult'

function isUserRejection(error: unknown) {
  if (!error) return false
  const name = (error as { name?: string }).name ?? ''
  const message = (error as { message?: string }).message ?? ''
  return (
    name === 'UserRejectedRequestError' ||
    /user rejected|user denied|rejected the request/i.test(message)
  )
}

/**
 * Wraps a native ETH transfer to the presale recipient and normalizes the
 * wagmi send + receipt lifecycle into the TxStatus union the UI renders.
 */
export function usePresaleSend() {
  const {
    sendTransaction,
    data: hash,
    error: sendError,
    isPending: isSigning,
    reset,
  } = useSendTransaction()

  const {
    isLoading: isConfirming,
    isSuccess,
    isError: isReceiptError,
  } = useWaitForTransactionReceipt({ hash })

  const status: TxStatus | null = useMemo(() => {
    if (sendError) return isUserRejection(sendError) ? 'rejected' : 'failed'
    if (isReceiptError) return 'failed'
    if (isSuccess) return 'success'
    if (hash) return 'pending' // signed, waiting for on-chain confirmation
    if (isSigning) return 'confirming' // waiting for wallet signature
    return null
  }, [sendError, isReceiptError, isSuccess, hash, isSigning])

  function send(amountEth: string) {
    if (!PRESALE_RECIPIENT) return
    sendTransaction({
      to: PRESALE_RECIPIENT,
      value: parseEther(amountEth),
    })
  }

  return {
    send,
    reset,
    status,
    hash,
    canSend: Boolean(PRESALE_RECIPIENT),
  }
}
