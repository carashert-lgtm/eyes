// Set to an ISO datetime string to activate the public launch countdown.
// Example: "2026-09-01T00:00:00.000Z"
// Or set NEXT_PUBLIC_LAUNCH_END_ISO in .env.local
export const LAUNCH_END_ISO: string | null =
  process.env.NEXT_PUBLIC_LAUNCH_END_ISO ?? null

export const NAV_LINKS = [
  { label: 'Problem', href: '#problem' },
  { label: 'Solution', href: '#solution' },
  { label: 'How it works', href: '#how-it-works' },
  { label: 'Tokenomics', href: '/tokenomics' },
  { label: 'Launch support', href: '/launch-support' },
  { label: 'Features', href: '#features' },
] as const
