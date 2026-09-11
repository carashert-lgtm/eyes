const rpc = process.env.BASE_MAINNET_RPC_URL ?? ''
console.log(JSON.stringify({
  configured: Boolean(rpc),
  alchemy: rpc.includes('alchemy.com'),
  host: rpc.split('/')[2] ?? null,
}))
