import type { LegalDocument } from './types'

export const trustVerification: LegalDocument = {
  slug: 'trust-verification',
  title: 'Trust & verification',
  description:
    'How to verify Eyes Open is real, what is live on Base mainnet, our security posture, and what we do differently from anonymous daily launches.',
  summary:
    'Verify addresses, understand platform mechanics, audit status, and admin keys before you transact.',
  sections: [
    {
      id: 'honesty',
      title: 'Start here: we are not “audited” yet',
      paragraphs: [
        'Most new tokens and launchpads ship without a third-party audit. We will not claim one until a report is published and linked on this site.',
        'That does not mean “trust us blindly.” It means you should verify addresses on BaseScan, read the risk disclosure, and only participate with money you can lose. Transparency is our substitute for a $20k audit badge—until we can afford the real thing.',
      ],
    },
    {
      id: 'deployed',
      title: 'What is live on Base mainnet (chain ID 8453)',
      paragraphs: [
        '$EYES is deployed with a fixed 1B supply minted once to the published platform treasury. There is no admin mint function on the token contract.',
        'The launch stack (factory, fee collector, fee router, liquidity locker, buy-and-burn executor) is deployed on Base and wired into eyesopen.to. Fair launches use /app/create when the factory env address matches BaseScan.',
      ],
      bullets: [
        'Platform treasury ($EYES inventory): 0x3dFf4ADfA6d7482e3fFB362Aa9d6370bCC45c4b5',
        '$EYES token: 0xC845770d0f437B93886E152566EE926Aa9153C9e',
        'Always confirm factory and fee collector addresses from the live table at /legal—not from DMs, screenshots, or unofficial posts.',
      ],
    },
    {
      id: 'verify-steps',
      title: 'Verify before you participate (5 minutes)',
      paragraphs: [
        'Do this once before sending funds or using /app/create. If any step fails, stop and use official channels only.',
      ],
      bullets: [
        'Open eyesopen.to/legal and compare contract addresses to what you are about to interact with.',
        'On BaseScan, confirm you are on Base mainnet (8453), not a testnet or another chain.',
        'For $EYES: open the token contract → read contract → confirm total supply and that the published treasury address holds the minted supply.',
        'For the launch factory: call owner() on BaseScan and confirm it matches our published Gnosis Safe (when ownership transfer is marked complete on site).',
        'Bookmark official links only. Phishing sites copy our UI with different addresses.',
      ],
    },
    {
      id: 'controls',
      title: 'What we can and cannot change',
      paragraphs: [
        'Understanding admin power helps you judge risk without an audit PDF.',
      ],
      bullets: [
        'Cannot: mint more $EYES (fixed supply at deploy).',
        'Cannot: recover tokens you sent to the wrong address.',
        'Can (via platform admin / Safe): enable or configure launch factory settings, fee routing, and buy-and-burn executor parameters on the deployed stack.',
        'Treasury wallet: holds $EYES inventory for platform operations—separate from contract owner() fields. Monitor its public balance on BaseScan.',
        'Public DEX liquidity: not seeded until we announce public trading launch. Until then, $EYES is not freely tradable on a DEX via our LP.',
      ],
    },
    {
      id: 'different',
      title: 'How this differs from most daily launches',
      paragraphs: [
        'Anonymous teams hide admin keys and mint functions. We publish addresses and keep platform flows verifiable.',
      ],
      bullets: [
        'Published treasury and contract addresses on-site—not “trust the CA in Telegram.”',
        'Fixed token supply; no hidden mint on $EYES.',
        'Platform admin on factory/fees moved to a Gnosis Safe (multisig) for operational control.',
        'On-chain treasury activity is observable on BaseScan.',
        'Honest “not audited yet” stance instead of a fake CertiK badge.',
        'Liquidity locker contracts exist for when we seed LP—locks are part of the stack design.',
      ],
    },
    {
      id: 'audit',
      title: 'Security audit posture',
      paragraphs: [
        'An independent audit of the core launch stack is planned before public DEX liquidity and full-scale platform marketing—not because every new project has one, but because it is the right milestone before more capital sits in automated contracts.',
        'Until NEXT_PUBLIC_AUDIT_REPORT_URL is set on production, treat smart contracts as experimental software.',
      ],
      bullets: [
        'Now: automated static analysis in CI, internal review, and public address transparency.',
        'Planned: scoped third-party review of factory + fee path before full public scale.',
        'When published: report link appears on /legal and in the on-chain status panel automatically.',
        'Optional interim: NEXT_PUBLIC_AUDIT_IN_PROGRESS=true when an audit is booked but not finished.',
      ],
    },
    {
      id: 'admin',
      title: 'Admin keys & Gnosis Safe',
      paragraphs: [
        'Deployer EOA deployed contracts. Ownable admin on the launch factory, fee collector, and fee router is transferred to the published Gnosis Safe on Base when ownership transfer is complete.',
        'The $EYES token uses OpenZeppelin Ownable but has no owner-only mint or pause functions—only transferOwnership() exists. Operational control of the platform is on the factory/fee contracts, not token owner().',
        'Do not confuse treasury (funds) with contract owner (admin). They are different addresses by design.',
      ],
    },
    {
      id: 'milestones',
      title: 'Roadmap milestones (trust-relevant)',
      paragraphs: [
        'We scale public risk in stages instead of flipping everything live at once.',
      ],
      bullets: [
        'Pre-launch: treasury + token live; factory admin on Safe; no public LP required.',
        'Before public DEX LP: external audit or scoped review + public report link.',
        'Full platform scale: liquidity seeding with locker, monitored factory volume, bug bounty consideration.',
      ],
    },
    {
      id: 'red-flags',
      title: 'Red flags — stop if you see these',
      paragraphs: [
        'If anyone claiming to be Eyes Open does the following, it is a scam:',
      ],
      bullets: [
        'A “new official” contract address in DMs or Discord DMs.',
        'Requests to send funds to a wallet that is not the published treasury.',
        'Pressure to “ape before audit” with unaudited contracts not listed on /legal.',
        'Seed phrases, “verification sync,” or wallet connect on unofficial domains.',
        'Promises of guaranteed returns or “risk-free” participation.',
      ],
    },
    {
      id: 'contact',
      title: 'Questions & reports',
      paragraphs: [
        'Security concerns about published contracts: use official Discord/Telegram linked from eyesopen.to only.',
        'We welcome responsible disclosure of bugs in deployed contracts; critical findings may qualify for a bounty once a formal program is announced.',
      ],
    },
  ],
}
