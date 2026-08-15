# Eyes Open ($EYES) - Fair Launch Pad

**Start here:** [`docs/WINDOWS_SETUP.md`](docs/WINDOWS_SETUP.md)

**Eyes Open** is a fair-launch platform where every token gets an **Eyes Window** (gated buy period), **100% locked liquidity**, and trading fees that **buy & burn** the platform token **$EYES**.

---

## Implemented so far

### Step 1 — Core tokenomics
| Contract | Purpose |
|----------|---------|
| `EyesToken` | Platform token **$EYES** — fixed **1B** supply |
| `EyesLaunchToken` | Per-launch token with Eyes Window gating |
| `EyesLaunchFactory` | Creates launches + coordinates modules |
| `EyesFeeCollector` | Splits trading fees per launch |

### Step 2 — Liquidity, fees, buy & burn
| Contract | Purpose |
|----------|---------|
| `EyesLiquidityLocker` | **Permanent** LP custody (no withdraw function) |
| `EyesLiquiditySeeder` | Uniswap V2 `addLiquidityETH` + lock 100% LP |
| `EyesFeeRouter` | Swap wrapper skimming **1%** fee to collector |
| `EyesBuyBurnExecutor` | Swaps queued ETH → $EYES and **burns** |

### Step 3 — Base Sepolia scripts
| Script | Purpose |
|--------|---------|
| `script/DeployEyes.s.sol` | Deploy full stack + write `deployments/base-sepolia.json` |
| `script/SeedEyesLiquidity.s.sol` | Seed $EYES/WETH platform pool |
| `script/EyesE2EDemo.s.sol` | Full launch → lock → swap → buy & burn demo |
| `scripts/deploy-base-sepolia.ps1` | Windows helper for all steps |

---

## Folder structure

```
eyes-launchpad/
├── README.md
├── docs/
│   ├── ARCHITECTURE.md
│   └── STEP2.md
├── src/
│   ├── EyesToken.sol
│   ├── EyesLaunchToken.sol
│   ├── EyesLaunchFactory.sol
│   ├── EyesFeeCollector.sol
│   ├── EyesTypes.sol
│   ├── dex/interfaces/IUniswapV2.sol
│   ├── liquidity/
│   │   ├── EyesLiquidityLocker.sol
│   │   └── EyesLiquiditySeeder.sol
│   ├── trading/EyesFeeRouter.sol
│   ├── treasury/EyesBuyBurnExecutor.sol
│   └── interfaces/IEyesLaunchpad.sol
├── script/DeployEyes.s.sol
└── test/
    ├── EyesLaunchpad.t.sol
    ├── EyesStep2.t.sol
    └── mocks/
```

---

## Core rules (unchanged)

- **$EYES supply:** 1,000,000,000 (minted once)
- **Eyes Window:** gated buys before open trading
- **100% LP lock:** all LP tokens sent to `EyesLiquidityLocker` forever
- **Trading fee:** 1% on swaps via `EyesFeeRouter`
- **Fee split:** 50% creator payout + 50% buy & burn queue (default per launch)

---

## Setup

```bash
cd eyes-launchpad
forge install OpenZeppelin/openzeppelin-contracts foundry-rs/forge-std --no-commit
forge build
forge test
```

Deploy:

```bash
EYES_TREASURY=0x...
UNISWAP_V2_ROUTER=0x...
forge script script/DeployEyes.s.sol --rpc-url <RPC> --broadcast --private-key <KEY>
```

---

## End-to-end flow (Step 2)

1. **Create launch** — `factory.createLaunch(...)`
2. **Seed + lock LP** — creator calls `factory.seedLiquidity{value: eth}(...)`
3. **Trade with fees** — users swap via `EyesFeeRouter` (not raw DEX router)
4. **Buy & burn** — keeper calls `executor.executeBuyAndBurn(minOut)`

See `docs/STEP2.md` for module details.

---

## Step 3 — Base Sepolia testnet

See **`docs/STEP3.md`** for the full walkthrough.

Quick commands:

```bash
# 1. Deploy
forge script script/DeployEyes.s.sol:DeployEyes --rpc-url base_sepolia --broadcast --private-key $DEPLOYER_PRIVATE_KEY

# 2. Seed EYES/WETH pool (buy & burn path)
forge script script/SeedEyesLiquidity.s.sol:SeedEyesLiquidity --rpc-url base_sepolia --broadcast --private-key $DEPLOYER_PRIVATE_KEY

# 3. End-to-end demo (launch + lock + swap + burn)
forge script script/EyesE2EDemo.s.sol:EyesE2EDemo --rpc-url base_sepolia --broadcast --private-key $DEPLOYER_PRIVATE_KEY
```

Windows: `.\scripts\deploy-base-sepolia.ps1 -Step deploy|seed|e2e|keeper|verify|all`

**Operator guide:** `docs/TESTNET_OPERATOR_GUIDE.md`

---

## Step 4 — Operational readiness

| Addition | Purpose |
|----------|---------|
| Pre-flight checks in all scripts | Balance, chain, router bytecode, deployment file |
| `deployments/base-sepolia.env` | Auto-generated address snippet after deploy |
| `RunKeeper.s.sol` | Repeatable buy & burn (skips if queue too small) |
| `VerifyDeployment.s.sol` | Read-only health check |
| `TransferOwnership.s.sol` | Move admin to Gnosis Safe |
| Launch policy on factory | Kill-switch + launcher whitelist |
| `IEyesKeeper` + `burnQueueStatus()` | Keeper bot polling interface |

---

## Step 5 - Easy local + testnet operations

| Resource | Purpose |
|----------|---------|
| [`docs/WINDOWS_SETUP.md`](docs/WINDOWS_SETUP.md) | Zero-to-deploy Windows guide |
| [`scripts/first-run.ps1`](scripts/first-run.ps1) | One-command first testnet cycle |
| [`script/Doctor.s.sol`](script/Doctor.s.sol) | Pre-flight health check |
| [`docs/TOKENOMICS.md`](docs/TOKENOMICS.md) | Official $EYES fee model (50/50) |
| [`docs/MARKETING_PLAN.md`](docs/MARKETING_PLAN.md) | Go-to-market strategy |
| [`docs/LAUNCH_CHECKLIST.md`](docs/LAUNCH_CHECKLIST.md) | Pre-launch execution checklist |
| [`docs/MESSAGING_KIT.md`](docs/MESSAGING_KIT.md) | Pitches, posts, FAQ copy |
| [`docs/KEEPER_DESIGN.md`](docs/KEEPER_DESIGN.md) | Keeper bot design |
| [`docs/INDEXER_PLAN.md`](docs/INDEXER_PLAN.md) | Event indexing plan |
| [`ops/keeper/`](ops/keeper/) | Keeper scaffold |

Quick start:

```powershell
cd C:\Users\Caras\Downloads\eyes-launchpad
copy .env.example .env
# edit .env
.\scripts\first-run.ps1
```

---

## Next step (Step 6)

- Run 1-2 week testnet soak with `-Step keeper` on a schedule
- Implement indexer scaffold (`ops/indexer/poll_events.py`)
- Transfer ownership to multisig before any mainnet planning
- External audit
- Frontend (last)

---

## License

MIT
