'use client'

import Link from 'next/link'
import { useMemo, useState, useEffect, useCallback } from 'react'
import { Check, Loader2, Upload } from 'lucide-react'
import { CopyAddressInline } from '@/components/ui/CopyAddressInline'
import { createPublicClient, isAddress, parseEther, type Address, type Hash, type Hex } from 'viem'
import { LaunchNetworkBadge } from '@/components/app/LaunchNetworkBadge'
import { LaunchChainSelector } from '@/components/app/LaunchChainSelector'
import { FEATURES, ROUTES, TOKENOMICS, CONTRACTS } from '@/lib/site-config'
import { computeLaunchFeeEyes, LAUNCH_FEE_EYES } from '@/lib/retention-config'
import { cn } from '@/lib/utils'
import { truncateAddress } from '@/lib/address-utils'
import { LAUNCH_FACTORY_ABI } from '@/lib/contracts/launch-factory'
import { getLaunchEvmChain, type LaunchEvmChainKey } from '@/lib/viem-chain'
import { eyesWalletTransport } from '@/lib/wallet-transport'
import { DEFAULT_LP_TOKEN_AMOUNT, FOMO_MIN_LP_ETH } from '@/lib/launch-constants'
import { getLaunchRecordId } from '@/lib/platform-status'
import { getFomoTokenUrl } from '@/lib/fomo-links'
import { useLaunchChain } from '@/lib/launch-chains/context'
import { parseLaunchCreatedLog } from '@/lib/launch-receipt'
import { useAppWallet } from '@/hooks/useAppWallet'
import { useLaunchBalances } from '@/hooks/useLaunchBalances'
import { useEyesSettlement } from '@/hooks/useEyesSettlement'
import { useEyesWalletSigning } from '@/hooks/useEyesWalletSigning'
import { ProfileWalletHome } from '@/components/wallet/ProfileWalletHome'
import { EyesAuthPanel } from '@/components/wallet/EyesAuthPanel'
import { useEyesAccount } from '@/components/providers/EyesAccountProvider'
import { getCreateLaunchGates } from '@/lib/create-launch-gates'
import { formatWalletTxError } from '@/lib/wallet-errors'
import { fetchLaunchFeeCheck } from '@/lib/launch-fee-check-client'
import { finalizeLaunchFeeAfterLaunch, resolveLaunchFeeCredit } from '@/lib/launch-fee-client'
import { loadPendingLaunchFee } from '@/lib/launch-fee-session'
import { readJsonResponse } from '@/lib/fetch-json'
import { deriveSolanaKeypairFromEvmPrivateKey } from '@/lib/eyes-account/solana-keypair'
import { isSolanaDevnet, solanaRaydiumEnabled } from '@/lib/solana-cluster'
import { createSolanaConnection } from '@/lib/solana-rpc'
import { DEFAULT_LP_TOKEN_AMOUNT_SOL } from '@/lib/solana-launch/constants'
import {
  buildCreateLaunchTransaction,
  buildFinalizeLiquidityTransaction,
  sendSignedTransaction,
} from '@/lib/solana-launch/factory-client'

const WINDOW_OPTIONS = [
  { label: '15 minutes', value: 900 },
  { label: '30 minutes', value: 1800 },
  { label: '1 hour', value: 3600 },
  { label: '2 hours', value: 7200 },
  { label: '6 hours', value: 21600 },
] as const

type FormState = {
  name: string
  symbol: string
  description: string
  website: string
  twitter: string
  telegram: string
  windowSeconds: number
  lpNative: string
  agreed: boolean
}

type LaunchResult = {
  token: string
  launchId: number
  fomoUrl: string
  deployHash: string
  seedHash: string | null
  discoveryRegistered: boolean
}

type DiscoveryRegistrationInput = {
  chainKey: 'base' | 'ethereum' | 'solana'
  launchId: number
  tokenAddress: string
  name: string
  symbol: string
  description: string
  website: string
  twitter: string
  telegram: string
  creator: string
  deployTxHash: string
  seedTxHash: string
}

type SubmitState = 'idle' | 'loading' | 'success' | 'error'

export function CreateLaunchForm() {
  const { chain: launchChain } = useLaunchChain()

  const evmDeployChainKey: LaunchEvmChainKey =
    launchChain.key === 'ethereum' ? 'ethereum' : 'base'

  const launchPublicClient = useMemo(
    () =>
      createPublicClient({
        chain: getLaunchEvmChain(evmDeployChainKey),
        transport: eyesWalletTransport(evmDeployChainKey),
      }),
    [evmDeployChainKey],
  )

  const { signedIn } = useEyesAccount()
  const { address, isConnected, hasWallet, walletUnlocked, embeddedSession } = useAppWallet()
  const {
    tier,
    balance,
    nativeBalance,
    hasGasForLaunch,
    minEthGas,
    minSolGas,
    hasToken,
    solanaAddress,
    solanaAddressReady,
  } = useLaunchBalances(launchChain.key)
  const { paySettlement } = useEyesSettlement()
  const { writeContract, canSign } = useEyesWalletSigning(evmDeployChainKey)

  const factoryAddress =
    launchChain.key === 'base'
      ? CONTRACTS.launchFactory
      : launchChain.factoryAddress ?? ''
  const factoryReady =
    launchChain.key === 'base'
      ? isAddress(factoryAddress)
      : launchChain.family === 'evm'
        ? Boolean(factoryAddress && isAddress(factoryAddress))
        : Boolean(launchChain.programId)

  const [form, setForm] = useState<FormState>({
    name: '',
    symbol: '',
    description: '',
    website: '',
    twitter: '',
    telegram: '',
    windowSeconds: 3600,
    lpNative: launchChain.defaultLpNative,
    agreed: false,
  })
  const [submitState, setSubmitState] = useState<SubmitState>('idle')
  const [feeNote, setFeeNote] = useState<string | null>(null)
  const [launchResult, setLaunchResult] = useState<LaunchResult | null>(null)
  const [pendingRegistration, setPendingRegistration] = useState<DiscoveryRegistrationInput | null>(
    null,
  )
  const [retryingDiscovery, setRetryingDiscovery] = useState(false)
  const [reusableLaunchFee, setReusableLaunchFee] = useState(false)
  const [feeCheckLoading, setFeeCheckLoading] = useState(false)

  const refreshLaunchFeeCheck = useCallback(async (wallet: string) => {
    setFeeCheckLoading(true)
    try {
      const data = await fetchLaunchFeeCheck(wallet)
      setReusableLaunchFee(Boolean(resolveLaunchFeeCredit(data, wallet)?.burnTxHash))
      return data
    } catch {
      const pending = loadPendingLaunchFee(wallet)
      setReusableLaunchFee(Boolean(pending))
      return pending
        ? {
            ok: true,
            paidOnChain: true,
            reusable: true,
            burnTxHash: pending.burnTxHash,
            treasuryTxHash: pending.treasuryTxHash,
          }
        : null
    } finally {
      setFeeCheckLoading(false)
    }
  }, [])

  useEffect(() => {
    setForm((prev) => ({
      ...prev,
      lpNative: launchChain.defaultLpNative,
      agreed: false,
    }))
    setSubmitState('idle')
    setFeeNote(null)
    setLaunchResult(null)
    setPendingRegistration(null)
  }, [launchChain.key])

  useEffect(() => {
    if (!FEATURES.retention || !address) {
      setReusableLaunchFee(false)
      return
    }
    void refreshLaunchFeeCheck(address)
  }, [address, refreshLaunchFeeCheck])

  const eyesFee = useMemo(
    () => (FEATURES.retention ? computeLaunchFeeEyes(tier.id) : null),
    [tier.id],
  )
  const eyesSettlementReady = Boolean(
    FEATURES.retention &&
      hasToken &&
      eyesFee &&
      (reusableLaunchFee || balance >= eyesFee.eyesCost) &&
      hasGasForLaunch,
  )

  const isEvmLaunch = launchChain.family === 'evm'

  const lpNativeAmount = useMemo(() => {
    const n = Number(form.lpNative)
    return Number.isFinite(n) && n > 0 ? n : 0
  }, [form.lpNative])

  const deployGates = useMemo(
    () =>
      getCreateLaunchGates({
        chain: launchChain,
        signedIn,
        hasWallet,
        walletUnlocked,
        canSign,
        factoryReady,
        name: form.name,
        symbol: form.symbol,
        agreed: form.agreed,
        retentionEnabled: FEATURES.retention,
        hasToken,
        eyesFeeCost: eyesFee?.eyesCost ?? null,
        eyesBalance: balance,
        nativeBalance,
        lpNativeRequired: launchChain.deployEnabled ? lpNativeAmount : 0,
        launchFeeSatisfied: reusableLaunchFee,
        solanaAddressReady,
      }),
    [
      launchChain,
      signedIn,
      hasWallet,
      walletUnlocked,
      canSign,
      factoryReady,
      form.name,
      form.symbol,
      form.agreed,
      hasToken,
      eyesFee?.eyesCost,
      balance,
      nativeBalance,
      lpNativeAmount,
      reusableLaunchFee,
      solanaAddressReady,
    ],
  )

  const lpNativeValid = useMemo(() => {
    if (!launchChain.deployEnabled) return true
    const n = Number(form.lpNative)
    return Number.isFinite(n) && n > 0
  }, [form.lpNative, launchChain.deployEnabled])

  const canSubmit = deployGates.ready && lpNativeValid && submitState !== 'loading'

  const previewSymbol = form.symbol.toUpperCase().slice(0, 6) || 'TKN'
  const previewInitials = previewSymbol.slice(0, 2)

  const windowLabel = useMemo(
    () =>
      WINDOW_OPTIONS.find((o) => o.value === form.windowSeconds)?.label ??
      '1 hour',
    [form.windowSeconds],
  )

  const update = <K extends keyof FormState>(key: K, value: FormState[K]) => {
    setForm((prev) => ({ ...prev, [key]: value }))
  }

  const registerForDiscovery = async (payload: DiscoveryRegistrationInput) => {
    const registerRes = await fetch('/api/launches/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    })
    const registerData = await readJsonResponse<{ error?: string }>(registerRes)
    if (!registerRes.ok) {
      throw new Error(registerData.error ?? 'Discovery registration failed')
    }
  }

  const retryDiscoveryRegistration = async () => {
    if (!pendingRegistration || !launchResult) return
    setRetryingDiscovery(true)
    setFeeNote('Retrying discovery registration…')
    try {
      await registerForDiscovery(pendingRegistration)
      setLaunchResult({ ...launchResult, discoveryRegistered: true })
      setPendingRegistration(null)
      setFeeNote(null)
    } catch (e) {
      setFeeNote(e instanceof Error ? e.message : 'Discovery registration failed')
    } finally {
      setRetryingDiscovery(false)
    }
  }

  const settleLaunchFeeAfterSuccess = async (launchTxHash: string): Promise<void> => {
    if (!FEATURES.retention || !hasToken || !eyesFee || !address) return

    await finalizeLaunchFeeAfterLaunch({
      wallet: address,
      tierId: tier.id,
      pricing: eyesFee,
      balance,
      launchTxHash,
      paySettlement,
      onStatus: setFeeNote,
      refreshCheck: refreshLaunchFeeCheck,
    })
    setReusableLaunchFee(false)
  }

  const handleSolanaDeploy = async () => {
    if (!embeddedSession?.privateKey || !solanaAddress || !address) return

    setSubmitState('loading')
    setFeeNote(null)
    setLaunchResult(null)
    setPendingRegistration(null)

    try {
      setFeeNote('Checking Solana launch program…')
      const preflightRes = await fetch(
        `/api/launch/solana/preflight?wallet=${encodeURIComponent(solanaAddress)}`,
      )
      const preflight = await readJsonResponse<{
        ok?: boolean
        issues?: string[]
        error?: string
      }>(preflightRes)
      if (!preflightRes.ok || !preflight.ok) {
        const detail =
          preflight.issues?.join(' · ') ?? preflight.error ?? 'Solana launch program is not ready'
        throw new Error(detail)
      }

      const keypair = deriveSolanaKeypairFromEvmPrivateKey(embeddedSession.privateKey as Hex)
      const connection = createSolanaConnection()

      setFeeNote('Confirm Solana token deploy…')
      const { transaction, mint, launchId, mintAddress } = await buildCreateLaunchTransaction(
        keypair,
        {
          name: form.name.trim(),
          symbol: previewSymbol,
          windowSeconds: form.windowSeconds,
        },
      )
      const deployHash = await sendSignedTransaction(connection, transaction, [keypair, mint])

      let seedTxHash: string = deployHash

      if (solanaRaydiumEnabled()) {
        setFeeNote('Seeding Raydium CPMM liquidity…')
        const { seedRaydiumCpmmPoolAndBurnLp, burnRemainingLaunchTokens } = await import(
          '@/lib/solana-launch/raydium-seed'
        )
        const seed = await seedRaydiumCpmmPoolAndBurnLp({
          creator: keypair,
          tokenMint: mintAddress,
          solAmount: lpNativeAmount,
          connection,
        })
        seedTxHash = seed.seedTx

        setFeeNote('Burning unsold supply…')
        await burnRemainingLaunchTokens({
          creator: keypair,
          tokenMint: mintAddress,
          amount: DEFAULT_LP_TOKEN_AMOUNT_SOL,
          connection,
        })

        setFeeNote('Recording liquidity lock…')
        const finalizeTx = await buildFinalizeLiquidityTransaction(
          keypair,
          launchId,
          seed.poolId,
        )
        await sendSignedTransaction(connection, finalizeTx, [keypair])
      } else if (isSolanaDevnet()) {
        setFeeNote('Devnet — token mint verified (Raydium LP is mainnet-only)…')
      }

      await settleLaunchFeeAfterSuccess(deployHash)

      const tokenAddress = mintAddress.toBase58()
      const registrationPayload: DiscoveryRegistrationInput = {
        chainKey: 'solana',
        launchId: Number(launchId),
        tokenAddress,
        name: form.name.trim(),
        symbol: previewSymbol,
        description: form.description,
        website: form.website,
        twitter: form.twitter,
        telegram: form.telegram,
        creator: solanaAddress,
        deployTxHash: deployHash,
        seedTxHash,
      }

      let discoveryRegistered = true
      try {
        await registerForDiscovery(registrationPayload)
      } catch (registerErr) {
        discoveryRegistered = false
        setPendingRegistration(registrationPayload)
        setFeeNote(
          registerErr instanceof Error
            ? registerErr.message
            : 'Live on Solana — discovery save failed. Retry below.',
        )
      }

      setLaunchResult({
        token: tokenAddress,
        launchId: Number(launchId),
        fomoUrl: getFomoTokenUrl(tokenAddress, 'solana'),
        deployHash,
        seedHash: seedTxHash,
        discoveryRegistered,
      })
      setSubmitState('success')
    } catch (e) {
      setSubmitState('error')
      setFeeNote(formatWalletTxError(e))
    }
  }

  const handleDeploy = async () => {
    if (!canSubmit) return

    if (!launchChain.deployEnabled) {
      setSubmitState('error')
      setFeeNote(
        `${launchChain.label} on-chain deploy is coming soon. Your Eyes wallet, $EYES fee, and ${launchChain.nativeSymbol} balances are set up the same as Base.`,
      )
      return
    }

    if (launchChain.key === 'solana') {
      if (!embeddedSession?.privateKey || !solanaAddress) {
        setSubmitState('error')
        setFeeNote('Unlock your Eyes wallet to deploy on Solana.')
        return
      }
      await handleSolanaDeploy()
      return
    }

    if (!isEvmLaunch || !address || !factoryReady) return

    setSubmitState('loading')
    setFeeNote(null)
    setLaunchResult(null)
    setPendingRegistration(null)

    try {
      setFeeNote('Checking launch factory…')
      const preflightRes = await fetch(
        `/api/launch/preflight?wallet=${encodeURIComponent(address)}&chain=${launchChain.key}`,
      )
      const preflight = await readJsonResponse<{
        ok?: boolean
        issues?: string[]
        error?: string
      }>(preflightRes)
      if (!preflightRes.ok || !preflight.ok) {
        const detail =
          preflight.issues?.join(' · ') ?? preflight.error ?? 'Launch factory is not ready'
        throw new Error(detail)
      }

      if (!launchChain.deployEnabled) {
        throw new Error(
          `On-chain deploy is not enabled on ${launchChain.label} yet — the launch factory must be wired first.`,
        )
      }

      setFeeNote('Confirm launch deploy…')
      const deployHash = await writeContract({
        address: factoryAddress as Address,
        abi: LAUNCH_FACTORY_ABI,
        functionName: 'createLaunch',
        args: [
          {
            name: form.name.trim(),
            symbol: previewSymbol,
            creator: address,
            tokenSupply: BigInt(0),
            eyesWindowDuration: BigInt(form.windowSeconds),
            creatorFeeBps: 0,
            burnFeeBps: 0,
          },
        ],
      })

      setFeeNote('Confirming deploy…')
      const deployReceipt = await launchPublicClient.waitForTransactionReceipt({ hash: deployHash })
      const created = parseLaunchCreatedLog(deployReceipt.logs, factoryAddress as Address)
      if (!created) throw new Error('Could not read launch from transaction')

      setFeeNote(`Seeding ${launchChain.lpDexLabel} liquidity…`)
      const seedHash = await writeContract({
        address: factoryAddress as Address,
        abi: LAUNCH_FACTORY_ABI,
        functionName: 'seedLiquidity',
        args: [BigInt(created.launchId), DEFAULT_LP_TOKEN_AMOUNT, BigInt(1), BigInt(1)],
        value: parseEther(form.lpNative),
      })
      await launchPublicClient.waitForTransactionReceipt({ hash: seedHash })

      await settleLaunchFeeAfterSuccess(deployHash)

      setFeeNote('Registering for discovery…')
      const registrationPayload: DiscoveryRegistrationInput = {
        chainKey: launchChain.key === 'ethereum' ? 'ethereum' : 'base',
        launchId: created.launchId,
        tokenAddress: created.token,
        name: form.name.trim(),
        symbol: previewSymbol,
        description: form.description,
        website: form.website,
        twitter: form.twitter,
        telegram: form.telegram,
        creator: address,
        deployTxHash: deployHash,
        seedTxHash: seedHash,
      }

      let discoveryRegistered = true
      try {
        await registerForDiscovery(registrationPayload)
      } catch (registerErr) {
        discoveryRegistered = false
        setPendingRegistration(registrationPayload)
        setFeeNote(
          registerErr instanceof Error
            ? registerErr.message
            : `Live on ${launchChain.label} — discovery save failed. Retry below.`,
        )
      }

      setLaunchResult({
        token: created.token,
        launchId: created.launchId,
        fomoUrl: getFomoTokenUrl(created.token, launchChain.key === 'ethereum' ? 'ethereum' : 'base'),
        deployHash: deployHash as string,
        seedHash: seedHash as string | null,
        discoveryRegistered,
      })
      setSubmitState('success')
    } catch (e) {
      setSubmitState('error')
      setFeeNote(formatWalletTxError(e))
    }
  }

  return (
    <div className="space-y-8">
      <div className="max-w-2xl">
        <div className="mb-4 flex flex-wrap items-center gap-3">
          <span className="font-mono-label text-primary">Create launch</span>
          <LaunchNetworkBadge chain={launchChain} />
        </div>
        <h1 className="font-display text-3xl font-extrabold tracking-tight text-foreground sm:text-4xl">
          Deploy a fair launch
        </h1>
        <p className="mt-3 text-muted-foreground">
          Configure your token and Eyes Window rules, then deploy on{' '}
          {launchChain.label}.
        </p>
      </div>

      <LaunchChainSelector />

      <ProfileWalletHome compact launchChainKey={launchChain.key} />

      {!signedIn ? <EyesAuthPanel /> : null}

      {!factoryReady && launchChain.key === 'base' ? (
        <div className="rounded-sm border border-border bg-surface px-4 py-3 text-sm text-muted-foreground">
          Fair launch deployment is not live on {launchChain.label} yet. This page will
          open when the launch factory is deployed — check back after public go-live.
        </div>
      ) : null}

      {launchChain.comingSoon ? (
        <div className="rounded-sm border border-amber-500/30 bg-amber-500/5 px-4 py-3 text-sm text-muted-foreground">
          {launchChain.label} fair launch is in progress — configure your token below. Deploy
          opens when the on-chain {launchChain.family === 'solana' ? 'program' : 'factory'} is wired.
        </div>
      ) : null}

      <div className="grid gap-8 lg:grid-cols-[1fr_340px]">
        <div className="space-y-8">
          <section className="rounded-sm border border-border bg-surface p-6">
            <h2 className="font-display text-lg font-bold text-foreground">
              Token details
            </h2>
            <div className="mt-5 space-y-4">
              <Field label="Token name">
                <input
                  value={form.name}
                  onChange={(e) => update('name', e.target.value)}
                  placeholder="My Fair Token"
                  className={inputClass}
                />
              </Field>
              <Field label="Ticker / symbol">
                <input
                  value={form.symbol}
                  onChange={(e) =>
                    update('symbol', e.target.value.toUpperCase().slice(0, 6))
                  }
                  placeholder="FAIR"
                  maxLength={6}
                  className={inputClass}
                />
              </Field>
              <Field label="Description">
                <textarea
                  value={form.description}
                  onChange={(e) =>
                    update('description', e.target.value.slice(0, 280))
                  }
                  rows={4}
                  placeholder="Add description here . . ."
                  className={cn(inputClass, 'resize-none')}
                />
                <p className="mt-1 text-right text-xs text-muted-foreground">
                  {form.description.length}/280
                </p>
              </Field>
              <Field label="Token image">
                <div className="flex min-h-28 cursor-not-allowed flex-col items-center justify-center rounded-sm border border-dashed border-border bg-background/60 px-4 py-6 text-center">
                  <Upload className="h-5 w-5 text-muted-foreground" />
                  <p className="mt-2 text-sm text-muted-foreground">
                    PNG or JPG · max 2MB
                  </p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    Upload wiring pending
                  </p>
                </div>
              </Field>
            </div>
          </section>

          <section className="rounded-sm border border-border bg-surface p-6">
            <h2 className="font-display text-lg font-bold text-foreground">
              Socials <span className="text-sm font-normal text-muted-foreground">(optional)</span>
            </h2>
            <div className="mt-5 space-y-4">
              <Field label="Website URL">
                <input
                  value={form.website}
                  onChange={(e) => update('website', e.target.value)}
                  placeholder="https://"
                  className={inputClass}
                />
              </Field>
              <Field label="X (Twitter)">
                <input
                  value={form.twitter}
                  onChange={(e) => update('twitter', e.target.value)}
                  placeholder="@handle"
                  className={inputClass}
                />
              </Field>
              <Field label="Telegram">
                <input
                  value={form.telegram}
                  onChange={(e) => update('telegram', e.target.value)}
                  placeholder="https://t.me/..."
                  className={inputClass}
                />
              </Field>
            </div>
          </section>

          <section className="rounded-sm border border-border bg-surface p-6">
            <h2 className="font-display text-lg font-bold text-foreground">
              Launch rules
            </h2>
            <div className="mt-5 space-y-4">
              <Field label="Eyes Window duration">
                <select
                  value={form.windowSeconds}
                  onChange={(e) =>
                    update('windowSeconds', Number(e.target.value))
                  }
                  className={inputClass}
                >
                  {WINDOW_OPTIONS.map((opt) => (
                    <option key={opt.value} value={opt.value}>
                      {opt.label}
                    </option>
                  ))}
                </select>
                <p className="mt-2 text-xs leading-relaxed text-muted-foreground">
                  During the Eyes Window, wallet-to-wallet transfers are blocked.
                  Only buys through the pad.
                </p>
              </Field>
              {launchChain.deployEnabled ? (
                <Field label={`Initial liquidity (${launchChain.nativeSymbol})`}>
                  <input
                    type="text"
                    inputMode="decimal"
                    value={form.lpNative}
                    onChange={(e) => update('lpNative', e.target.value)}
                    placeholder={launchChain.defaultLpNative}
                    className={inputClass}
                  />
                  <p className="mt-2 text-xs leading-relaxed text-muted-foreground">
                    Seeds a {launchChain.lpDexLabel} pool and locks LP forever — required for{' '}
                    {launchChain.tradingAppLabel} trading on {launchChain.label}.
                    {launchChain.family === 'evm'
                      ? ` You also need ${launchChain.nativeSymbol} for gas.`
                      : ''}
                  </p>
                  {launchChain.key === 'base' &&
                  lpNativeAmount > 0 &&
                  lpNativeAmount < FOMO_MIN_LP_ETH ? (
                    <p className="mt-2 text-xs leading-relaxed text-amber-400">
                      Below {FOMO_MIN_LP_ETH} ETH, FOMO may block trading or show extreme slippage. Use{' '}
                      {FOMO_MIN_LP_ETH} ETH or more for a realistic test.
                    </p>
                  ) : null}
                  {launchChain.key === 'ethereum' &&
                  lpNativeAmount > 0 &&
                  lpNativeAmount < launchChain.minLpNative ? (
                    <p className="mt-2 text-xs leading-relaxed text-amber-400">
                      Below {launchChain.minLpNative} ETH, Uniswap pools may show extreme slippage. Use{' '}
                      {launchChain.defaultLpNative} ETH or more for a realistic launch.
                    </p>
                  ) : null}
                  {launchChain.key === 'solana' &&
                  lpNativeAmount > 0 &&
                  lpNativeAmount < launchChain.minLpNative ? (
                    <p className="mt-2 text-xs leading-relaxed text-amber-400">
                      Below {launchChain.minLpNative} SOL, DEX apps may block trading or show extreme
                      slippage.
                    </p>
                  ) : null}
                </Field>
              ) : null}
              {FEATURES.retention && eyesFee ? (
                <div className="rounded-sm border border-primary/20 bg-primary/5 p-4 text-sm">
                  <p className="font-medium text-foreground">Settlement in $EYES (Base)</p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {eyesFee.eyesCost.toLocaleString()} $EYES on Base (all networks) · charged only
                    after deploy + LP succeed · {eyesFee.burnAmount.toLocaleString()} burned ·{' '}
                    {LAUNCH_FEE_EYES.eyesDiscountPercent}% base discount · tier {tier.name}
                  </p>
                  {!hasToken ? (
                    <p className="mt-2 text-xs text-destructive">$EYES token not configured.</p>
                  ) : feeCheckLoading ? (
                    <p className="mt-2 text-xs text-muted-foreground">
                      Checking for reusable launch fee credit…
                    </p>
                  ) : isConnected && balance < eyesFee.eyesCost && !reusableLaunchFee ? (
                    <p className="mt-2 text-xs text-destructive">
                      Need {eyesFee.eyesCost.toLocaleString()} $EYES on Base — send to your Eyes
                      wallet above (same for all launch networks).
                    </p>
                  ) : reusableLaunchFee ? (
                    <p className="mt-2 text-xs text-primary">
                      Reusable $EYES credit from a prior attempt — no second payment if launch
                      succeeds.
                    </p>
                  ) : isConnected && !hasGasForLaunch ? (
                    <p className="mt-2 text-xs text-destructive">
                      Need at least{' '}
                      {launchChain.key === 'solana' ? minSolGas : minEthGas}{' '}
                      {launchChain.nativeSymbol} on {launchChain.label}
                      {launchChain.deployEnabled && lpNativeAmount > 0
                        ? ` plus ${lpNativeAmount} ${launchChain.nativeSymbol} for LP seed`
                        : ''}{' '}
                      — send to your Eyes wallet above.
                    </p>
                  ) : eyesSettlementReady ? (
                    <p className="mt-2 text-xs text-primary">
                      Ready — if launch fails, your $EYES stay put. Fee settles only after success.
                    </p>
                  ) : null}
                </div>
              ) : null}
              <div className="flex flex-wrap gap-2">
                <Chip>Trading fee: {TOKENOMICS.tradingFee}</Chip>
                <Chip>Fee split: {TOKENOMICS.feeSplit}</Chip>
                <Chip>LP lock: {TOKENOMICS.lpLock}</Chip>
              </div>
            </div>
          </section>

          <section className="rounded-sm border border-border bg-surface p-6">
            <label className="flex cursor-pointer items-start gap-3">
              <input
                type="checkbox"
                checked={form.agreed}
                onChange={(e) => update('agreed', e.target.checked)}
                className="mt-1 h-4 w-4 rounded-sm border-border accent-primary"
              />
              <span className="text-sm text-muted-foreground">
                I understand this deploys on {launchChain.label}, uses my Eyes wallet, settles $EYES
                on Base, carries smart-contract risk, and is not financial advice.
              </span>
            </label>
          </section>
        </div>

        <aside className="lg:sticky lg:top-24 lg:self-start">
          <div className="rounded-sm border border-border bg-surface p-6">
            <div className="flex items-center justify-between">
              <span className="font-mono-label text-primary">Preview</span>
              <span className="rounded-sm border border-border bg-background px-2 py-0.5 text-xs text-muted-foreground">
                Preview
              </span>
            </div>
            <div className="mt-6 flex flex-col items-center text-center">
              <div className="grid h-16 w-16 place-items-center rounded-full border border-primary/40 bg-primary/10 font-display text-xl font-bold text-primary">
                {previewInitials}
              </div>
              <h3 className="mt-4 font-display text-lg font-bold text-foreground">
                {form.name.trim() || 'Token name'}
              </h3>
              <p className="font-mono-label text-muted-foreground">
                ${previewSymbol}
              </p>
              {form.description ? (
                <p className="mt-3 line-clamp-3 text-sm text-muted-foreground">
                  {form.description}
                </p>
              ) : null}
              <p className="mt-4 text-xs text-muted-foreground">
                Network: {launchChain.label} · Eyes Window: {windowLabel}
              </p>
              <ol className="mt-4 w-full space-y-2 text-left text-xs text-muted-foreground">
                <li className="flex gap-2">
                  <span className="text-primary">1.</span> Deploy on {launchChain.shortLabel}
                </li>
                <li className="flex gap-2">
                  <span className="text-primary">2.</span> Seed LP → {launchChain.tradingAppLabel}
                </li>
                <li className="flex gap-2">
                  <span className="text-primary">3.</span> Eyes Window
                </li>
                <li className="flex gap-2">
                  <span className="text-primary">4.</span> Trading
                </li>
              </ol>
            </div>
          </div>
        </aside>
      </div>

      {submitState === 'success' ? (
        <div className="rounded-sm border border-primary/40 bg-primary/5 p-6 text-center">
          <Check className="mx-auto h-8 w-8 text-primary" />
          <h3 className="mt-3 font-display text-lg font-bold text-foreground">
            {launchResult
              ? launchResult.discoveryRegistered
                ? `Live on ${launchChain.label}`
                : `Live on ${launchChain.label} — finish discovery`
              : 'Launch saved'}
          </h3>
          <p className="mt-2 text-sm text-muted-foreground">
            {launchResult
              ? launchResult.discoveryRegistered
                ? `$${previewSymbol} · LP seeded · listed on Eyes Open`
                : `$${previewSymbol} deployed on-chain. Token works on ${launchChain.tradingAppLabel} — add to discovery list below.`
              : `Preview saved for ${address ? truncateAddress(address) : 'your wallet'}.`}
          </p>
          {!launchResult?.discoveryRegistered && pendingRegistration ? (
            <div className="mt-4 space-y-3">
              <p className="text-xs text-amber-400">
                Your token is live on {launchChain.label}. Discovery listing failed — retry without
                redeploying.
              </p>
              <button
                type="button"
                onClick={retryDiscoveryRegistration}
                disabled={retryingDiscovery}
                className="inline-flex min-h-10 items-center justify-center gap-2 rounded-sm border border-primary/40 bg-primary/10 px-4 py-2 text-sm font-medium text-primary disabled:opacity-50"
              >
                {retryingDiscovery ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Retrying…
                  </>
                ) : (
                  'Retry discovery registration'
                )}
              </button>
            </div>
          ) : null}
          {launchResult ? (
            <div className="mt-3 flex justify-center">
              <CopyAddressInline address={launchResult.token} />
            </div>
          ) : null}
          {launchResult ? (
            <div className="mt-4 flex flex-col items-center gap-2 sm:flex-row sm:justify-center">
              <a
                href={launchResult.fomoUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex min-h-10 items-center justify-center rounded-sm border border-primary/40 bg-primary/10 px-5 py-2 text-sm font-medium text-primary hover:bg-primary/20"
              >
                Trade on {launchChain.tradingAppLabel} →
              </a>
              <Link
                href={ROUTES.appLaunchDetail(
                  getLaunchRecordId(launchChain.key, launchResult.launchId),
                )}
                className="inline-flex min-h-10 items-center justify-center text-sm font-medium text-primary hover:underline"
              >
                Launch details
              </Link>
            </div>
          ) : (
            <Link
              href={ROUTES.appLaunches}
              className="mt-4 inline-flex text-sm font-medium text-primary hover:underline"
            >
              View launches →
            </Link>
          )}
        </div>
      ) : submitState === 'error' ? (
        <div className="rounded-sm border border-destructive/40 bg-destructive/10 p-6 text-center text-sm text-destructive">
          {feeNote ??
            `Launch deploy failed. Unlock your Eyes wallet and confirm $EYES on Base plus ${launchChain.nativeSymbol} on ${launchChain.label}.`}
        </div>
      ) : (
        <div className="sticky bottom-0 -mx-6 border-t border-border bg-background/95 px-6 py-4 backdrop-blur lg:static lg:mx-0 lg:border-0 lg:bg-transparent lg:p-0 lg:backdrop-blur-none">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-xs text-muted-foreground">
              {feeNote ??
                (deployGates.ready
                  ? launchChain.deployEnabled
                    ? `Deploy + seed LP on ${launchChain.label}`
                    : launchChain.comingSoon
                      ? `${launchChain.label} deploy coming soon — form ready`
                      : eyesSettlementReady
                        ? 'Preview mode — $EYES fee only'
                        : `Ready — on-chain deploy pending factory wiring`
                  : deployGates.blockingMessage ?? 'Complete the form to deploy')}
            </p>
            <button
              type="button"
              onClick={handleDeploy}
              disabled={!canSubmit}
              className="inline-flex min-h-11 items-center justify-center gap-2 rounded-sm border border-primary/40 bg-primary/10 px-6 py-2.5 text-sm font-medium text-primary transition-all hover:border-primary/70 hover:bg-primary/20 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {submitState === 'loading' ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Deploying…
                </>
              ) : launchChain.deployEnabled ? (
                'Deploy launch'
              ) : (
                `${launchChain.label} coming soon`
              )}
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

function Field({
  label,
  children,
}: {
  label: string
  children: React.ReactNode
}) {
  return (
    <div>
      <label className="font-mono-label text-[0.58rem] text-muted-foreground">
        {label}
      </label>
      <div className="mt-2">{children}</div>
    </div>
  )
}

function Chip({ children }: { children: React.ReactNode }) {
  return (
    <span className="rounded-sm border border-border bg-background px-2.5 py-1 text-xs text-muted-foreground">
      {children}
    </span>
  )
}

const inputClass =
  'w-full rounded-sm border border-border bg-background px-3 py-2.5 text-sm text-foreground outline-none transition-colors placeholder:text-muted-foreground/60 focus:border-primary/50 focus:ring-2 focus:ring-primary/20'
