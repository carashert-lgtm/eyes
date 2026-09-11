import { SITE_URL } from '@/lib/chain-config'

export function getLaunchApiDocs() {
  const base = SITE_URL.replace(/\/$/, '')
  return {
    version: '1.0.0',
    title: 'Eyes Open Launch API',
    description:
      'Public REST API for fair launch discovery — the first launchpad with a documented, key-based launch feed API.',
    baseUrl: `${base}/api/v1`,
    authentication: {
      type: 'bearer',
      header: 'Authorization: Bearer eok_live_…',
      alternateHeader: 'X-Eyes-Api-Key: eok_live_…',
      keysUrl: `${base}/app/settings#developer-api`,
    },
    rateLimits: {
      anonymous: '60 requests / minute / IP',
      withApiKey: '300 requests / minute / key',
    },
    endpoints: [
      {
        method: 'GET',
        path: '/launches',
        scope: 'launches:read (optional — higher limits with key)',
        description: 'List ranked launches from Base, Ethereum, and Solana factories.',
        query: ['filter', 'sort', 'q', 'limit', 'chain'],
      },
      {
        method: 'GET',
        path: '/launches/{id}',
        scope: 'launches:read',
        description: 'Single launch by id (e.g. base-launch-1, solana-launch-1).',
      },
      {
        method: 'GET',
        path: '/launches/mine',
        scope: 'account:read',
        description: 'Launches created by the wallet tied to your API key account.',
      },
      {
        method: 'GET',
        path: '/docs',
        scope: 'none',
        description: 'This document.',
      },
    ],
    webhooks: {
      description:
        'Configure a launch webhook in Settings to receive POST payloads when your launches go live.',
      events: ['launch.created', 'launch.discovery_registered'],
    },
  }
}
