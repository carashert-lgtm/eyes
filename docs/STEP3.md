# Step 3 — Base Sepolia Testnet Deployment

This guide walks through deploying Eyes Open to **Base Sepolia**, seeding the **$EYES/WETH** pool, and running the **full end-to-end demo**.

---

## What you need

| Item | Details |
|------|---------|
| **Foundry** | [Install Foundry](https://book.getfoundry.sh/getting-started/installation) |
| **Base Sepolia ETH** | [Base Sepolia faucet](https://www.alchemy.com/faucets/base-sepolia) |
| **RPC URL** | Alchemy/Infura Base Sepolia endpoint |
| **Private key** | Test wallet only — never use a mainnet key |

---

## Base Sepolia addresses (pre-configured)

| Contract | Address |
|----------|---------|
| Chain ID | `84532` |
| Uniswap V2 Factory | `0x7Ae58f10f7849cA6F5fB71b7f45CB416c9204b1e` |
| Uniswap V2 Router02 | `0x1689E7B1F10000AE47eBfE339a4f69dECd19F602` |
| WETH | Read at runtime via `router.WETH()` |

Source: [BaseHub ecosystem contracts](https://basehub.org/network/ecosystem-contracts/)

---

## 1. Configure environment

```bash
cd eyes-launchpad
cp .env.example .env
```

Edit `.env`:

```env
BASE_SEPOLIA_RPC_URL=https://base-sepolia.g.alchemy.com/v2/YOUR_KEY
DEPLOYER_PRIVATE_KEY=0xYOUR_TESTNET_KEY

# Defaults to msg.sender during deploy if unset
EYES_TREASURY=0xYourDeployerAddress

# Optional — defaults to Base Sepolia router in scripts
UNISWAP_V2_ROUTER=0x1689E7B1F10000AE47eBfE339a4f69dECd19F602
```

Install dependencies:

```bash
forge install OpenZeppelin/openzeppelin-contracts foundry-rs/forge-std --no-commit
forge build
```

---

## 2. Deploy all core contracts

```bash
forge script script/DeployEyes.s.sol:DeployEyes \
  --rpc-url $BASE_SEPOLIA_RPC_URL \
  --broadcast \
  --private-key $DEPLOYER_PRIVATE_KEY \
  -vvvv
```

**Output:**
- Console logs all contract addresses
- Writes `deployments/base-sepolia.json`

Copy addresses into `.env`:

```env
EYES_TOKEN=0x...
EYES_FEE_COLLECTOR=0x...
EYES_FACTORY=0x...
EYES_FEE_ROUTER=0x...
EYES_BUY_BURN_EXECUTOR=0x...
EYES_LIQUIDITY_LOCKER=0x...
EYES_LIQUIDITY_SEEDER=0x...
```

---

## 3. Seed $EYES/WETH platform liquidity

Required so **buy & burn** can swap queued ETH → $EYES.

```env
EYES_LP_TOKEN_AMOUNT=1000000000000000000000000   # 1M EYES
EYES_LP_ETH_AMOUNT=10000000000000000              # 0.01 ETH
```

If `EYES_TREASURY` is not the broadcaster, approve the deployer first:

```bash
cast send $EYES_TOKEN "approve(address,uint256)" $DEPLOYER $EYES_LP_TOKEN_AMOUNT \
  --rpc-url $BASE_SEPOLIA_RPC_URL --private-key $TREASURY_PRIVATE_KEY
```

Run seed script:

```bash
forge script script/SeedEyesLiquidity.s.sol:SeedEyesLiquidity \
  --rpc-url $BASE_SEPOLIA_RPC_URL \
  --broadcast \
  --private-key $DEPLOYER_PRIVATE_KEY \
  -vvvv
```

---

## 4. Run end-to-end demo

Creates a test launch, locks LP, swaps via fee router, executes buy & burn.

Optional tuning:

```env
DEMO_LAUNCH_ETH=5000000000000000        # 0.005 ETH
DEMO_LAUNCH_TOKENS=500000000000000000000000000
DEMO_SWAP_ETH=1000000000000000          # 0.001 ETH
DEMO_EYES_WINDOW_SECONDS=3600
```

Run:

```bash
forge script script/EyesE2EDemo.s.sol:EyesE2EDemo \
  --rpc-url $BASE_SEPOLIA_RPC_URL \
  --broadcast \
  --private-key $DEPLOYER_PRIVATE_KEY \
  -vvvv
```

**Expected result:**
- New launch token deployed
- LP permanently locked in `EyesLiquidityLocker`
- Swap generates creator fee + burn queue
- `executeBuyAndBurn` reduces `$EYES` total supply

---

## Windows (PowerShell) helper

```powershell
cd C:\Users\Caras\Downloads\eyes-launchpad
.\scripts\deploy-base-sepolia.ps1 -Step deploy
.\scripts\deploy-base-sepolia.ps1 -Step seed
.\scripts\deploy-base-sepolia.ps1 -Step e2e
```

---

## Ownership (testnet vs mainnet)

| Contract | Testnet owner | Mainnet recommendation |
|----------|---------------|------------------------|
| `EyesLaunchFactory` | Deployer EOA | Gnosis Safe 2/3+ multisig |
| `EyesFeeCollector` | Deployer EOA | Multisig + timelock on router allowlist |
| `EyesFeeRouter` | Deployer EOA | Multisig |
| `EyesBuyBurnExecutor` | Deployer EOA | Multisig or automated keeper with caps |
| `EyesToken` | Deployer EOA | Multisig if admin functions added |
| `EyesLiquidityLocker` | No owner | Immutable — by design |

Owner-only functions today:
- `factory.closeEyesWindow`, `setApprovedBuySource`, `setFeeRouter`
- `collector.setFeeRouter`, `setBuyBurnExecutor`
- `executor.setMaxSlippageBps`

---

## Verify on BaseScan (optional)

```bash
forge verify-contract $EYES_TOKEN src/EyesToken.sol:EyesToken \
  --chain base-sepolia --constructor-args $(cast abi-encode "constructor(address)" $EYES_TREASURY)
```

Set `BASESCAN_API_KEY` in `.env` for automated verification via `--verify`.

---

## Troubleshooting

| Issue | Fix |
|-------|-----|
| `database is locked` / insufficient ETH | Fund wallet from Base Sepolia faucet |
| Buy & burn does nothing | Run `SeedEyesLiquidity` first — needs EYES/WETH pool |
| Swap reverts during Eyes Window | Ensure pair is approved (automatic after `seedLiquidity`) |
| `EyesScript: unexpected chain` | Use Base Sepolia RPC (chain ID 84532) |

---

## Step 4 (next)

1. **Mainnet readiness** — multisig ownership transfer scripts + timelock
2. **Keeper bot** — automate `executeBuyAndBurn` when queue exceeds threshold
3. **Subgraph / indexer** — launches, locks, fees, burns
4. **Launch policy** — allowlist or stake-to-launch mechanism
5. **Frontend** — launch UI + swap UI routing through `EyesFeeRouter`

No frontend in Step 4 unless explicitly requested — backend/indexer first is recommended.
