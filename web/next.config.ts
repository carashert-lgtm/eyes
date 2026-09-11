import path from 'path'
import type { NextConfig } from 'next'
import { assertProductionSecrets } from './lib/security/session-secret'

const ANVIL_DEV_TREASURY = '0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266'
const isProdBuild =
  process.env.NEXT_PUBLIC_APP_ENV === 'production' || process.env.VERCEL === '1'

function assertProductionEnv() {
  if (process.env.NEXT_PUBLIC_APP_ENV !== 'production') return

  const errors: string[] = []

  if (process.env.NEXT_PUBLIC_USE_ANVIL === 'true') {
    errors.push('NEXT_PUBLIC_USE_ANVIL must be false in production')
  }

  if (process.env.NEXT_PUBLIC_ANVIL_RPC_URL?.trim()) {
    errors.push('Remove NEXT_PUBLIC_ANVIL_RPC_URL from production (Anvil only)')
  }

  const chainId = process.env.NEXT_PUBLIC_CHAIN_ID ?? '8453'
  if (!['8453', '1'].includes(chainId)) {
    errors.push(`NEXT_PUBLIC_CHAIN_ID must be 8453 (Base) or 1 (Ethereum) — got ${chainId}`)
  }

  if (!process.env.NEXT_PUBLIC_LAUNCH_END_ISO?.trim()) {
    errors.push('NEXT_PUBLIC_LAUNCH_END_ISO is required in production')
  }

  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? ''
  if (siteUrl && !/eyesopen\.to/i.test(siteUrl)) {
    errors.push('NEXT_PUBLIC_SITE_URL should be https://www.eyesopen.to for production deploy')
  }

  const forbiddenPublicSecrets = [
    'NEXT_PUBLIC_PLATFORM_API_SECRET',
    'NEXT_PUBLIC_TEAM_SESSION_SECRET',
    'NEXT_PUBLIC_DISCORD_BOT_TOKEN',
    'NEXT_PUBLIC_PRESALE_DISTRIBUTOR_PRIVATE_KEY',
  ]
  for (const key of forbiddenPublicSecrets) {
    if (process.env[key]?.trim()) {
      errors.push(`${key} must not be set — secrets belong in server env only`)
    }
  }

  if (errors.length > 0) {
    throw new Error(`[production env] ${errors.join('; ')}`)
  }

  assertProductionSecrets()
}

assertProductionEnv()

const securityHeaders = [
  { key: 'X-Frame-Options', value: 'DENY' },
  { key: 'X-Content-Type-Options', value: 'nosniff' },
  { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
  {
    key: 'Permissions-Policy',
    value: 'camera=(), microphone=(), geolocation=(), payment=(), usb=()',
  },
  ...(isProdBuild
    ? [
        {
          key: 'Strict-Transport-Security',
          value: 'max-age=63072000; includeSubDomains; preload',
        },
      ]
    : []),
  {
    key: 'Content-Security-Policy',
    value: [
      "default-src 'self'",
      "script-src 'self' 'unsafe-inline' 'unsafe-eval' https:",
      "style-src 'self' 'unsafe-inline' https:",
      "img-src 'self' data: blob: https:",
      "font-src 'self' data: https:",
      "connect-src 'self' https: wss:",
      "frame-ancestors 'none'",
      "base-uri 'self'",
      "form-action 'self'",
    ].join('; '),
  },
]

const embedHeaders = [
  { key: 'X-Content-Type-Options', value: 'nosniff' },
  {
    key: 'Content-Security-Policy',
    value: [
      "default-src 'self'",
      "style-src 'self' 'unsafe-inline'",
      "img-src 'self' data: https:",
      "font-src 'self' data: https:",
      "connect-src 'self' https:",
      "frame-ancestors *",
      "base-uri 'self'",
    ].join('; '),
  },
]

const nextConfig: NextConfig = {
  async redirects() {
    return [
      { source: '/presale', destination: '/', permanent: false },
      { source: '/presale/:path*', destination: '/', permanent: false },
      { source: '/launch-support', destination: '/', permanent: false },
      { source: '/app/support', destination: '/app', permanent: false },
    ]
  },
  async headers() {
    return [
      {
        source: '/embed/:path*',
        headers: embedHeaders,
      },
      {
        source: '/((?!embed).*)',
        headers: securityHeaders,
      },
    ]
  },
  webpack: (config) => {
    config.resolve.alias = {
      ...config.resolve.alias,
      '@base-org/account': path.resolve(__dirname, 'lib/stubs/empty-module.ts'),
      '@coinbase/cdp-sdk': path.resolve(__dirname, 'lib/stubs/empty-module.ts'),
      '@react-native-async-storage/async-storage': path.resolve(
        __dirname,
        'lib/stubs/empty-module.ts',
      ),
      'pino-pretty': path.resolve(__dirname, 'lib/stubs/empty-module.ts'),
    }
    return config
  },
}

export default nextConfig
