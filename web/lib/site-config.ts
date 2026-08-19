import {
  ACTIVE_CHAIN_ID,
  ACTIVE_CHAIN_NAME,
  APP_ENV,
  IS_LOCAL_ANVIL,
} from '@/lib/chain-config'

export const BRAND = {
  name: 'Eyes Open',
  ticker: '$EYES',
  slogan: 'Eyes Open. No Snipers. No Games.',
  tagline: 'Fair launch infrastructure on Base',
} as const

export const ROUTES = {
  home: '/',
  tokenomics: '/tokenomics',
  launchSupport: '/launch-support',
  presale: '/presale',
  app: '/app',
  appCreate: '/app/create',
  appLaunches: '/app/launches',
  appUtility: '/app/utility',
  appProfile: '/app/profile',
  appLeaderboard: '/app/leaderboard',
  appPool: '/app/pool',
  team: '/team',
  teamActivate: '/team/activate',
  teamPool: '/team/pool',
  legal: '/legal',
  legalTerms: '/legal/terms',
  legalPrivacy: '/legal/privacy',
  legalRisk: '/legal/risk-disclosure',
  legalCookies: '/legal/cookies',
  legalAi: '/legal/ai',
  /** @deprecated use presale */
  appSupport: '/presale',
} as const

/** Replace placeholders when social accounts are live. */
export const SOCIAL_LINKS = {
  x: process.env.NEXT_PUBLIC_SOCIAL_X ?? 'https://x.com/eyesopenlaunch',
  telegram: process.env.NEXT_PUBLIC_SOCIAL_TELEGRAM ?? 'https://t.me/+WGZTDwqoswNlODMx',
  discord: process.env.NEXT_PUBLIC_SOCIAL_DISCORD ?? '',
} as const

export const SOCIAL_PLACEHOLDER = 'Set NEXT_PUBLIC_SOCIAL_* in env or edit lib/site-config.ts'

export function isSocialConfigured(url: string | undefined): url is string {
  return Boolean(url && url !== '#' && !url.includes('YOUR_'))
}

export const CONTRACTS = {
  chainId: ACTIVE_CHAIN_ID,
  chainName: ACTIVE_CHAIN_NAME,
  eyesToken: process.env.NEXT_PUBLIC_EYES_TOKEN_ADDRESS ?? '',
  launchFactory: process.env.NEXT_PUBLIC_LAUNCH_FACTORY_ADDRESS ?? '',
  feeCollector: process.env.NEXT_PUBLIC_FEE_COLLECTOR_ADDRESS ?? '',
} as const

export const FEATURES = {
  /** Real wallet connect via wagmi — UI shell only until true */
  walletConnect: process.env.NEXT_PUBLIC_FEATURE_WALLET === 'true',
  /** On-chain createLaunch tx */
  createLaunchDeploy: process.env.NEXT_PUBLIC_FEATURE_CREATE_LAUNCH === 'true',
  /** Launch support contribution tx */
  launchSupportContribute:
    process.env.NEXT_PUBLIC_FEATURE_LAUNCH_SUPPORT === 'true',
  /** Live on-chain stats on dashboard */
  liveStats: process.env.NEXT_PUBLIC_FEATURE_LIVE_STATS === 'true',
  /** Retention systems master flag */
  retention: process.env.NEXT_PUBLIC_FEATURE_RETENTION === 'true',
  /** Discovery feed + rankings */
  discovery: process.env.NEXT_PUBLIC_FEATURE_RETENTION === 'true' ||
    process.env.NEXT_PUBLIC_FEATURE_DISCOVERY === 'true',
  /** $EYES utility center + stake tiers */
  utilityCenter: process.env.NEXT_PUBLIC_FEATURE_RETENTION === 'true' ||
    process.env.NEXT_PUBLIC_FEATURE_UTILITY === 'true',
} as const

export const STATUS = {
  network: IS_LOCAL_ANVIL ? 'Local' : APP_ENV === 'production' ? 'Mainnet' : 'Testnet',
  networkDetail: IS_LOCAL_ANVIL
    ? `${ACTIVE_CHAIN_NAME} · chain ${ACTIVE_CHAIN_ID}`
    : APP_ENV === 'production'
      ? `${ACTIVE_CHAIN_NAME} · chain ${ACTIVE_CHAIN_ID}`
      : 'Base Sepolia · pre-mainnet',
  wiringBadge: IS_LOCAL_ANVIL
    ? 'Local Anvil · chain 31337'
    : APP_ENV === 'production'
      ? 'Production'
      : 'Staging · testnet',
} as const

export const LAUNCH_END_ISO: string | null =
  process.env.NEXT_PUBLIC_LAUNCH_END_ISO ?? null

export const NAV_LINKS = [
  { label: 'Problem', href: '#problem' },
  { label: 'Solution', href: '#solution' },
  { label: 'How it works', href: '#how-it-works' },
  { label: 'Tokenomics', href: ROUTES.tokenomics },
  { label: 'Presale', href: ROUTES.presale },
  { label: 'Features', href: '#features' },
] as const

export const APP_NAV_LINKS = [
  { label: 'Dashboard', href: ROUTES.app },
  { label: 'Discover', href: ROUTES.appLaunches },
  { label: 'Leaderboard', href: ROUTES.appLeaderboard },
  { label: 'Utility', href: ROUTES.appUtility },
  { label: 'Create Launch', href: ROUTES.appCreate },
  { label: 'Presale', href: ROUTES.presale },
] as const

export const TOKENOMICS = {
  tradingFee: '1%',
  feeSplit: '50% creator / 50% buy & burn $EYES',
  lpLock: '100%',
  supply: '1,000,000,000',
} as const

export const LAUNCH_SUPPORT = {
  windowDays: 14,
  /** Placeholder for UI until backend provides real day */
  currentDay: 1,
} as const
