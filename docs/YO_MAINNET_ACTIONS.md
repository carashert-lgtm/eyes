# What Yo needs to do — mainnet security checklist

Simple list. Everything else is either done in code or blocked on your input.

---

## Done for you (in repo / Railway / Vercel push)

- [x] **On-chain status table** on `/tokenomics` (what is live vs pending)
- [x] **Security & audit** legal page at `/legal/security-audit`
- [x] **BaseScan verify script** — `.\scripts\verify-basescan-mainnet.ps1`
- [x] **Ownership transfer script** — `.\scripts\transfer-token-ownership-mainnet.ps1`
- [x] **Deployer address** on Vercel (transparency only)

---

## You do these (in order)

### 1. BaseScan verify — DONE

Verified on Base: https://basescan.org/address/0xC845770d0f437B93886E152566EE926Aa9153C9e#code

To re-run locally:

```powershell
.\scripts\verify-basescan-mainnet.ps1
```

---

### 2. Gnosis Safe on Base — ~10 minutes

1. Go to https://app.safe.global — switch network to **Base**
2. Create a new Safe (recommend **2-of-3** signers)
3. Copy the Safe address (starts with `0x…`)
4. Send me **only the Safe address** (never private keys or seed phrases)

We will set `NEXT_PUBLIC_MULTISIG_ADDRESS` on Vercel and run ownership transfer.

**Optional:** You can make the Safe a signer on treasury later; today treasury (`0x3dFf…`) stays your MetaMask “Treasury” account for presale sends.

---

### 3. Transfer token ownership to Safe — after step 2

In repo `.env`:

```
NEW_OWNER=0xYOUR_SAFE_ADDRESS
```

Run (uses **Deployer** MetaMask key from `.env`, not Treasury):

```powershell
.\scripts\transfer-token-ownership-mainnet.ps1 -SafeAddress 0xYOUR_SAFE_ADDRESS
```

Confirm on BaseScan: `owner()` on the token contract = Safe address.

---

### 4. External audit — book a vendor (I cannot do this for you)

Pick one and request scope: **Eyes Open launch stack** (factory, fee collector, LP locker, buy/burn).

| Vendor | Notes |
|--------|--------|
| [OpenZeppelin](https://www.openzeppelin.com/security-audits) | Common for ERC-20 + DeFi |
| [Cyfrin](https://www.cyfrin.io/) | Strong Foundry shops |
| [Code4rena](https://code4rena.com/) | Competitive audit / bug bounty |

When you have a report URL, send it and we set:

```
NEXT_PUBLIC_AUDIT_REPORT_URL=https://...
```

on Vercel. Until then the site honestly says **audit not published**.

---

### 5. Launch factory + fee collector — NOT optional fake addresses

These contracts **do not exist on mainnet yet**. Only `$EYES` token was deployed (presale phase).

**Do not** put Anvil addresses on Vercel — that would lie to users.

Full deploy happens **after audit + Base Sepolia soak**, via `DeployEyes.s.sol`. Then we add:

```
NEXT_PUBLIC_LAUNCH_FACTORY_ADDRESS=0x...
NEXT_PUBLIC_FEE_COLLECTOR_ADDRESS=0x...
```

If you want to **skip audit and deploy full stack now anyway**, say so explicitly — that is a product/risk decision, not a config fix.

---

## What to send me (safe to paste in chat)

| Item | Example |
|------|---------|
| Gnosis Safe address | `0xabc…` |
| Audit report URL | when ready |
| “Verify done” | screenshot or BaseScan link |

## Never send me

- Seed phrases  
- Private keys (Treasury, Deployer, or Safe)  
- Safe signer keys  

---

## Quick status

| Item | Status |
|------|--------|
| $EYES on Base | Live `0xC845770…` |
| BaseScan verify | **Done** — [view on BaseScan](https://basescan.org/address/0xC845770d0f437B93886E152566EE926Aa9153C9e#code) |
| Factory / collector | Pending full deploy |
| Multisig | **You create Safe → we transfer** |
| Audit published | **You book vendor** |
| Presale | Works via treasury wallet (no factory needed) |
