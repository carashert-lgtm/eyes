# Testnet Operator Guide

Operational runbook for running Eyes Open on **Base Sepolia**. No frontend required.

---

## Prerequisites

| Requirement | Notes |
|-------------|--------|
| [Foundry](https://book.getfoundry.sh/) | `forge`, `cast` |
| Base Sepolia ETH | [Alchemy faucet](https://www.alchemy.com/faucets/base-sepolia) |
| `.env` file | Copy from `.env.example` |

---

## Required environment variables

```env
BASE_SEPOLIA_RPC_URL=https://sepolia.base.org
DEPLOYER_PRIVATE_KEY=0x...
EYES_TREASURY=0xYourDeployerAddress
```

After deploy, merge auto-generated `deployments/base-sepolia.env` into `.env`.

---

## Full testnet cycle (recommended order)

### 0. Build & unit tests

```bash
forge install OpenZeppelin/openzeppelin-contracts foundry-rs/forge-std --no-commit
forge build
forge test
```

Windows:

```powershell
.\scripts\deploy-base-sepolia.ps1 -Step build
```

### 1. Deploy platform

```powershell
.\scripts\deploy-base-sepolia.ps1 -Step deploy
```

**Outputs:**
- `deployments/base-sepolia.json` — all contract addresses
- `deployments/base-sepolia.env` — paste into `.env`

**Pre-flight checks (automatic):**
- Chain ID matches Base Sepolia when applicable
- Broadcaster ETH balance ≥ 0.005 ETH
- DEX router has bytecode on-chain

### 2. Seed $EYES/WETH pool

Required before buy & burn works.

```powershell
.\scripts\deploy-base-sepolia.ps1 -Step seed
```

**Pre-flight checks:**
- `EYES_TOKEN` resolves from `.env` or JSON
- Treasury holds enough $EYES
- Broadcaster has ETH for LP + gas

### 3. End-to-end demo

Creates test launch → locks LP → swap → buy & burn.

```powershell
.\scripts\deploy-base-sepolia.ps1 -Step e2e
```

### 4. Verify deployment (read-only)

```powershell
.\scripts\deploy-base-sepolia.ps1 -Step verify
```

Prints: launch count, burn queue, keeper readiness, supply.

### 5. Run keeper (repeatable)

Safe to cron every N minutes:

```powershell
.\scripts\deploy-base-sepolia.ps1 -Step keeper
```

Skips automatically if burn queue < `minProceedsEth`.

---

## One-command full cycle

```powershell
.\scripts\deploy-base-sepolia.ps1 -Step all
```

Runs: deploy → seed → e2e → verify.

---

## Launch policy controls (owner only)

Via `cast` or a future admin script:

```bash
# Pause all new launches
cast send $EYES_FACTORY "setLaunchesEnabled(bool)" false --rpc-url $BASE_SEPOLIA_RPC_URL --private-key $DEPLOYER_PRIVATE_KEY

# Enable launcher whitelist
cast send $EYES_FACTORY "setLauncherWhitelistEnabled(bool)" true ...

# Approve a launcher
cast send $EYES_FACTORY "setLauncherApproved(address,bool)" $LAUNCHER true ...
```

---

## Keeper operations

| View | Command |
|------|---------|
| Burn queue status | `cast call $EYES_BUY_BURN_EXECUTOR "burnQueueStatus()"` |
| Pending ETH | `cast call $EYES_FEE_COLLECTOR "accumulatedBurnProceeds()"` |
| Run burn (manual) | `.\scripts\deploy-base-sepolia.ps1 -Step keeper` |

**Contract entrypoints:**
- `executeBuyAndBurnAuto()` — quotes DEX, applies slippage guard, burns
- `executeBuyAndBurnIfReady(minOut)` — manual slippage floor
- `burnQueueStatus()` — keeper bot polling

**Admin (fee collector owner):**
- `executor.setMinProceedsEth(amount)` — minimum queue before keeper runs
- `executor.setMaxSlippageBps(bps)` — auto slippage cap (max 1000)

---

## Transfer ownership to multisig

Before mainnet, move admin from deployer EOA to Gnosis Safe:

```env
NEW_OWNER=0xYourGnosisSafeAddress
```

```powershell
.\scripts\deploy-base-sepolia.ps1 -Step transfer
```

See **`docs/OWNERSHIP.md`** for full checklist.

---

## Verification checklist

After each cycle confirm:

- [ ] `deployments/base-sepolia.json` exists and addresses have code on BaseScan
- [ ] `verify` shows `launchesEnabled = true` (or intentionally false)
- [ ] EYES/WETH pair exists on Uniswap V2 factory
- [ ] Test launch LP balance in `EyesLiquidityLocker` > 0
- [ ] Swap via `EyesFeeRouter` increases `accumulatedBurnProceeds`
- [ ] Keeper run reduces `$EYES` total supply

Base Sepolia explorer: https://sepolia.basescan.org

---

## Troubleshooting

| Error | Fix |
|-------|-----|
| `PreflightFailed: Broadcaster balance too low` | Fund wallet from faucet |
| `Missing deployments/base-sepolia.json` | Run deploy step first |
| `Treasury lacks EYES balance` | Ensure `EYES_TREASURY` received 1B at deploy |
| `Launches disabled` | `setLaunchesEnabled(true)` on factory |
| `BelowMinProceeds` on keeper | Wait for more swap fees or lower `minProceedsEth` |
| `DEX router has no bytecode` | Wrong chain or bad `UNISWAP_V2_ROUTER` |

---

## Base Sepolia reference addresses

| Contract | Address |
|----------|---------|
| Chain ID | 84532 |
| Uniswap V2 Router | `0x1689E7B1F10000AE47eBfE339a4f69dECd19F602` |
| Uniswap V2 Factory | `0x7Ae58f10f7849cA6F5fB71b7f45CB416c9204b1e` |

---

## What remains before mainnet

- [ ] External security audit
- [ ] Multisig owns all Ownable contracts
- [ ] Timelock on critical factory/collector admin actions
- [ ] Platform EYES/WETH LP lock policy decided
- [ ] Keeper bot deployed with monitoring/alerts
- [ ] Launch whitelist policy finalized
- [ ] Bug bounty + incident response plan

---

## Step 5 (recommended)

1. **Indexer/subgraph** — launches, locks, fees, burns for ops dashboard
2. **Keeper service** — small Node/Python cron calling `RunKeeper.s.sol` or direct RPC
3. **Admin CLI** — launch policy, window close, verification in one tool
4. **Frontend** — only after testnet is stable for 2+ weeks
