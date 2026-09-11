# Eyes Open — Local Anvil Live Test (No Faucet)

**Official path for full on-chain testing without Base Sepolia faucets, Alchemy, or third-party funding.**

Uses Foundry Anvil on `http://127.0.0.1:8545` (chain ID **31337**) with prefunded test accounts.

---

## Quick start (Windows)

### Terminal 1 — Start Anvil

```powershell
cd C:\Users\Caras\Downloads\eyes-launchpad
.\scripts\start-anvil.ps1
```

Leave this running.

### Terminal 2 — Deploy + full E2E

```powershell
cd C:\Users\Caras\Downloads\eyes-launchpad
.\scripts\local-anvil-first-run.ps1
```

This runs: build → mock DEX → deploy Eyes stack → configure router → seed LP → E2E demo → verify → keeper → sync web env.

### Terminal 3 — Discord bot (optional)

```powershell
cd C:\Users\Caras\Downloads\eyes-launchpad\ops\discord-bot
npm start
```

### Terminal 4 — Website

```powershell
cd C:\Users\Caras\Downloads\eyes-launchpad\web
npm run dev
```

Open `http://localhost:3000/presale` and `http://localhost:3000/app/pool`.

---

## Anvil accounts (prefunded — use these)

| Role | Account | Address | Private key |
|------|---------|---------|-------------|
| **Deployer / treasury / presale recipient** | #0 | `0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266` | `0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80` |
| **Contributor (2nd wallet test)** | #1 | `0x70997970C51812dc3A010C7d01b50e0d17dc79C8` | `0x59c6995e998f97a5a0044966f0945389dc9e86dae88c7a8412f4603b6b786eaf` |

Each account starts with **10,000 ETH**. No faucet. Never use these keys on mainnet.

---

## Step-by-step commands

| Step | Command | What it does |
|------|---------|--------------|
| 1 | `.\scripts\start-anvil.ps1` | Local chain with prefunded accounts |
| 2 | `.\scripts\deploy-anvil.ps1 -Step build` | Compile + unit tests |
| 3 | `.\scripts\deploy-anvil.ps1 -Step dex` | Deploy mock Uniswap V2 |
| 4 | `.\scripts\deploy-anvil.ps1 -Step deploy` | Deploy Eyes token, factory, fee router, buy/burn |
| 5 | `.\scripts\deploy-anvil.ps1 -Step configure` | Wire mock router + fund $EYES float |
| 6 | `.\scripts\deploy-anvil.ps1 -Step seed` | Seed platform $EYES/WETH LP |
| 7 | `.\scripts\deploy-anvil.ps1 -Step e2e` | Launch → lock LP → swap → buy & burn |
| 8 | `.\scripts\deploy-anvil.ps1 -Step verify` | Read-only deployment check |
| 9 | `.\scripts\deploy-anvil.ps1 -Step keeper` | Run buy & burn keeper |
| 10 | `.\scripts\deploy-anvil.ps1 -Step sync-web` | Push addresses to `web/.env.local` |

Or all at once: `.\scripts\local-anvil-first-run.ps1`

---

## What the E2E script proves (on-chain)

`EyesE2EDemo.s.sol` automatically:

1. Creates a test launch token (`ETL`)
2. Seeds launch liquidity and **permanently locks LP**
3. Swaps ETH through **EyesFeeRouter** (1% fee)
4. Splits fees **50% creator / 50% buy-burn queue**
5. Executes **buy & burn** when queue is ready

After `-Step verify`, expect console output like:

- `launchCount >= 1`
- `totalCreatorFeesPaid > 0`
- `pendingBurnEth` or `totalEyesBurnedViaQueue > 0`
- `keeperReady true` (after swap)

---

## Point the website at Anvil

After `-Step sync-web`, `web/.env.local` includes:

```env
NEXT_PUBLIC_USE_ANVIL=true
NEXT_PUBLIC_ANVIL_RPC_URL=http://127.0.0.1:8545
NEXT_PUBLIC_CHAIN_ID=31337
NEXT_PUBLIC_PRESALE_RECIPIENT=0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266
NEXT_PUBLIC_EYES_TOKEN_ADDRESS=<from deployments/anvil.json>
```

Restart `npm run dev`.

### MetaMask setup

1. **Add network**
   - Network name: `Anvil Local`
   - RPC URL: `http://127.0.0.1:8545`
   - Chain ID: `31337`
   - Currency: `ETH`

2. **Import account #0 or #1** using private keys above

3. Visit `/presale` → connect wallet → send **0.01 ETH** to treasury (`0xf39F…2266`)

Presale sends native ETH to `NEXT_PUBLIC_PRESALE_RECIPIENT` — on Anvil that is account #0 (same wallet can send to itself for smoke test, or use account #1 as buyer).

---

## Output files

| File | Contents |
|------|----------|
| `deployments/anvil-dex.env` | Mock `UNISWAP_V2_ROUTER`, WETH, factory |
| `deployments/anvil.json` | All Eyes contract addresses |
| `deployments/anvil.env` | Env snippet for scripts |
| `web/.env.local` | Web + wallet config (after sync-web) |

---

## Pass / fail checklist — Local Anvil

Copy and fill after your run.

### Preflight

| # | Check | Pass | Fail | Notes |
|---|-------|------|------|-------|
| P1 | `anvil` installed | ☐ | ☐ | |
| P2 | `forge` installed | ☐ | ☐ | |
| P3 | Anvil running on :8545 | ☐ | ☐ | |
| P4 | `forge test` passes | ☐ | ☐ | |

### On-chain (Anvil)

| # | Check | Pass | Fail | Evidence |
|---|-------|------|------|----------|
| A1 | Mock DEX deployed | ☐ | ☐ | `deployments/anvil-dex.env` |
| A2 | Eyes stack deployed | ☐ | ☐ | `deployments/anvil.json` |
| A3 | Platform LP seeded | ☐ | ☐ | seed script logs |
| A4 | Test launch created | ☐ | ☐ | E2E `launchId` log |
| A5 | Launch LP locked | ☐ | ☐ | E2E `lpLockedForever` |
| A6 | Fee router swap | ☐ | ☐ | E2E completes |
| A7 | 50/50 split | ☐ | ☐ | `totalCreatorFeesPaid > 0` |
| A8 | Buy & burn | ☐ | ☐ | `eyesBurned > 0` or supply decreased |
| A9 | Keeper run | ☐ | ☐ | keeper script output |
| A10 | Verify script clean | ☐ | ☐ | `-Step verify` |

### Website (local)

| # | Check | Pass | Fail | Notes |
|---|-------|------|------|-------|
| B1 | Pages load | ☐ | ☐ | `/`, `/presale`, `/app/pool` |
| B2 | Wallet connects to Anvil | ☐ | ☐ | chain 31337 |
| B3 | Presale send works | ☐ | ☐ | tx hash |
| B4 | Referral `?ref=` works | ☐ | ☐ | bot optional |
| B5 | Pool page shows data | ☐ | ☐ | bot snapshot |

### Discord bot (optional)

| # | Check | Pass | Fail | Notes |
|---|-------|------|------|-------|
| C1 | `!myref` works | ☐ | ☐ | |
| C2 | Webhook receives contribution | ☐ | ☐ | `localhost:3847` |

### Verdict

- [ ] **GO** — local stack verified, ready for testnet deploy when desired
- [ ] **NO-GO** — blockers: _______________

---

## Troubleshooting

| Error | Fix |
|-------|-----|
| `Anvil is not running` | Start `.\scripts\start-anvil.ps1` first |
| `Run -Step dex first` | Mock router missing — run `-Step dex` |
| `DEX router has no bytecode` | Same — deploy mock DEX before Eyes deploy |
| `Treasury lacks EYES` | Ensure `EYES_TREASURY` = Anvil account #0 |
| MetaMask wrong network | Switch to Anvil Local (31337) |
| Web still shows Base Sepolia | Set `NEXT_PUBLIC_USE_ANVIL=true`, restart dev server |
| Buy & burn skipped | Run `-Step configure` to fund router with $EYES |

---

## vs Base Sepolia

| | **Anvil (this doc)** | Base Sepolia |
|--|----------------------|--------------|
| Faucet | **Not needed** | Required |
| DEX | Mock Uniswap (local) | Real Uniswap V2 on testnet |
| Chain ID | 31337 | 84532 |
| Script | `deploy-anvil.ps1` | `deploy-base-sepolia.ps1` |
| Use when | Daily dev + full E2E | Pre-mainnet public testnet demo |

---

## Related docs

- `docs/LIVE_TEST_RUN.md` — full website + bot + testnet checklist
- `docs/TESTNET_OPERATOR_GUIDE.md` — Base Sepolia (optional later)
- `scripts/start-anvil.ps1` — chain starter
- `scripts/deploy-anvil.ps1` — deploy orchestrator
