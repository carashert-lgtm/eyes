# Go live — Base mainnet presale

**Execute in order.** Check boxes as you go.  
**Presale opens:** `2026-08-24T00:00:00.000Z` · **Recipient:** `0x3dFf4ADfA6d7482e3fFB362Aa9d6370bCC45c4b5`  
**Out of scope:** New features · Discord · tokenomics · brand (X/TG done)

---

## DONE (already in repo)

- [x] Coin core verified on Anvil (`.\scripts\deploy-anvil.ps1 -Step coin-verify`)
- [x] Model B pricing + 14-day window in code
- [x] Presale = native **ETH on Base mainnet** (not Anvil) when `NEXT_PUBLIC_APP_ENV=production`
- [x] Production env template locked (`web/.env.production.example`)
- [x] Build fails if production env missing recipient / wrong chain / Anvil flag
- [x] UI shows **Base · Mainnet**, BaseScan links, mainnet copy on `/presale`

---

## DO NOW (your actions — no new code)

### A. Deploy production env to eyesopen.to

Copy every var from `web/.env.production.example` into Vercel (or host):

```env
NEXT_PUBLIC_APP_ENV=production
NEXT_PUBLIC_USE_ANVIL=false
NEXT_PUBLIC_CHAIN_ID=8453
NEXT_PUBLIC_SITE_URL=https://www.eyesopen.to
NEXT_PUBLIC_PRESALE_RECIPIENT=0x3dFf4ADfA6d7482e3fFB362Aa9d6370bCC45c4b5
NEXT_PUBLIC_PRESALE_START_ISO=2026-08-24T00:00:00.000Z
NEXT_PUBLIC_FEATURE_WALLET=true
```

- [ ] Env pasted on host
- [ ] Redeploy triggered
- [ ] `/presale` badge reads **Base · Mainnet** (not Sepolia / Anvil)
- [ ] Connect wallet → prompts **Base** (chain 8453)

### B. Mainnet presale smoke test

Minimum via UI: **0.01 ETH** (`presale-config.ts`).

- [ ] Connect wallet on **production** `/presale`
- [ ] Send **0.01 ETH** (or direct wallet send to treasury for routing-only test)
- [ ] Tx on [BaseScan](https://basescan.org) → treasury balance increases
- [ ] Success modal + BaseScan link works

### C. Audit + testnet path (parallel)

- [ ] Book external audit (locker, fee router, buy/burn executor)
- [ ] Base Sepolia soak:
  ```powershell
  .\scripts\deploy-base-sepolia.ps1 -Step build
  .\scripts\deploy-base-sepolia.ps1 -Step all
  ```
- [ ] Create **Gnosis Safe on Base mainnet** for post-deploy ownership

### D. 48h before announce

- [ ] `/api/presale/tier` shows correct countdown / tier for Aug 24 start
- [ ] Presale FAQ + disclaimer reviewed (no ROI promises)
- [ ] Legal/disclaimer sign-off for your jurisdiction
- [ ] X/TG posts drafted: **Base mainnet only**, exact treasury address
- [ ] Rollback plan: set `NEXT_PUBLIC_FEATURE_WALLET=false` if incident

---

## BLOCKED UNTIL MAINNET / AUDIT

| Gate | Why it blocks “platform live” |
|------|-------------------------------|
| External audit **published** | Policy + smart-contract risk |
| Base mainnet deploy + BaseScan verify | `$EYES` / launch pad claims |
| Multisig owns Token, Factory, Collector, FeeRouter | Centralization risk |
| Contract addresses in production env | Site tokenomics / app wiring |
| Keeper monitored on mainnet | Buy & burn ops |

**Presale ETH** does not need deployed contracts — but **do not** say “audited platform live” until the rows above pass.

---

## Earliest safe announcement

| Message | Safe when |
|---------|-----------|
| “Presale **live now** on Base” | After **A** complete |
| “Presale **LIVE** — send ETH now” | After **A + B + audit published + legal** |
| “$EYES / launch pad on mainnet” | After deploy + verify + multisig + keeper |

**Recommended:** Announce “live now” when all presale gates pass.

---

## Sign-off

| Gate | Date | Tx / link |
|------|------|-----------|
| Production env live | | |
| Mainnet presale test | | |
| Audit published | | |
| Presale announced live | | |

Details: [`MAINNET_READINESS.md`](MAINNET_READINESS.md) · Env: [`PRODUCTION_CONFIG.md`](PRODUCTION_CONFIG.md)
