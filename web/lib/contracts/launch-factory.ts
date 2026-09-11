export const LAUNCH_FACTORY_ABI = [
  {
    type: 'function',
    name: 'createLaunch',
    stateMutability: 'nonpayable',
    inputs: [
      {
        name: 'config',
        type: 'tuple',
        components: [
          { name: 'name', type: 'string' },
          { name: 'symbol', type: 'string' },
          { name: 'creator', type: 'address' },
          { name: 'tokenSupply', type: 'uint256' },
          { name: 'eyesWindowDuration', type: 'uint64' },
          { name: 'creatorFeeBps', type: 'uint16' },
          { name: 'burnFeeBps', type: 'uint16' },
        ],
      },
    ],
    outputs: [
      { name: 'token', type: 'address' },
      { name: 'launchId', type: 'uint256' },
    ],
  },
  {
    type: 'function',
    name: 'launchCount',
    stateMutability: 'view',
    inputs: [],
    outputs: [{ name: '', type: 'uint256' }],
  },
  {
    type: 'function',
    name: 'launchesEnabled',
    stateMutability: 'view',
    inputs: [],
    outputs: [{ name: '', type: 'bool' }],
  },
  {
    type: 'function',
    name: 'launcherWhitelistEnabled',
    stateMutability: 'view',
    inputs: [],
    outputs: [{ name: '', type: 'bool' }],
  },
  {
    type: 'function',
    name: 'approvedLaunchers',
    stateMutability: 'view',
    inputs: [{ name: '', type: 'address' }],
    outputs: [{ name: '', type: 'bool' }],
  },
  {
    type: 'function',
    name: 'liquiditySeeder',
    stateMutability: 'view',
    inputs: [],
    outputs: [{ name: '', type: 'address' }],
  },
  {
    type: 'function',
    name: 'getLaunch',
    stateMutability: 'view',
    inputs: [{ name: 'launchId', type: 'uint256' }],
    outputs: [
      {
        name: '',
        type: 'tuple',
        components: [
          { name: 'token', type: 'address' },
          { name: 'creator', type: 'address' },
          { name: 'pair', type: 'address' },
          { name: 'eyesWindowStart', type: 'uint64' },
          { name: 'eyesWindowEnd', type: 'uint64' },
          { name: 'phase', type: 'uint8' },
          { name: 'liquidityLocked', type: 'bool' },
        ],
      },
    ],
  },
  {
    type: 'function',
    name: 'seedLiquidity',
    stateMutability: 'payable',
    inputs: [
      { name: 'launchId', type: 'uint256' },
      { name: 'tokenAmount', type: 'uint256' },
      { name: 'tokenMin', type: 'uint256' },
      { name: 'ethMin', type: 'uint256' },
    ],
    outputs: [
      { name: 'pair', type: 'address' },
      { name: 'lpAmount', type: 'uint256' },
    ],
  },
  {
    type: 'event',
    name: 'LiquiditySeeded',
    inputs: [
      { name: 'launchId', type: 'uint256', indexed: true },
      { name: 'pair', type: 'address', indexed: true },
      { name: 'lpAmount', type: 'uint256', indexed: false },
      { name: 'tokenUsed', type: 'uint256', indexed: false },
      { name: 'ethUsed', type: 'uint256', indexed: false },
    ],
  },
  {
    type: 'event',
    name: 'LaunchCreated',
    inputs: [
      { name: 'launchId', type: 'uint256', indexed: true },
      { name: 'token', type: 'address', indexed: true },
      { name: 'creator', type: 'address', indexed: true },
      { name: 'eyesWindowStart', type: 'uint64', indexed: false },
      { name: 'eyesWindowEnd', type: 'uint64', indexed: false },
    ],
  },
] as const
