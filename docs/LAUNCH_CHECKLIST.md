# Eyes Open — Launch Checklist

**Last updated:** Mainnet Readiness pass — coin core frozen on local Anvil (7/7 PASS).

Use this before announcing the **public presale** or mainnet milestone.

> **Strict mainnet path:** [`MAINNET_READINESS.md`](MAINNET_READINESS.md) (production env, presale test, audit, deploy, multisig, announce gate). Brand/X/TG handled separately.

---

## Status at a glance

### Done (coin core — do not change without new audit path)

- [x] Local Anvil E2E: launch → LP lock → swap → buy/burn (`eyesBurned > 0`)
- [x] 50/50 fee split verified on Anvil (`coin-verify`)
- [x] Permanent LP lock verified
- [x] Eyes Window constraints verified (pair buy OK, P2P blocked)
- [x] Presale wallet send path on Anvil (chain 31337)
- [x] Pricing Model B centralized (`web/lib/presale-pricing-config.ts`)
- [x] Production vs local env separation (`APP_ENV`, `.env.production.example`)
- [x] `/presale` live pricing bar (current tier, next tier, launch price)

### Ready for production config (your action — no new contract code)

- [ ] Copy `web/.env.production.example` → host env (Vercel / eyesopen.to) — values pre-filled
- [ ] Confirm Model B prices (defaults OK): T1 `0.0003`, T2 `0.0005`, T3 `0.0008`, launch `0.0015`
- [ ] Set **`NEXT_PUBLIC_APP_ENV=production`**, **`NEXT_PUBLIC_USE_ANVIL=false`**
- [ ] Set **`NEXT_PUBLIC_CHAIN_ID=8453`**, **`NEXT_PUBLIC_SITE_URL=https://www.eyesopen.to`**
- [ ] `npm run build` with production env on preview URL
- [ ] Manual presale test on **Base mainnet** with small amount before announcement

### Blocked on mainnet / audit (do not announce as live until complete)

- [ ] External smart contract audit sign-off
- [ ] Mainnet deploy + verified contracts on BaseScan
- [ ] Multisig ownership transfer (`OWNERSHIP.md`, `-Step transfer`)
- [ ] Mainnet `$EYES` + factory addresses in production env
- [ ] Production keeper / ops runbook for buy & burn
- [ ] Legal / disclaimer review for public presale jurisdiction

---

## 1. Presale (Model B)

Reference: [`PRODUCTION_CONFIG.md`](PRODUCTION_CONFIG.md)

- [x] Tier ladder defined in code (14-day window)
- [x] **Production start date locked** (`NEXT_PUBLIC_PRESALE_START_ISO=2026-08-24T00:00:00.000Z`)
- [x] **Recipient wallet locked** (`0x3dFf4ADfA6d7482e3fFB362Aa9d6370bCC45c4b5`)
- [ ] Raised / contributor stats source decided (on-chain indexer or manual — currently `—` on UI)
- [ ] Presale FAQ reviewed — no ROI / investment promises

**Pricing defaults (Model B):**

| Tier | Days | Price |
|------|------|-------|
| 1 | 1–5 | $0.0003 |
| 2 | 6–10 | $0.0005 |
| 3 | 11–14 | $0.0008 |
| Public launch | after day 14 | $0.0015 |

---

## 2. Website

- [x] `/presale` page with wallet connect + tier display
- [x] `/tokenomics` live
- [x] Local Anvil isolated from production config
- [ ] Production domain HTTPS + env vars on host
- [ ] Mobile pass on `/presale` (connect, tier bar, send flow)

---

## 3. Smart contracts

### Done (local / test path)

- [x] `forge build` + tests pass
- [x] Anvil full stack (`deploy-anvil.ps1 -Step refresh` / `coin-verify`)
- [x] Coin verify script (`AnvilCoinVerify.s.sol`)

### Blocked for public mainnet presale

- [ ] Mainnet deploy
- [ ] BaseScan verification
- [ ] Audit report published or scheduled with date
- [ ] Multisig + timelock ownership
- [ ] 1–2 week mainnet soak with keeper

---

## 4. Tokenomics consistency

Cross-check [`TOKENOMICS.md`](TOKENOMICS.md):

- [x] 1% trading fee / 50% creator / 50% buy & burn in contracts + tests
- [x] Site copy aligned (no 30/30/40, no protocol reserve in public story)
- [ ] Mainnet addresses published when live
- [ ] Presale described separately from trading-fee flywheel

---

## 5. Social links (brand visuals — X/TG handled off-repo)

- [x] Name, ticker, slogan locked in `site-config.ts`
- [x] Canonical links in env (`NEXT_PUBLIC_SOCIAL_*`)

---

## 6. Pre-announcement tests (48h before)

### Operator (staging / mainnet)

```powershell
# Local coin regression (frozen core)
.\scripts\deploy-anvil.ps1 -Step coin-verify
```

- [ ] Production preview: `/presale` shows Base, not Anvil
- [ ] Wallet send reaches correct recipient on intended chain
- [ ] Tier API `/api/presale/tier` returns correct day/tier for start date

### Website

- [ ] `npm run build` in `web/`
- [ ] `/presale` — current / next / launch price visible
- [ ] No `NEXT_PUBLIC_USE_ANVIL=true` in production host env

---

## 7. Announcement gate

**Do not announce public presale until ALL are true:**

1. Production env live on eyesopen.to ([`MAINNET_READINESS.md`](MAINNET_READINESS.md))
2. Mainnet recipient + start date set
3. Tiny mainnet send test passed on production
4. External audit report published
5. Legal/disclaimer sign-off for presale jurisdiction

---

## Quick reference

| Doc | Purpose |
|-----|---------|
| [`MAINNET_READINESS.md`](MAINNET_READINESS.md) | Strict path to mainnet presale |
| [`PRODUCTION_CONFIG.md`](PRODUCTION_CONFIG.md) | Env vars for eyesopen.to |
| [`TOKENOMICS.md`](TOKENOMICS.md) | Economics source of truth |
| [`LOCAL_ANVIL_TEST.md`](LOCAL_ANVIL_TEST.md) | Local coin testing (frozen) |
| [`MESSAGING_KIT.md`](MESSAGING_KIT.md) | Public copy |

---

## Sign-off

| Milestone | Date | Signed off by | Notes |
|-----------|------|---------------|-------|
| Coin core (Anvil 7/7) | | | Frozen |
| Production config live | | | |
| Public presale announced | | | |
| Mainnet | | | |
