# Ownership & Admin Safety

## Testnet (current)

On deploy, **`msg.sender` (your deployer EOA)** owns:

| Contract | Owner controls |
|----------|----------------|
| `EyesToken` | Ownable (no admin mint — supply fixed at deploy) |
| `EyesLaunchFactory` | Launches policy, window close, buy sources, module addresses |
| `EyesFeeCollector` | Fee router allowlist, buy/burn executor wiring |
| `EyesFeeRouter` | Manual `registerLaunchToken` override (factory auto-registers) |
| `EyesBuyBurnExecutor` | Params via **fee collector owner** (`setMinProceedsEth`, `setMaxSlippageBps`) |

**No owner (by design):**

| Contract | Notes |
|----------|--------|
| `EyesLiquidityLocker` | Permanent LP vault — no withdraw, no owner |
| `EyesLiquiditySeeder` | Immutable wiring only |

---

## Moving to a multisig (mainnet prep)

### 1. Create Gnosis Safe

- Use [Safe on Base](https://app.safe.global)
- 2-of-3 or 3-of-5 recommended for production
- Copy Safe address → `NEW_OWNER` in `.env`

### 2. Run transfer script

```powershell
.\scripts\deploy-base-sepolia.ps1 -Step transfer
```

This calls `transferOwnership(newOwner)` on:

- `EyesToken`
- `EyesFeeCollector`
- `EyesLaunchFactory`
- `EyesFeeRouter`

### 3. Verify

```bash
cast call $EYES_FACTORY "owner()(address)" --rpc-url $BASE_SEPOLIA_RPC_URL
# Must return your Safe address
```

Repeat for collector, fee router, eyes token.

### 4. Revoke deployer EOA access

After transfer, deployer EOA should **fail** owner checks:

```bash
cast send $EYES_FACTORY "setLaunchesEnabled(bool)" false --private-key $OLD_DEPLOYER_KEY
# Should revert: OwnableUnauthorizedAccount
```

---

## Critical admin functions (protect with multisig + timelock on mainnet)

### EyesLaunchFactory

| Function | Risk |
|----------|------|
| `setLaunchesEnabled` | Kill-switch for new launches |
| `setLauncherWhitelistEnabled` | Gate who can launch |
| `setLauncherApproved` | Allow/deny launchers |
| `closeEyesWindow` | End gated period early |
| `setApprovedBuySource` | Alter Eyes Window transfer rules |
| `setFeeRouter` | Change fee-taking swap wrapper |
| `setLiquiditySeeder` | One-time wiring (already set) |

### EyesFeeCollector

| Function | Risk |
|----------|------|
| `setFeeRouter` | Allow malicious router to drain fake fees |
| `setBuyBurnExecutor` | One-time wiring (currently one-shot) |
| `setFactory` | One-time wiring |

### EyesFeeRouter

| Function | Risk |
|----------|------|
| `registerLaunchToken` | Owner override of launch mapping |

### EyesBuyBurnExecutor (via collector owner)

| Function | Risk |
|----------|------|
| `setMinProceedsEth` | Keeper frequency |
| `setMaxSlippageBps` | Swap slippage tolerance |

---

## Recommended mainnet path

```
Deploy (EOA)
    → Testnet soak test (1–2 weeks)
    → TransferOwnership → Gnosis Safe
    → Timelock wrapper for factory + collector admin (Step 5+)
    → Public launch
```

**Do not** transfer ownership until:

- E2E testnet cycle passes repeatedly
- Keeper bot runs reliably
- Team agrees on launch whitelist policy

---

## Timelock (future — not implemented)

For mainnet, wrap owner-only calls behind a timelock (e.g. 24–48h delay):

- `setLaunchesEnabled(false)` — immediate kill-switch exception
- `setFeeRouter` — timelock required
- `setLauncherApproved` — timelock optional

Track as Step 5 infrastructure work.
