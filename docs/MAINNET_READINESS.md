# Eyes Open — Mainnet readiness (strict)

> **Execute now:** [`GO_LIVE_CHECKLIST.md`](GO_LIVE_CHECKLIST.md) — short checkbox list for Yo.

**Goal:** Current state → **public presale live on Base mainnet** (chain `8453`).  
**Out of scope:** New features, Discord, tokenomics changes, brand assets (handled on X/TG).

**Presale window (locked):** `2026-08-24T00:00:00.000Z` · 14 days · Model B pricing in code.  
**Presale recipient (locked):** `0x3dFf4ADfA6d7482e3fFB362Aa9d6370bCC45c4b5`

---

## 1. Production env on eyesopen.to

| Check | Status |
|-------|--------|
| Host env matches `web/.env.production.example` | ☐ |
| `NEXT_PUBLIC_APP_ENV=production` | ☐ |
| `NEXT_PUBLIC_USE_ANVIL=false` | ☐ |
| `NEXT_PUBLIC_CHAIN_ID=8453` | ☐ |
| `NEXT_PUBLIC_SITE_URL=https://www.eyesopen.to` | ☐ |
| Presale recipient + start ISO match locked values | ☐ |
| `NEXT_PUBLIC_FEATURE_WALLET=true` | ☐ |
| No Anvil addresses in production host env | ☐ |
| `npm run build` passes with production env | ☐ |
| Redeploy after any env change | ☐ |

**Verify live:** Open `/presale` → wallet prompts **Base**, not Anvil/Sepolia.

Reference: [`PRODUCTION_CONFIG.md`](PRODUCTION_CONFIG.md)

---

## 2. Presale recipient — confirm + tiny mainnet send

Presale is a **native ETH transfer** to `NEXT_PUBLIC_PRESALE_RECIPIENT` (no presale contract).

| Step | Status |
|------|--------|
| Confirm `0x3dFf…c4b5` is the intended treasury (Safe or EOA you control) | ☐ |
| Confirm address on [BaseScan](https://basescan.org/address/0x3dFf4ADfA6d7482e3fFB362Aa9d6370bCC45c4b5) | ☐ |
| Production site `/presale` shows same address (or “configured” — spot-check env) | ☐ |
| **Tiny live test:** connect wallet on eyesopen.to → send **≥0.0001 ETH** on Base mainnet | ☐ |
| Tx confirms on BaseScan; funds arrive at treasury | ☐ |
| UI shows success state (`TransactionResult`) | ☐ |
| `/api/presale/tier` returns correct tier for start date (live since Aug 24) | ☐ |

**Do not announce “presale live” until this test passes on production host.**

---

## 3. Contract audit status

| Item | Status |
|------|--------|
| External security audit **engaged** (vendor + scope + date) | ☐ **Not started** |
| Audit scope includes: LP locker irreversibility, fee router accounting, buy/burn executor slippage | ☐ |
| All **Critical/High** findings resolved or accepted with public disclosure | ☐ |
| Audit report **published** (PDF/link on site or X) | ☐ **Blocked** |
| Contract bytecode frozen for audit tag (no post-audit changes without re-audit) | ☐ |

**Current state:** Coin core verified on **local Anvil only** (`deploy-anvil.ps1 -Step coin-verify`).  
**Base Sepolia public soak:** Not deployed (`deployments/base-sepolia.json` missing).  
**Mainnet:** Not deployed.

Audit is a **hard gate** for announcing mainnet presale as live per project messaging ([`MESSAGING_KIT.md`](MESSAGING_KIT.md)).

---

## 4. Mainnet deploy plan

No mainnet deploy script exists yet. Planned sequence:

### Phase A — Base Sepolia soak (required before mainnet)

```powershell
# .env: BASE_SEPOLIA_RPC_URL, DEPLOYER_PRIVATE_KEY, UNISWAP_V2_ROUTER (Sepolia)
.\scripts\deploy-base-sepolia.ps1 -Step build
.\scripts\deploy-base-sepolia.ps1 -Step deploy
.\scripts\deploy-base-sepolia.ps1 -Step seed
.\scripts\deploy-base-sepolia.ps1 -Step e2e
.\scripts\deploy-base-sepolia.ps1 -Step verify
# Repeat keeper + coin checks over 1–2 weeks
.\scripts\deploy-base-sepolia.ps1 -Step keeper
```

| Step | Status |
|------|--------|
| Base Sepolia deploy + verify script PASS | ☐ |
| E2E: launch → LP lock → swap → buy/burn | ☐ |
| Keeper runs reliably on testnet | ☐ |
| 1–2 week testnet soak complete | ☐ |

Guide: [`TESTNET_OPERATOR_GUIDE.md`](TESTNET_OPERATOR_GUIDE.md) · [`LIVE_TEST_RUN.md`](LIVE_TEST_RUN.md)

### Phase B — Base mainnet deploy (after audit + Sepolia soak)

| Step | Status |
|------|--------|
| Mainnet `.env`: `BASE_MAINNET_RPC_URL`, deployer key in **hardware wallet / Safe exec** | ☐ |
| Base mainnet Uniswap V2 router + WETH addresses confirmed | ☐ |
| Run `DeployEyes.s.sol` on chain `8453` (adapt config or env — same bytecode as audited tag) | ☐ |
| Seed platform `$EYES` liquidity + permanent LP lock | ☐ |
| Post-deploy `VerifyDeployment` equivalent on mainnet RPC | ☐ |
| **BaseScan verification** for all contracts | ☐ |
| Write addresses → `deployments/base-mainnet.json` + production env | ☐ |

Production env after deploy:

```env
NEXT_PUBLIC_EYES_TOKEN_ADDRESS=<mainnet>
NEXT_PUBLIC_LAUNCH_FACTORY_ADDRESS=<mainnet>
NEXT_PUBLIC_FEE_COLLECTOR_ADDRESS=<mainnet>
```

Redeploy site. Publish addresses on `/tokenomics` + X pin.

---

## 5. Multisig / ownership plan

Reference: [`OWNERSHIP.md`](OWNERSHIP.md)

| Step | Status |
|------|--------|
| Create **Gnosis Safe on Base mainnet** (2-of-3 or 3-of-5) | ☐ |
| Safe address = treasury owner target (`NEW_OWNER`) | ☐ |
| After mainnet deploy: `TransferOwnership.s.sol` on **8453** | ☐ |
| Verify `owner()` on Token, Factory, FeeCollector, FeeRouter → Safe | ☐ |
| Deployer EOA **cannot** call admin functions (negative test) | ☐ |
| Document Safe signers + escalation path (offline) | ☐ |
| Timelock on critical admin (factory fee router, launch kill-switch) — **future Step 5** | ☐ optional pre-presale |

**Rule:** Do not announce platform/token mechanics as live until Ownable contracts sit behind multisig.

Presale ETH recipient may be the Safe **before** contract deploy if that address is already `0x3dFf…c4b5`.

---

## 6. Final pre-announce checks (48h before “presale live”)

| Check | Status |
|-------|--------|
| Production `/presale`: tier bar, Model B prices, start countdown/date | ☐ |
| Wallet connect → Base only; no Anvil leakage | ☐ |
| Tiny mainnet send test **repeated** on production | ☐ |
| Presale FAQ: no ROI / investment promises ([`MESSAGING_KIT.md`](MESSAGING_KIT.md)) | ☐ |
| Legal/disclaimer review for your jurisdiction | ☐ |
| X + TG posts ready with **exact** recipient + “Base mainnet only” | ☐ |
| BaseScan link template ready for first public tx | ☐ |
| Rollback plan: disable presale CTA via env (`FEATURE_WALLET=false`) if incident | ☐ |
| On-call: who watches treasury + site for first 24h | ☐ |

Optional (not blocking presale ETH flow):

- [ ] Mainnet `$EYES` addresses on site (needed for token/platform story, not for ETH presale send)
- [ ] Raised/contributor stats (currently `—` on UI)

---

## 7. Hard blockers vs can-do-now

### Hard blockers — do **not** say “presale live / send ETH now”

| Blocker | Why |
|---------|-----|
| Production env not on eyesopen.to host | Site may show wrong chain or recipient |
| No tiny mainnet send test on production | Treasury routing unproven |
| External audit not published | Smart-contract risk + messaging policy |
| Mainnet contracts not deployed + verified | Platform/token claims premature |
| Admin still on deployer EOA (post-deploy) | Centralization / incident risk |

### Can do now (no mainnet contract deploy required)

| Action | Safe? |
|--------|-------|
| Deploy production env to Vercel / eyesopen.to | ✅ |
| Tiny mainnet ETH test to treasury | ✅ |
| Book audit + freeze bytecode tag | ✅ |
| Base Sepolia full deploy + soak | ✅ |
| Create Base mainnet Safe; fund with ETH for future deploy | ✅ |
| Tease **date** (Aug 24 launch) on X/TG without “send now” | ✅ |
| Legal review of presale copy | ✅ |

### Can announce now vs blocked messaging

| Message | OK now? |
|---------|---------|
| “Site live · presale **live now** · Base mainnet” | ✅ after prod env live |
| “Send ETH to presale **now**” | ❌ until section 6 complete |
| “$EYES trading / launch pad live on mainnet” | ❌ until deploy + audit + multisig |
| “Audited · verified on BaseScan” | ❌ until audit report + verification live |

---

## Earliest safe announcement point

**Earliest “presale is LIVE — send ETH on Base” announcement:**

> Production env verified on eyesopen.to **+** tiny mainnet send test passed **+** external audit report published **+** legal/disclaimer sign-off **+** 48h pre-flight checklist (section 6) **complete**.

**Target window:** Presale is live from `2026-08-24T00:00:00.000Z` through day 14.

**Earliest “platform / $EYES on mainnet” announcement (separate, later gate):**

> Mainnet deploy + BaseScan verify + multisig owns all Ownable contracts + keeper monitored.

---

## Sign-off

| Gate | Date | By | Notes |
|------|------|-----|-------|
| Production env live | | | |
| Mainnet presale send test | | | Tx: |
| Audit published | | | |
| Base Sepolia soak | | | |
| Mainnet deploy + verify | | | |
| Multisig ownership | | | |
| **Presale live announced** | | | |

---

## Quick reference

| Doc | Use |
|-----|-----|
| [`PRODUCTION_CONFIG.md`](PRODUCTION_CONFIG.md) | Env vars |
| [`OWNERSHIP.md`](OWNERSHIP.md) | Multisig transfer |
| [`TESTNET_OPERATOR_GUIDE.md`](TESTNET_OPERATOR_GUIDE.md) | Sepolia ops |
| [`LOCAL_ANVIL_TEST.md`](LOCAL_ANVIL_TEST.md) | Frozen coin regression |
| [`MESSAGING_KIT.md`](MESSAGING_KIT.md) | Public copy rules |
