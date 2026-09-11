# Eyes Open ($EYES) — Live Test Run

**Network:** Base Sepolia (chain ID `84532`) OR **local Anvil (recommended, no faucet)**  
**Purpose:** End-to-end verification before any mainnet launch  
**Status:** Testnet / local only — do not use mainnet keys here

> **No faucet?** Use the official local path: [`docs/LOCAL_ANVIL_TEST.md`](LOCAL_ANVIL_TEST.md)  
> Run `.\scripts\start-anvil.ps1` then `.\scripts\local-anvil-first-run.ps1`

---

## 1. Readiness audit

### A) On-chain

| # | Test | Status | Notes |
|---|------|--------|-------|
| A1 | Deploy all core contracts | **Missing** | Run `.\scripts\first-run.ps1` — no `deployments/base-sepolia.json` yet |
| A2 | Seed platform $EYES liquidity | **Missing** | `SeedEyesLiquidity.s.sol` after deploy |
| A3 | Create test launch token | **Missing** | Part of `EyesE2EDemo.s.sol` |
| A4 | Seed + permanently lock LP | **Missing** | Factory → Seeder → Locker in E2E script |
| A5 | Validate Eyes Window constraints | **Partial** | Unit tests pass; needs on-chain manual checks post-E2E |
| A6 | Execute swap via fee router | **Missing** | In E2E demo script |
| A7 | Validate 50/50 creator + burn split | **Partial** | Logic in contracts + tests; verify with `cast call` post-swap |
| A8 | Execute buy & burn | **Missing** | Requires seeded EYES/WETH pool + `RunKeeper.s.sol` |
| A9 | Presale recipient receive flow | **Partial** | Off-chain ETH send to treasury — web configured |
| A10 | Emit/record data for pool stats | **Partial** | On-chain events exist; pool UI reads Discord bot snapshot |

### B) Website

| # | Test | Status | Notes |
|---|------|--------|-------|
| B1 | All primary pages load | **Ready** | 9 routes build clean |
| B2 | No 404 on App / Presale / Pool | **Ready** | `/app/support` redirects to `/presale` |
| B3 | Presale pricing tiers display | **Ready** | `PresalePricingTiers` + `/api/presale/tier` |
| B4 | Wallet connect works | **Ready** | Injected connector on Base Sepolia |
| B5 | Presale contribute E2E | **Ready** | ETH send to `NEXT_PUBLIC_PRESALE_RECIPIENT` |
| B6 | Tx pending/success/fail states | **Ready** | `TransactionResult` modal |
| B7 | Pool page pie + stats | **Partial** | Needs bot snapshot with users (bot now syncs to `web/data/`) |
| B8 | Referral code attach/display | **Ready** | `?ref=CODE` + API forwarding fixed |
| B9 | Mobile + desktop smoke | **Ready** | Manual visual pass |

### C) Discord bot

| # | Test | Status | Notes |
|---|------|--------|-------|
| C1 | Create user | **Ready** | First `!` command or join |
| C2 | Generate referral link | **Ready** | `!myref` |
| C3 | Track invite/referral events | **Partial** | Webhooks + `!refclick`; auto Discord invite join not implemented |
| C4 | Auto-grant locked invite rewards | **Partial** | Click/contribution webhooks; manual `!discordinvite` |
| C5 | Manual share commands | **Ready** | `!givelocked`, `!giveunlocked`, etc. |
| C6 | Lock/unlock/status commands | **Ready** | `!teamunlock`, `!teamstatus`, `!teamleaderboard` |
| C7 | MCap eligibility + confirm unlock | **Partial** | Info + audit log; no on-chain mcap fetch |
| C8 | Staff log channel | **Partial** | Grants/unlocks + webhooks; not all referral commands |

---

## 2. Blockers

| Priority | Blocker | Fix |
|----------|---------|-----|
| **P0** | Contracts not deployed | Fund deployer with Base Sepolia ETH → run `.\scripts\first-run.ps1` |
| **P0** | Deployer wallet needs ETH | [Base Sepolia faucet](https://www.alchemy.com/faucets/base-sepolia) |
| **P1** | Presale window date | Set `NEXT_PUBLIC_PRESALE_START_ISO` to a recent date (see `.env.local`) |
| **P1** | Bot must be running for webhooks | `npm start` in `ops/discord-bot` |
| **P1** | Local web webhook URL | `BOT_WEBHOOK_URL=http://localhost:3847` in `web/.env.local` |
| **P2** | Contract addresses in web env | Run `.\scripts\sync-deploy-to-web.ps1` after deploy |
| **P2** | On-chain pool stats indexer | Not built — pool stats = Discord bot for now |
| **P3** | Auto Discord invite tracking | Manual `!discordinvite` workaround for test |

---

## 3. What you must provide

| Item | Where to get it | Used for |
|------|-----------------|----------|
| **Deployer private key** | Your testnet wallet | `.env` → `DEPLOYER_PRIVATE_KEY` |
| **Base Sepolia ETH** | Faucet (~0.05 ETH) | Deploy + seed + E2E |
| **Treasury / presale recipient** | Already set: `0x8498…164C` | Presale ETH receives here |
| **RPC URL** | `https://sepolia.base.org` or Alchemy | `.env` → `BASE_SEPOLIA_RPC_URL` |
| **Discord bot token** | Discord Developer Portal | `ops/discord-bot/.env` |
| **Your Discord user ID** | Discord → Developer Mode → Copy ID | `DISCORD_OWNER_IDS` |
| **Staff log channel ID** | Discord channel → Copy ID | `DISCORD_STAFF_LOG_CHANNEL_ID` |
| **MetaMask on Base Sepolia** | Add network 84532 | Website presale test |
| **PLATFORM_API_SECRET** | Any random string (same in bot + web) | Bot webhook auth |

**Do NOT provide mainnet keys or real mainnet ETH for this test.**

---

## 4. Exact test sequence

Run in this order. Check each box as you go.

### Phase 0 — Preflight (15 min)

- [ ] **0.1** Confirm Foundry installed: `forge --version`
- [ ] **0.2** Confirm deployer has Base Sepolia ETH
- [ ] **0.3** Run doctor: `.\scripts\deploy-base-sepolia.ps1 -Step doctor`
- [ ] **0.4** Run build + tests: `.\scripts\deploy-base-sepolia.ps1 -Step build`
- [ ] **0.5** Start Discord bot: `cd ops\discord-bot; npm start`
- [ ] **0.6** Start web dev: `cd web; npm run dev`
- [ ] **0.7** Confirm `web/.env.local` has active presale start + `BOT_WEBHOOK_URL=http://localhost:3847`

### Phase A — On-chain (30–45 min)

- [ ] **A1** Deploy: `.\scripts\deploy-base-sepolia.ps1 -Step deploy`
- [ ] **A2** Merge env: copy `deployments/base-sepolia.env` values into root `.env`
- [ ] **A3** Sync web env: `.\scripts\sync-deploy-to-web.ps1`
- [ ] **A4** Seed platform liquidity: `.\scripts\deploy-base-sepolia.ps1 -Step seed`
- [ ] **A5** Full E2E demo: `.\scripts\deploy-base-sepolia.ps1 -Step e2e`
- [ ] **A6** Verify deployment: `.\scripts\deploy-base-sepolia.ps1 -Step verify`
- [ ] **A7** Run keeper / buy-burn: `.\scripts\deploy-base-sepolia.ps1 -Step keeper`
- [ ] **A8** Manual Eyes Window check (see §5 cast commands)
- [ ] **A9** Manual 50/50 split check (see §5 cast commands)

### Phase B — Website (20 min)

- [ ] **B1** Open `/` — home loads
- [ ] **B2** Open `/presale` — tiers + StatusStrip show active day
- [ ] **B3** Open `/app`, `/app/pool`, `/app/create`, `/app/launches`, `/tokenomics`
- [ ] **B4** Connect MetaMask on Base Sepolia
- [ ] **B5** Visit `/presale?ref=YOURCODE` (from `!myref`) — badge shows
- [ ] **B6** Send **0.01 ETH** presale contribution — tx succeeds on BaseScan
- [ ] **B7** Confirm staff log shows contribution webhook
- [ ] **B8** Open `/app/pool` — pie chart + stats (after bot has users)
- [ ] **B9** Link wallet in Discord: `!linkwallet 0xYourAddress` — pool shows allocation
- [ ] **B10** Resize browser / phone — layout OK

### Phase C — Discord bot (15 min)

- [ ] **C1** `!poolhelp` — command list
- [ ] **C2** `!myref` — referral link
- [ ] **C3** `!refstats` — your stats
- [ ] **C4** `!givelocked @user 5000` — locked grant (owner)
- [ ] **C5** `!teamstatus @user` — shows locked/unlocked
- [ ] **C6** `!teamunlock @user 1000` — moves to unlocked
- [ ] **C7** `!discordinvite @user` — invite reward
- [ ] **C8** `!teamcheckmcap` → `!teamunlockmcap` → `!teamconfirmunlock @user 500`
- [ ] **C9** Staff log channel shows grant/unlock/webhook lines
- [ ] **C10** `!teamleaderboard` — rankings

---

## 5. Commands to run

### One-shot on-chain deploy + E2E

```powershell
cd C:\Users\Caras\Downloads\eyes-launchpad
.\scripts\first-run.ps1
```

Or step-by-step:

```powershell
cd C:\Users\Caras\Downloads\eyes-launchpad
.\scripts\deploy-base-sepolia.ps1 -Step doctor
.\scripts\deploy-base-sepolia.ps1 -Step build
.\scripts\deploy-base-sepolia.ps1 -Step deploy
# Merge deployments/base-sepolia.env into .env
.\scripts\sync-deploy-to-web.ps1
.\scripts\deploy-base-sepolia.ps1 -Step seed
.\scripts\deploy-base-sepolia.ps1 -Step e2e
.\scripts\deploy-base-sepolia.ps1 -Step verify
.\scripts\deploy-base-sepolia.ps1 -Step keeper
```

### Start local services (3 terminals)

```powershell
# Terminal 1 — Discord bot
cd C:\Users\Caras\Downloads\eyes-launchpad\ops\discord-bot
npm start

# Terminal 2 — Web
cd C:\Users\Caras\Downloads\eyes-launchpad\web
npm run dev

# Terminal 3 — Route smoke test
cd C:\Users\Caras\Downloads\eyes-launchpad\web
npm run build
```

### Post-deploy verification (replace addresses from `deployments/base-sepolia.json`)

```powershell
$env:EYES_FEE_COLLECTOR = "0x..."   # from deployment file
$env:EYES_TOKEN = "0x..."

cast call $env:EYES_FEE_COLLECTOR "accumulatedBurnProceeds()(uint256)" --rpc-url https://sepolia.base.org
cast call $env:EYES_FEE_COLLECTOR "totalCreatorFeesPaid()(uint256)" --rpc-url https://sepolia.base.org
cast call $env:EYES_TOKEN "totalSupply()(uint256)" --rpc-url https://sepolia.base.org
```

### Discord bot test commands

```
!poolhelp
!myref
!refstats
!linkwallet 0xYourWalletAddress
!givelocked @User 5000
!teamstatus @User
!teamunlock @User 1000
!discordinvite @User
!teamcheckmcap
!teamunlockmcap
!teamconfirmunlock @User 500
!teamleaderboard
```

### Webhook smoke test (bot running locally)

```powershell
curl -X POST http://localhost:3847/webhook/referral-click `
  -H "Content-Type: application/json" `
  -H "x-platform-secret: EyesOpen2026_xK9mP2vL8qR" `
  -d "{\"referralCode\":\"YOURCODE\"}"
```

### Presale flow

1. Discord: `!myref` → copy link
2. Browser: open link → connect wallet → send 0.01 ETH
3. Discord: `!refstats` → contribution count up
4. Staff channel → contribution logged

---

## 6. Pass / fail report template

Copy this section after the run and fill in results.

```markdown
# Eyes Open Live Test Report

**Date:** YYYY-MM-DD  
**Tester:**  
**Network:** Base Sepolia  
**Git commit:**  

## Summary

| Area | Pass | Fail | Skip | Notes |
|------|------|------|------|-------|
| On-chain | /10 | | | |
| Website | /10 | | | |
| Discord bot | /10 | | | |
| **Total** | /30 | | | |

## Verdict

- [ ] **GO** — safe to proceed toward mainnet prep
- [ ] **NO-GO** — blockers listed below

## On-chain results

| ID | Test | Result | Tx hash / evidence |
|----|------|--------|-------------------|
| A1 | Deploy contracts | ☐ Pass ☐ Fail | |
| A2 | Seed EYES liquidity | ☐ Pass ☐ Fail | |
| A3 | Create test launch | ☐ Pass ☐ Fail | |
| A4 | Lock LP permanently | ☐ Pass ☐ Fail | |
| A5 | Eyes Window constraints | ☐ Pass ☐ Fail | |
| A6 | Fee router swap | ☐ Pass ☐ Fail | |
| A7 | 50/50 split verified | ☐ Pass ☐ Fail | |
| A8 | Buy & burn executed | ☐ Pass ☐ Fail | |
| A9 | Presale ETH received | ☐ Pass ☐ Fail | |
| A10 | Pool stats data | ☐ Pass ☐ Fail ☐ N/A | |

**Deployed addresses:**
- EYES_TOKEN:
- EYES_FACTORY:
- EYES_FEE_COLLECTOR:
- EYES_FEE_ROUTER:
- EYES_BUY_BURN_EXECUTOR:

## Website results

| ID | Test | Result | Notes |
|----|------|--------|-------|
| B1 | Pages load | ☐ Pass ☐ Fail | |
| B2 | No 404s | ☐ Pass ☐ Fail | |
| B3 | Pricing tiers | ☐ Pass ☐ Fail | |
| B4 | Wallet connect | ☐ Pass ☐ Fail | |
| B5 | Presale contribute | ☐ Pass ☐ Fail | |
| B6 | Tx states | ☐ Pass ☐ Fail | |
| B7 | Pool page | ☐ Pass ☐ Fail | |
| B8 | Referral code | ☐ Pass ☐ Fail | |
| B9 | Mobile/desktop | ☐ Pass ☐ Fail | |

**Presale tx hash:**

## Discord bot results

| ID | Test | Result | Notes |
|----|------|--------|-------|
| C1 | User created | ☐ Pass ☐ Fail | |
| C2 | Referral link | ☐ Pass ☐ Fail | |
| C3 | Event tracking | ☐ Pass ☐ Fail | |
| C4 | Auto rewards | ☐ Pass ☐ Fail | |
| C5 | Manual grants | ☐ Pass ☐ Fail | |
| C6 | Lock/unlock | ☐ Pass ☐ Fail | |
| C7 | Mcap flow | ☐ Pass ☐ Fail | |
| C8 | Staff log | ☐ Pass ☐ Fail | |

## Blockers found

1.
2.
3.

## Sign-off

- [ ] Testnet only — no mainnet deployment performed
- [ ] Ready for next phase: ___
```

---

## 7. Known limitations (not failures)

These are expected for the current MVP:

- Presale is **off-chain ETH send** — no Solidity presale contract
- Raised / Contributors stats on presale page show **"—"** until an indexer is built
- Auto Discord invite join tracking requires future `GuildInvites` implementation
- Mcap unlock is **manual verification** + owner confirmation — no oracle
- Vercel production cannot reach `localhost` bot — use VPS/tunnel for live site webhooks
- Platform EYES/WETH LP is seeded but **not permanently locked** (launch LPs are locked)

---

## 8. Quick reference

| Resource | Path |
|----------|------|
| Testnet operator guide | `docs/TESTNET_OPERATOR_GUIDE.md` |
| Windows setup | `docs/WINDOWS_SETUP.md` |
| Bot commands | `ops/discord-bot/README.md` |
| Web env | `web/.env.local` |
| Bot env | `ops/discord-bot/.env` |
| Deployments | `deployments/base-sepolia.json` (after deploy) |
| Pool snapshot | `data/platform-snapshot.json` + `web/data/platform-snapshot.json` |

---

**Next step:** Run Phase 0 preflight, then `.\scripts\first-run.ps1` if deployer wallet has Base Sepolia ETH.
