# $EYES Tokenomics (Official)

**Eyes Open. No Snipers. No Games.**

This document is the canonical reference for the public tokenomics model. User-facing copy, contracts, and scripts should match this.

---

## Supply

| Item | Value |
|------|-------|
| Token | $EYES (Eyes Open) |
| Total supply | 1,000,000,000 |
| Minting | Once at deploy — no further mint |
| Owner allocation | **10%** (100,000,000 $EYES) — disclosed upfront |

### Owner allocation breakdown (10%)

| Recipient | Share | Tokens |
|-----------|-------|--------|
| Owner | 10% | 100,000,000 $EYES |
| **Total owner allocation** | **10%** | **100,000,000 $EYES** |

Vesting and unlocks are operational (Team Space / Discord), not a hidden mint. Public presale cap is separate (see presale config).

### Supply budget (reference)

| Bucket | Share | Tokens (approx.) |
|--------|-------|------------------|
| Owner allocation | 10% | 100M |
| Public presale cap | 20% | 200M (max via presale) |
| Remaining (treasury / LP / ecosystem) | 70% | 700M |

---

## Trading fee (platform-launched tokens)

Every swap routed through **`EyesFeeRouter`** pays a **1% trading fee** on volume.

Constants in `src/EyesTypes.sol`:

| Constant | Value | Meaning |
|----------|-------|---------|
| `DEFAULT_TOTAL_FEE_BPS` | `100` | 1% of swap amount |
| `DEFAULT_CREATOR_FEE_BPS` | `5000` | 50% of the fee → creator |
| `DEFAULT_BURN_FEE_BPS` | `5000` | 50% of the fee → buy & burn queue |
| `DEFAULT_PROTOCOL_FEE_BPS` | `0` | 0% by default |

---

## Fee split (official model)

Of the **1% trading fee**:

```
100% of fee
├── 50% → Launch creator (ETH, instant payout)
└── 50% → Buy & burn $EYES (ETH queued → swap → burn)
```

**Example:** 1 ETH swap → 0.01 ETH fee → 0.005 ETH to creator + 0.005 ETH to burn queue.

Launch tokens are **not** burned by default. Deflation applies to **$EYES** via the buy-and-burn executor.

---

## Pre-launch growth pool (not on-chain tokenomics)

The **14-day launch support window** and optional **community bootstrap contributions** are **operational** — they fund launch visibility and distribution before public go-live.

| Property | Value |
|----------|-------|
| Duration | 14 days before public launch |
| Allocation | **100%** → launch growth (content, community, visibility, outreach, campaigns) |
| On-chain fee model | **Unchanged** — still 1% with 50% creator / 50% buy & burn |
| Relationship | **Independent** from `EyesFeeRouter`, `EyesFeeCollector`, and burn queue |

This mechanism does **not** modify `DEFAULT_CREATOR_FEE_BPS`, `DEFAULT_BURN_FEE_BPS`, or per-launch `FeeConfig`. Public copy: [`MESSAGING_KIT.md`](MESSAGING_KIT.md) · Website: `/launch-support`

---

## Buy & burn flywheel

1. Trader swaps via `EyesFeeRouter`
2. `EyesFeeCollector` splits fee 50/50
3. Burn share accumulates in `accumulatedBurnProceeds`
4. `EyesBuyBurnExecutor` (keeper) swaps queued ETH → $EYES and burns

---

## Where the fee split is defined (consistency checklist)

| Location | What it controls |
|----------|------------------|
| `src/EyesTypes.sol` | Default BPS constants (`5000` / `5000` / `0`) |
| `src/EyesLaunchFactory.sol` | Applies defaults when `creatorFeeBps` / `burnFeeBps` are `0`; writes per-launch `FeeConfig` |
| `src/EyesFeeCollector.sol` | Splits incoming fee ETH by `creatorBps` / `burnBps` / `protocolBps` |
| `src/trading/EyesFeeRouter.sol` | Skims 1% and calls `distributeFees` |
| `script/EyesE2EDemo.s.sol` | Demo launch uses factory defaults (`0` / `0` → 50/50) |
| `test/*.t.sol` | Tests use defaults or explicit `5000`/`5000` |
| `web/app/tokenomics/page.tsx` | Public tokenomics page |
| `web/components/tokenomics/*` | Tokenomics section copy and diagrams |
| `web/components/sections/Token.tsx` | Landing page $EYES summary |
| `web/app/launch-support/page.tsx` | Pre-launch growth pool (separate from fees) |
| `web/components/sections/LaunchSupport.tsx` | Landing launch support section |
| `docs/TOKENOMICS.md` | This file |
| `docs/STEP2.md` | Operator fee flow diagram |

The `protocolBps` field remains in `FeeConfig` for optional future use but is **0** in the official model and should not appear in main public marketing.

---

## Per-launch overrides

`EyesLaunchFactory.createLaunch()` accepts `creatorFeeBps` and `burnFeeBps` in `LaunchConfig`. Passing **`0` for both** uses the 50/50 defaults. Custom splits must still satisfy `creatorFeeBps + burnFeeBps ≤ 10_000`.

---

## Related docs

- `docs/STEP2.md` — fee router and executor flow
- `docs/TESTNET_OPERATOR_GUIDE.md` — keeper and burn queue ops
- `web/README.md` — run the marketing site locally
