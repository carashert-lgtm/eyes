# Keeper Bot Design (Step 5 - Scaffold)

Minimal keeper to repeatedly call `executeBuyAndBurnAuto()` when fees accumulate.

---

## Responsibilities

1. Poll `burnQueueStatus()` on `EyesBuyBurnExecutor`
2. If `ready == true`, submit `executeBuyAndBurnAuto()` transaction
3. Log tx hash, ETH spent, EYES burned
4. Skip quietly when queue is below threshold

---

## Architecture

```
ops/keeper/keeper.py
    |
    |-- read .env (RPC, private key, executor address)
    |-- eth_call burnQueueStatus()
    |-- if ready: send executeBuyAndBurnAuto()
    +-- log result
```

Alternative: run Foundry script on cron:

```powershell
.\scripts\deploy-base-sepolia.ps1 -Step keeper
```

Use **Python keeper** when you want Discord/webhook alerts without broadcasting via forge each time.

---

## Config (`.env`)

```env
BASE_SEPOLIA_RPC_URL=
KEEPER_PRIVATE_KEY=          # can match deployer on testnet
EYES_BUY_BURN_EXECUTOR=
KEEPER_POLL_SECONDS=300
KEEPER_DRY_RUN=false
```

---

## Safety (testnet vs mainnet)

| Setting | Testnet | Mainnet |
|---------|---------|---------|
| Key | Dedicated test EOA | Dedicated keeper EOA with limited ETH |
| `minProceedsEth` | Low (0.0001 ETH) | Higher to avoid dust txs |
| Alerts | Optional | Required (Discord/PagerDuty) |
| Dry run | Useful | Mandatory before go-live |

---

## Implementation status

- [x] On-chain: `burnQueueStatus()`, `executeBuyAndBurnAuto()`
- [x] Forge script: `RunKeeper.s.sol`
- [x] Scaffold: `ops/keeper/keeper.py` (manual/cron)
- [ ] Discord webhook notifications
- [ ] Systemd / Task Scheduler install docs

See `ops/keeper/README.md` for run instructions.
