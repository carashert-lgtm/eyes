# Indexer / Event Plan (Step 5 - Design)

Lightweight plan for tracking launches, LP locks, fees, and burns without a full frontend.

---

## Goals

- Operator dashboard data (not user-facing UI yet)
- Audit trail for testnet soak
- Inputs for future frontend

---

## Events to index (on-chain)

### EyesLaunchFactory

| Event | Use |
|-------|-----|
| `LaunchCreated` | New fair launch registered |
| `LiquidityLockCommitted` | 100% LP locked |
| `LiquiditySeeded` | Launch LP seeded |
| `LaunchesEnabledUpdated` | Kill-switch changes |
| `LauncherApprovalUpdated` | Whitelist changes |

### EyesFeeCollector

| Event | Use |
|-------|-----|
| `FeesReceived` | Per-swap fee split |
| `BuyAndBurnQueued` | Burn queue increased |

### EyesBuyBurnExecutor

| Event | Use |
|-------|-----|
| `BuyAndBurnExecuted` | EYES burned, supply reduced |

### EyesLiquidityLocker

| Event | Use |
|-------|-----|
| `LiquidityPermanentlyLocked` | Permanent lock proof |

---

## Recommended stack (pick one later)

### Option A - Simple (fastest)

Python script + `eth_getLogs` polling:

```
ops/indexer/poll_events.py
  -> append JSON lines to data/events.jsonl
  -> optional: print daily summary
```

### Option B - Subgraph (production)

- The Graph on Base Sepolia (when available)
- Entities: `Launch`, `Lock`, `FeeReceipt`, `Burn`

### Option C - Alchemy / QuickNode webhooks

- Subscribe to contract addresses
- POST to small API endpoint

---

## Minimal schema (JSONL)

```json
{"type":"launch","launchId":1,"token":"0x...","creator":"0x...","ts":1234567890}
{"type":"lock","launchId":1,"pair":"0x...","lpAmount":"123...","ts":1234567891}
{"type":"fee","launchId":1,"burnShare":"1000000000000000","creatorShare":"...","ts":1234567892}
{"type":"burn","ethSpent":"1000000000000000","eyesBurned":"1000000000000000000","ts":1234567893}
```

---

## Implementation status

- [x] Events emitted from contracts
- [x] `VerifyDeployment.s.sol` for point-in-time stats
- [ ] `ops/indexer/poll_events.py` scaffold
- [ ] Subgraph manifest
- [ ] Ops dashboard

---

## Next build step (after first testnet success)

1. Scaffold `ops/indexer/poll_events.py` reading last N blocks
2. Store `data/events.jsonl` (gitignored)
3. Add summary command: total burns, total fees, launch count
