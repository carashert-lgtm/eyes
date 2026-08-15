# Eyes Open — Contract Architecture

## Design goals

- **Modular:** each concern in its own contract
- **Fair launches:** Eyes Window + locked LP + transparent fee routing
- **Platform flywheel:** trading activity → buy & burn $EYES

---

## Module map (Steps 1 + 2)

```
EyesToken ($EYES, 1B fixed)
    ▲
    │ burn
    │
EyesBuyBurnExecutor ◄── ETH ── EyesFeeCollector ◄── fees ── EyesFeeRouter
                              ▲                         │
                              │                         │ swaps
                         EyesLaunchFactory ◄────────────┘
                              │
              ┌───────────────┼───────────────┐
              ▼               ▼               ▼
      EyesLaunchToken  EyesLiquiditySeeder  launch registry
                              │
                    EyesLiquidityLocker (permanent LP)
                              │
                    Uniswap V2 Router (external)
```

---

## Step 1 modules

See original sections for `EyesToken`, `EyesLaunchToken`, `EyesLaunchFactory`, `EyesFeeCollector`.

---

## Step 2 modules

### `EyesLiquidityLocker`

- Receives LP tokens from seeder
- **No withdrawal path** — permanent by omission
- Tracks `LockRecord` per `launchId`

### `EyesLiquiditySeeder`

- Pulls launch tokens from factory
- Calls `router.addLiquidityETH`
- Sends 100% LP to locker
- Calls `factory.finalizeLiquiditySeed`

### `EyesFeeRouter`

- Wraps Uniswap V2 swaps
- Applies `DEFAULT_TOTAL_FEE_BPS` (1%) on input (ETH buys) or output (token sells)
- Forwards fee to collector (50% creator / 50% buy & burn by default); executes remainder on DEX router

### `EyesBuyBurnExecutor`

- Pulls queued ETH from collector
- Swaps to $EYES via configured router path `[WETH, EYES]`
- Burns all purchased tokens

---

## Deployment order

1. `EyesToken`
2. `EyesFeeCollector`
3. `EyesLaunchFactory` + `collector.setFactory`
4. `EyesLiquidityLocker`
5. `EyesLiquiditySeeder` + `locker.setSeeder`
6. `factory.setLiquiditySeeder`
7. `EyesFeeRouter` + authorize on collector + `factory.setFeeRouter`
8. `EyesBuyBurnExecutor` + `collector.setBuyBurnExecutor`

Script: `script/DeployEyes.s.sol`

---

## Security notes

- Factory owner can close Eyes Window and set buy sources — use multisig on mainnet
- Fee router registration prevents unknown tokens from bypassing launch metadata
- Collector rejects fee deposits from unauthorized routers
- Executor slippage controlled via `minEyesOut` parameter
- Locker irreversibility must be communicated clearly to launch creators

---

## Step 3 (testnet)

Scripts in `script/`:
- `DeployEyes.s.sol` — full stack deploy + JSON output
- `SeedEyesLiquidity.s.sol` — platform $EYES/WETH pool
- `EyesE2EDemo.s.sol` — launch → lock → swap → buy & burn

See `docs/STEP3.md`.

---

## Step 4 (next)

- Multisig ownership migration
- Keeper automation for buy & burn
- Subgraph / backend indexer
- Launch permissioning
- Frontend (later)
