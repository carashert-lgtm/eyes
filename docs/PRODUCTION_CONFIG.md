# Eyes Open — Production site configuration

How to configure **eyesopen.to** without accidentally pointing at local Anvil.

---

## Environment templates

| Template | Purpose |
|----------|---------|
| `web/.env.production.example` | **Production** (Base mainnet, eyesopen.to) |
| `web/.env.staging.example` | Base Sepolia preview |
| `web/.env.anvil.example` | Local coin testing only → `web/.env.local` |

**Rule:** Production must have:

```env
NEXT_PUBLIC_APP_ENV=production
NEXT_PUBLIC_USE_ANVIL=false
NEXT_PUBLIC_SITE_URL=https://www.eyesopen.to
NEXT_PUBLIC_CHAIN_ID=8453
```

Anvil (chain 31337) is **only** enabled when `NEXT_PUBLIC_APP_ENV=local` **and** `NEXT_PUBLIC_USE_ANVIL=true`.  
If `SITE_URL` contains `eyesopen.to`, Anvil is forced off even if misconfigured.

---

## Presale pricing (Model B)

Single source of truth: `web/lib/presale-pricing-config.ts`

| Setting | Env var | Default |
|---------|---------|---------|
| Tier 1 (days 1–5) | `NEXT_PUBLIC_PRESALE_TIER1_USD` | `0.0003` |
| Tier 2 (days 6–10) | `NEXT_PUBLIC_PRESALE_TIER2_USD` | `0.0005` |
| Tier 3 (days 11–14) | `NEXT_PUBLIC_PRESALE_TIER3_USD` | `0.0008` |
| Public launch | `NEXT_PUBLIC_PUBLIC_LAUNCH_PRICE_USD` | `0.0015` |
| Window start (UTC) | `NEXT_PUBLIC_PRESALE_START_ISO` | *(you set)* |
| Window length | *(fixed in code)* | 14 days |

Display: `/presale` → **PresaleLivePricingBar**, tier cards, **StatusStrip**.

---

## Production values you must fill in

Copy from `web/.env.production.example` into your host (Vercel, etc.):

| Variable | Required | Example / notes |
|----------|----------|-----------------|
| `NEXT_PUBLIC_APP_ENV` | Yes | `production` |
| `NEXT_PUBLIC_SITE_URL` | Yes | `https://www.eyesopen.to` |
| `NEXT_PUBLIC_USE_ANVIL` | Yes | `false` |
| `NEXT_PUBLIC_CHAIN_ID` | Yes | `8453` (Base mainnet) |
| `NEXT_PUBLIC_CHAIN_NAME` | Yes | `Base` |
| `NEXT_PUBLIC_PRESALE_RECIPIENT` | Yes | `0x3dFf4ADfA6d7482e3fFB362Aa9d6370bCC45c4b5` |
| `NEXT_PUBLIC_PRESALE_START_ISO` | Yes | `2026-08-24T00:00:00.000Z` |
| `NEXT_PUBLIC_PRESALE_TIER*_USD` | Recommended | Keep Model B defaults unless intentional |
| `NEXT_PUBLIC_PUBLIC_LAUNCH_PRICE_USD` | Recommended | `0.0015` |
| `NEXT_PUBLIC_EYES_TOKEN_ADDRESS` | After deploy | Mainnet $EYES |
| `NEXT_PUBLIC_LAUNCH_FACTORY_ADDRESS` | After deploy | Mainnet factory |
| `NEXT_PUBLIC_FEE_COLLECTOR_ADDRESS` | After deploy | Mainnet collector |
| `NEXT_PUBLIC_FEATURE_WALLET` | Yes | `true` for live presale |
| `NEXT_PUBLIC_SOCIAL_*` | Recommended | X: `@eyesopenlaunch` · TG: invite link |

**Do not** copy `web/.env.local` (Anvil) to production.

---

## Vercel — set production env (project `eyes` → eyesopen.to)

### Option A — Dashboard (recommended)

1. Open [vercel.com](https://vercel.com) → project **eyes**
2. **Settings** → **Environment Variables**
3. For each variable below, add **Production** only (or Production + Preview if you want previews on Base mainnet too)
4. **Remove** any production vars that must not exist:
   - `NEXT_PUBLIC_USE_ANVIL` → must be `false` or deleted
   - `NEXT_PUBLIC_ANVIL_RPC_URL` → delete from Production
5. **Deployments** → latest production → **⋯** → **Redeploy** (required after env changes)

### Option B — CLI (from repo root, linked to `eyes`)

```powershell
cd C:\Users\Caras\Downloads\eyes-launchpad

# Set each locked value (Production). Repeat for every line in web/.env.production.example public vars.
echo production | npx vercel env add NEXT_PUBLIC_APP_ENV production
echo https://www.eyesopen.to | npx vercel env add NEXT_PUBLIC_SITE_URL production
echo false | npx vercel env add NEXT_PUBLIC_USE_ANVIL production
echo 8453 | npx vercel env add NEXT_PUBLIC_CHAIN_ID production
echo Base | npx vercel env add NEXT_PUBLIC_CHAIN_NAME production
echo 0x3dFf4ADfA6d7482e3fFB362Aa9d6370bCC45c4b5 | npx vercel env add NEXT_PUBLIC_PRESALE_RECIPIENT production
echo 2026-08-24T00:00:00.000Z | npx vercel env add NEXT_PUBLIC_PRESALE_START_ISO production
echo 0.0003 | npx vercel env add NEXT_PUBLIC_PRESALE_TIER1_USD production
echo 0.0005 | npx vercel env add NEXT_PUBLIC_PRESALE_TIER2_USD production
echo 0.0008 | npx vercel env add NEXT_PUBLIC_PRESALE_TIER3_USD production
echo 0.0015 | npx vercel env add NEXT_PUBLIC_PUBLIC_LAUNCH_PRICE_USD production
echo true | npx vercel env add NEXT_PUBLIC_FEATURE_WALLET production
echo https://x.com/eyesopenlaunch | npx vercel env add NEXT_PUBLIC_SOCIAL_X production
echo https://t.me/+WGZTDwqoswNlODMx | npx vercel env add NEXT_PUBLIC_SOCIAL_TELEGRAM production

npx vercel deploy --prod --yes
```

Deploy from **repo root** (project `eyes`), not `web/` alone.

### Anvil leak prevention (code + Vercel)

| Guard | Where |
|-------|--------|
| `IS_LOCAL_ANVIL` only if `APP_ENV=local` **and** `USE_ANVIL=true` **and** site URL is not eyesopen.to | `web/lib/chain-config.ts` |
| Wagmi uses `base` (8453) when `APP_ENV=production` | `web/lib/wagmi.ts` |
| Production **build fails** if `USE_ANVIL=true`, chain ≠ 8453, missing recipient/start, Anvil RPC set, or Anvil dev treasury as recipient | `web/next.config.ts` |
| Never copy `web/.env.local` to Vercel Production | ops rule |

---

## Local Anvil (coin testing)

```powershell
copy web\.env.anvil.example web\.env.local
.\scripts\sync-deploy-to-web.ps1 -Network anvil
cd web
npm run dev
```

Sync sets `NEXT_PUBLIC_APP_ENV=local` and contract addresses from `deployments/anvil.json`.

---

## Pre-launch verification

1. `npm run build` in `web/` with production env vars (dry-run on Vercel preview).
2. Open `/presale` — confirm **Current tier**, **Next tier**, **Launch price** match Model B.
3. Connect wallet — must show **Base**, not Anvil.
4. Confirm presale recipient matches your treasury (not `0xf39F…`).

---

## Related docs

- [`BRAND_ASSETS_CHECKLIST.md`](BRAND_ASSETS_CHECKLIST.md)
- [`LAUNCH_CHECKLIST.md`](LAUNCH_CHECKLIST.md)
- [`TOKENOMICS.md`](TOKENOMICS.md)
