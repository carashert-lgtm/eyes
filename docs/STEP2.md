# Step 2 — Liquidity, Fee Router, Buy & Burn

## New contracts

| File | Role |
|------|------|
| `src/liquidity/EyesLiquidityLocker.sol` | Permanent LP token vault |
| `src/liquidity/EyesLiquiditySeeder.sol` | Pair + seed + lock orchestration |
| `src/trading/EyesFeeRouter.sol` | Fee-taking swap wrapper |
| `src/treasury/EyesBuyBurnExecutor.sol` | ETH → $EYES swap + burn |
| `src/dex/interfaces/IUniswapV2.sol` | Uniswap V2 router/factory interfaces |

## Updated contracts

- **`EyesLaunchFactory`** — `seedLiquidity()`, `finalizeLiquiditySeed()`, fee router registration
- **`EyesFeeCollector`** — authorized routers, `pullBurnProceeds()`, executor wiring
- **`EyesTypes.LaunchInfo`** — adds `pair` address

---

## How permanent LP lock works

```
Creator ETH + launch tokens
        │
        ▼
EyesLaunchFactory.seedLiquidity()
        │
        ▼
EyesLiquiditySeeder
  ├─ Uniswap V2 Router.addLiquidityETH()
  ├─ receives LP tokens
  └─ transfers ALL LP → EyesLiquidityLocker.lockLiquidity()
        │
        ▼
EyesLiquidityLocker (forever)
  ├─ holds LP ERC-20 balance
  ├─ NO withdraw / unlock / rescue functions
  └─ underlying pair liquidity remains on-chain; only LP receipts are locked
```

**100% lock:** the seeder sends the full LP amount minted by `addLiquidityETH` into the locker. Nothing is retained by the creator or factory.

---

## How fees flow into buy & burn

```
Trader swap (1% fee on input/output)
        │
        ▼
EyesFeeRouter
  ├─ calculates fee = amount × DEFAULT_TOTAL_FEE_BPS / 10_000
  └─ feeCollector.distributeFees(launchId, creator)
        │
        ▼
EyesFeeCollector
  ├─ creatorBps  → 50% — immediate ETH to launch creator
  ├─ burnBps     → 50% — accumulatedBurnProceeds (queued ETH for $EYES buy & burn)
  └─ protocolBps → 0% default (optional field for future use)
        │
        ▼
EyesBuyBurnExecutor.executeBuyAndBurn()
  ├─ pullBurnProceeds() from collector
  ├─ Uniswap V2 swap: ETH → $EYES
  └─ EyesToken.burn(all purchased $EYES)
```

**Important:** swaps must go through **`EyesFeeRouter`**, not the raw DEX router, or fees will not be collected.

---

## Launch sequence (operator)

```solidity
// 1. Create
factory.createLaunch(config);

// 2. Seed + permanently lock LP (creator supplies ETH)
factory.seedLiquidity{value: ethAmount}(launchId, tokenAmount, tokenMin, ethMin);

// 3. Register is automatic via finalizeLiquiditySeed + fee router

// 4. After Eyes Window ends
factory.closeEyesWindow(launchId);

// 5. Periodic buy & burn (keeper)
executor.executeBuyAndBurn(minEyesOut);
```

---

## Target chain DEX note

Step 2 uses **Uniswap V2 Router02** interfaces (`addLiquidityETH`, `swapExactETHForTokensSupportingFeeOnTransferTokens`).

Configure `UNISWAP_V2_ROUTER` in `.env` to a V2-compatible router on your target chain (Base has multiple V2 forks; pick one canonical router per deployment).

---

## Step 3 recommendation

1. Deploy full stack to **Base Sepolia** with real router address
2. Seed **EYES/WETH** liquidity so buy & burn has a live path
3. Run one full fair launch on testnet end-to-end
4. Add **timelock/multisig** on factory owner functions
5. External audit scope: locker irreversibility, fee router accounting, executor slippage

No frontend yet — use Foundry scripts + cast for testnet operations.
