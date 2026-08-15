# Eyes Open - Windows Setup (Start Here)

This guide gets you from **zero** to a working local build and Base Sepolia testnet deploy on Windows.

---

## 1. Install tools (one time)

### Foundry (forge, cast)

Already installed on this machine at:

```
C:\Users\Caras\.foundry\bin
```

If `forge` is not recognized, **close and reopen** PowerShell/Cursor, then:

```powershell
$env:Path = "$env:USERPROFILE\.foundry\bin;$env:Path"
forge --version
```

Manual reinstall (if needed): download `foundry_v1.7.1_win32_amd64.zip` from  
https://github.com/foundry-rs/foundry/releases and extract to `%USERPROFILE%\.foundry\bin`.

### Git

Required for `forge install`. Install:

```powershell
winget install Git.Git
```

Close/reopen terminal, then:

```powershell
git --version
```

---

## 2. Clone / open the repo

```powershell
cd C:\Users\Caras\Downloads\eyes-launchpad
```

---

## 3. Install Solidity dependencies

```powershell
forge install OpenZeppelin/openzeppelin-contracts foundry-rs/forge-std
```

If Git is missing, dependencies may already exist in `lib/` from a prior setup.

---

## 4. Build and test locally

```powershell
forge build
forge test
```

**Success looks like:** `Compiler run successful` and all tests passing.

---

## 5. Configure `.env`

```powershell
copy .env.example .env
notepad .env
```

Minimum required:

```env
BASE_SEPOLIA_RPC_URL=https://sepolia.base.org
DEPLOYER_PRIVATE_KEY=0xYOUR_TEST_WALLET_KEY
EYES_TREASURY=0xYOUR_WALLET_ADDRESS
```

Use a **test-only wallet**. Never paste a mainnet key.

Get Base Sepolia ETH: https://www.alchemy.com/faucets/base-sepolia

---

## 6. First run (recommended path)

From the repo folder:

```powershell
.\scripts\first-run.ps1
```

This runs: doctor -> build -> test -> deploy -> seed -> e2e -> verify

Or step-by-step:

```powershell
.\scripts\deploy-base-sepolia.ps1 -Step doctor
.\scripts\deploy-base-sepolia.ps1 -Step build
.\scripts\deploy-base-sepolia.ps1 -Step deploy
# merge deployments/base-sepolia.env into .env
.\scripts\deploy-base-sepolia.ps1 -Step seed
.\scripts\deploy-base-sepolia.ps1 -Step e2e
.\scripts\deploy-base-sepolia.ps1 -Step verify
```

---

## Common failures and fixes

| Problem | Fix |
|---------|-----|
| `forge` not recognized | Restart terminal; add `%USERPROFILE%\.foundry\bin` to PATH |
| `git` not recognized | Install Git via winget; restart terminal |
| `forge install` fails | Run `git --version` first; ensure internet access |
| `PreflightFailed: balance too low` | Get Base Sepolia ETH from faucet |
| `Missing deployments/base-sepolia.json` | Run `-Step deploy` first |
| `EYES_TOKEN is not a contract` | Merge `deployments/base-sepolia.env` into `.env` |
| `Buy & burn` does nothing | Run `-Step seed` first (EYES/WETH pool) |
| Unicode compile error in scripts | Fixed - scripts use ASCII `-` only |
| `forge install --no-commit` error | Omit `--no-commit` (Foundry 1.7+) |

---

## Next docs

- **Testnet operations:** `docs/TESTNET_OPERATOR_GUIDE.md`
- **Ownership / multisig:** `docs/OWNERSHIP.md`
- **Keeper bot (future):** `docs/KEEPER_DESIGN.md` + `ops/keeper/`
- **Indexer plan (future):** `docs/INDEXER_PLAN.md`
