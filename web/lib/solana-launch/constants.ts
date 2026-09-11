/** Half of 1B supply with 9 decimals — matches EVM DEFAULT_LP_TOKEN_AMOUNT ratio. */
export const DEFAULT_LP_TOKEN_AMOUNT_SOL = BigInt(500_000_000) * BigInt(10 ** 9)

/** SPL token burn destination (incinerator). */
export const SOLANA_BURN_ADDRESS = '1nc1nerator11111111111111111111111111111111'

export const SOLANA_LP_SUPPLY_BPS = 5000 // 50% of minted supply to LP
