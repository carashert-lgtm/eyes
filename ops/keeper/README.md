# Eyes Keeper (scaffold)

## Recommended (works today)

Use the Foundry keeper script:

```powershell
cd C:\Users\Caras\Downloads\eyes-launchpad
.\scripts\deploy-base-sepolia.ps1 -Step keeper
```

Run on a schedule with Windows Task Scheduler every 5-15 minutes.

## Python scaffold

`keeper.py` is a placeholder for future Discord alerts and direct RPC calls.

```powershell
python ops/keeper/keeper.py
```

Full Python tx signing will be added in a later step. Use Foundry keeper for now.

See `docs/KEEPER_DESIGN.md`.
