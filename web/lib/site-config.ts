import { ACTIVE_CHAIN_ID, ACTIVE_CHAIN_NAME, APP_ENV, IS_LOCAL_ANVIL } from '@/lib/chain-config'
import { getEyesTokenAddress } from '@/lib/eyes-token-config'
import { getLaunchEndIso } from '@/lib/launch-config'
import { PLATFORM_STATUS } from '@/lib/platform-status'

export const BRAND = {
  name: 'Eyes Open',
  ticker: '$EYES',
  slogan: 'Eyes Open. No Snipers. No Games.',
  tagline: 'Fair launch infrastructure on Base, Ethereum, and Solana',
} as const

export const ROUTES = {
  home: '/',
  tokenomics: '/tokenomics',
  app: '/app',
  appCreate: '/app/create',
  appLaunches: '/app/launches',
  appLaunchDetail: (id: string) => `/app/launches/${id}`,
  appUtility: '/app/utility',
  appProfile: '/app/profile',
  appSettings: '/app/settings',
  appLeaderboard: '/app/leaderboard',
  appPool: '/app/pool',
  team: '/team',
  teamActivate: '/team/activate',
  teamPool: '/team/pool',
  legal: '/legal',
  legalTrust: '/legal/trust-verification',
  legalTerms: '/legal/terms',
  legalPrivacy: '/legal/privacy',
  legalRisk: '/legal/risk-disclosure',
  legalCookies: '/legal/cookies',
  legalAi: '/legal/ai',
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
  eyesToken: getEyesTokenAddress(),
  launchFactory: process.env.NEXT_PUBLIC_LAUNCH_FACTORY_ADDRESS ?? '',
  feeCollector: process.env.NEXT_PUBLIC_FEE_COLLECTOR_ADDRESS ?? '',
} as const

const launchFactoryConfigured = Boolean(
  process.env.NEXT_PUBLIC_LAUNCH_FACTORY_ADDRESS?.trim(),
)

const ethereumLaunchFactoryConfigured = Boolean(
  process.env.NEXT_PUBLIC_LAUNCH_FACTORY_ETHEREUM?.trim(),
)

export const FEATURES = {
  /** Real wallet connect via wagmi — UI shell only until true */
  walletConnect: process.env.NEXT_PUBLIC_FEATURE_WALLET === 'true',
  /** On-chain createLaunch tx — enabled when flag is true or a mainnet factory is wired */
  createLaunchDeploy:
    process.env.NEXT_PUBLIC_FEATURE_CREATE_LAUNCH === 'true' ||
    (APP_ENV === 'production' &&
      (launchFactoryConfigured || ethereumLaunchFactoryConfigured)),
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
  /** Email updates tied to Eyes wallet accounts */
  accountUpdates: process.env.NEXT_PUBLIC_FEATURE_ACCOUNT === 'true',
} as const

export const STATUS = PLATFORM_STATUS

/** Public launch countdown target (ISO UTC). */
export const LAUNCH_END_ISO: string | null = getLaunchEndIso()

export const NAV_LINKS = [
  { label: 'Problem', href: '#problem' },
  { label: 'Solution', href: '#solution' },
  { label: 'How it works', href: '#how-it-works' },
  { label: 'Tokenomics', href: ROUTES.tokenomics },
  { label: 'Features', href: '#features' },
] as const

export const APP_NAV_LINKS = [
  { label: 'Dashboard', href: ROUTES.app },
  { label: 'Discover', href: ROUTES.appLaunches },
  { label: 'Leaderboard', href: ROUTES.appLeaderboard },
  { label: 'Utility', href: ROUTES.appUtility },
  { label: 'Profile', href: ROUTES.appProfile },
  { label: 'Settings', href: ROUTES.appSettings },
  { label: 'Create Launch', href: ROUTES.appCreate },
] as const

export const TOKENOMICS = {
  tradingFee: '1%',
  feeSplit: '50% creator / 50% buy & burn $EYES',
  lpLock: '100%',
  supply: '1,000,000,000',
} as const
