# Eyes Open — Launch Checklist

**Use this before any public milestone** (testnet reveal, website launch, first curated launch, or $EYES mainnet).

Check `[ ]` → `[x]` as you go. Do not skip **Smart contract readiness** or **Tokenomics consistency** for marketing milestones.

---

## How to use this doc

| Milestone | Minimum sections required |
|-----------|---------------------------|
| Public testnet announcement | Branding, Website, Contracts, Tokenomics, Social, Pre-launch tests |
| Website + community go-live | All except Launch-day sequence (use preview mode) |
| First curated launch | All sections |
| $EYES mainnet | All sections + audit sign-off + multisig |

---

## 1. Branding complete

- [ ] **Name locked:** Eyes Open
- [ ] **Ticker locked:** $EYES
- [ ] **Slogan locked:** Eyes Open. No Snipers. No Games.
- [ ] **Voice guide understood:** clean/premium first, sharp edge — see `MESSAGING_KIT.md`
- [ ] **Logo / mark** usable at 32px (X avatar) and 512px (TG icon)
- [ ] **Colors aligned** with website (dark UI, cyan accent, rose edge) — no off-brand neon meme palette
- [ ] **Slogan appears** on landing hero + tokenomics + social bios
- [ ] **No conflicting names** in old docs, repos, or account handles

---

## 2. Website complete

- [ ] **Landing page live** (`web/` deployed or hosted)
- [ ] **Tokenomics page live** at `/tokenomics`
- [ ] **Mobile check** on iOS + Android browser (hero, nav, CTAs readable)
- [ ] **Links work:** header/footer → home anchors, tokenomics, launch CTA
- [ ] **Metadata set:** title + description for SEO/social preview
- [ ] **Launch App CTA** clearly labeled if app not ready (e.g. “Coming soon” or points to docs — no dead click)
- [ ] **HTTPS** enabled on production domain
- [ ] **Analytics** (optional): Plausible or similar — privacy-friendly, one script

**Copy audit:**
- [ ] Landing + tokenomics say **50/50** fee split (not 30/30/40)
- [ ] No **protocol reserve** in public copy
- [ ] **1B fixed supply** stated correctly
- [ ] **No team allocation** claimed unless explicitly added on-chain

---

## 3. Smart contract readiness

### Local / CI
- [ ] `forge build` passes
- [ ] `forge test` — all tests green (13+)
- [ ] Dependencies installed (`lib/openzeppelin-contracts`, `lib/forge-std`)

### Testnet deploy (Base Sepolia)
- [ ] `.env` configured (`BASE_SEPOLIA_RPC_URL`, `DEPLOYER_PRIVATE_KEY`, `EYES_TREASURY`)
- [ ] `.\scripts\first-run.ps1` OR full step cycle completed successfully
- [ ] `deployments/base-sepolia.json` exists with all addresses
- [ ] `deployments/base-sepolia.env` merged into operator `.env`
- [ ] **EYES/WETH pool seeded** (`-Step seed`)
- [ ] **E2E demo passed** (`-Step e2e`) — launch → lock → swap → burn
- [ ] **Verify script clean** (`-Step verify`)
- [ ] **Keeper tested** (`-Step keeper`) at least once with queued fees

### Verification & transparency
- [ ] Contracts **verified on BaseScan** (Sepolia)
- [ ] Public doc or pin lists **all contract addresses**
- [ ] **Ownership documented** — who owns factory/collector/router (`docs/OWNERSHIP.md`)
- [ ] **Testnet disclaimer** visible in community pin (“not mainnet”)

### Before mainnet only
- [ ] **1–2 week testnet soak** with scheduled keeper
- [ ] **External audit** completed or explicitly scheduled with date
- [ ] **Multisig ownership transfer** planned (`-Step transfer` + `NEW_OWNER`)
- [ ] **Launch policy** reviewed (kill-switch, whitelist) for production use
- [ ] **Incident plan:** who can pause launches, how community is notified

---

## 4. Tokenomics consistency

Cross-check against [`TOKENOMICS.md`](TOKENOMICS.md):

- [ ] **1% trading fee** — stated everywhere
- [ ] **50% creator / 50% buy & burn** — website, messaging kit, social posts
- [ ] **0% protocol** in public story
- [ ] **1,000,000,000 $EYES** fixed supply
- [ ] **No team allocation** in public story
- [ ] **Launch tokens not burned** — only $EYES buy/burn (avoid confusion)
- [ ] On-chain defaults match: `DEFAULT_CREATOR_FEE_BPS = 5000`, `DEFAULT_BURN_FEE_BPS = 5000`
- [ ] **Launch support pool** described as separate from 50/50 fee split on site + docs
- [ ] Demo/test launches use factory defaults (`creatorFeeBps: 0`, `burnFeeBps: 0`)
- [ ] No investment / ROI language for pre-launch growth pool

**Quick grep (operator):**
```powershell
# Should return no user-facing 30/30/40 or protocol reserve marketing
rg "30/30|protocol reserve|4000|creatorFeeBps: 3000" docs web/components --glob "!node_modules"
```

---

## 5. Social accounts / community setup

### X (Twitter)
- [ ] Handle secured (consistent with brand, e.g. `@EyesOpenXYZ`)
- [ ] Display name: **Eyes Open** or **Eyes Open | $EYES**
- [ ] Bio from `MESSAGING_KIT.md` (includes link)
- [ ] Banner: dark brand, slogan or mechanism line (not price chart)
- [ ] **Pinned post** drafted and ready
- [ ] Link in bio → website or tokenomics

### Telegram
- [ ] Group or channel created
- [ ] Admin accounts secured (2FA on all admin phones)
- [ ] **Pinned message:** website, tokenomics, disclaimer, testnet/mainnet status
- [ ] Basic rules posted (no shilling, no financial advice, no scam links)
- [ ] Slow mode enabled if >100 members expected on day one

### Discord (optional)
- [ ] Only create if you can moderate daily
- [ ] Roles + `#announcements` read-only
- [ ] Same pin content as Telegram

### Cross-platform
- [ ] **Same links** everywhere (one canonical URL)
- [ ] **Same milestone language** (don’t say mainnet on X and testnet in TG)
- [ ] **Response template** for “wen token?” → link tokenomics + timeline honesty

---

## 6. Launch Support Window (14-day pre-launch)

Complete **before opening** the window. See [`MESSAGING_KIT.md`](MESSAGING_KIT.md) for approved copy.

### Setup
- [ ] **Dates locked:** 14-day window start (Day -14) and end (Day -1) in UTC
- [ ] **Landing section live** (`/#launch-support`) + **dedicated page** (`/launch-support`)
- [ ] **Allocation intent published** — 100% to visibility / distribution categories
- [ ] **Contribution method ready** (wallet, form, or platform — your choice) + tested
- [ ] **Treasury / ops wallet** separate from deployer contract keys where possible
- [ ] **Legal disclaimer** on page: not financial advice, not an investment product
- [ ] **FAQ posted** in TG pin linking `/launch-support`

### Messaging
- [ ] All copy uses **launch support window** / **bootstrap contribution** / **growth pool**
- [ ] No words: invest, ROI, returns, guaranteed, profit, moon, rich
- [ ] **Explicit separation** from 50/50 trading-fee tokenomics in every public post
- [ ] X + TG templates from messaging kit loaded in drafts
- [ ] Admins trained on FAQ: “Is this an investment?” → No, operational support

### Tracking (simple spreadsheet)
- [ ] Daily: contributions received (amount optional to publish publicly)
- [ ] Daily: new TG/X followers during window
- [ ] Log questions/objections for FAQ updates
- [ ] Screenshot website + pin on Day -14 for records

### During window (Days -14 to -1)
- [ ] Pin stays current with **days remaining**
- [ ] 1 educational post every 2–3 days (not daily contribution pressure)
- [ ] Respond with doc links — do not improvise economics
- [ ] No price talk, no outcome promises

### Window close → public launch transition
- [ ] Post **“window closed”** on X + TG (exact timestamp)
- [ ] Publish **allocation recap** (categories funded — factual)
- [ ] Update website CTA to **closed** or remove contribute button
- [ ] Shift marketing calendar to **§8 Launch-day** in `MARKETING_PLAN.md`
- [ ] Confirm tokenomics messaging still **50/50** — unchanged by support pool

---

## 7. Content assets needed

Minimum asset pack before public launch:

| Asset | Format | Status |
|-------|--------|--------|
| Logo (square) | PNG 512×512 | [ ] |
| Banner (X) | 1500×500 | [ ] |
| Eyes Window explainer | 1 graphic or site screenshot | [ ] |
| Fee split 50/50 graphic | Site screenshot or export | [ ] |
| Buy/burn loop graphic | From `/tokenomics` | [ ] |
| Launch thread | 5–7 tweets pre-written | [ ] |
| Pin post | 1 tweet pre-written | [ ] |
| TG welcome / pin | 1 message pre-written | [ ] |
| Launch support page | `/launch-support` live | [ ] |
| Support window FAQ | From MESSAGING_KIT | [ ] |
| Contract address card | Text block for copy-paste | [ ] |
| Testnet proof tx | BaseScan link(s) | [ ] |

**Nice to have (not blocking):**
- Short screen recording of E2E demo (30–60 sec)
- One-page PDF “How Eyes Open works” for builders

---

## 8. Pre-launch tests

Run **48 hours before** public announcement:

### Operator scripts
```powershell
cd eyes-launchpad
.\scripts\deploy-base-sepolia.ps1 -Step doctor
.\scripts\deploy-base-sepolia.ps1 -Step build
.\scripts\deploy-base-sepolia.ps1 -Step verify
.\scripts\deploy-base-sepolia.ps1 -Step keeper
```

- [ ] Doctor: RPC OK, balance OK, router bytecode found
- [ ] Build + tests pass
- [ ] Verify: launch count, burn queue, keeper readiness readable
- [ ] Keeper: executes or cleanly skips with actionable message

### Website
- [ ] `npm run build` in `web/` passes
- [ ] Production URL loads < 3s on mobile
- [ ] `/tokenomics` renders all sections
- [ ] `/launch-support` renders + disclaimer visible

### Messaging dry run
- [ ] One person not on the team reads landing + tokenomics — can they explain Eyes Window in one sentence?
- [ ] FAQ answers reviewed for overclaims

### Security hygiene
- [ ] No private keys in repo, screenshots, or TG
- [ ] `.env` in `.gitignore`
- [ ] Deployer wallet funded but not over-funded (operational balance only)

---

## 9. Launch-day sequence

**T-24 hours**
- [ ] Final checklist review (this doc)
- [ ] All admins online schedule confirmed
- [ ] Pre-written posts loaded in drafts (not auto-posted)

**T-2 hours**
- [ ] TG: “Live in 2h” + what milestone (testnet / site / token)
- [ ] Verify RPC + website one last time

**T-0 — Go live (order matters)**
1. [ ] Website / contracts already live (never announce before live)
2. [ ] Publish **pinned X post**
3. [ ] Publish **launch thread**
4. [ ] Update **TG pin** with links + addresses + disclaimer
5. [ ] Bio link verified

**T+30 minutes**
- [ ] Post **first proof link** (deploy, LP lock, or burn tx)

**T+2 hours**
- [ ] Reply to questions with **doc links**, not improvised tokenomics
- [ ] Log FAQ gaps → update `MESSAGING_KIT.md`

**T+24 hours**
- [ ] **Day 1 recap** post with real metrics only
- [ ] Internal retro: what broke, what confused people

---

## 10. Post-launch monitoring

### Daily (week 1)
- [ ] Run keeper on schedule (`-Step keeper` or cron)
- [ ] Check burn queue: `cast call $EYES_BUY_BURN_EXECUTOR "burnQueueStatus()"`
- [ ] Scan TG for scam impersonators / fake contracts
- [ ] Respond to critical bugs within 4h if operational

### Weekly
- [ ] Publish **one proof post** (burn tx, launch lock, or stats)
- [ ] Update community pin if addresses or status changed
- [ ] Review X analytics: which pillar performed (problem vs proof)
- [ ] `forge test` before any contract config change

### Red flags — pause marketing if:
- Keeper failing repeatedly
- Fee router bypass discovered
- Wrong addresses published
- Exploit report or abnormal contract behavior

**Escalation:** pause launches (`setLaunchesEnabled(false)`), post factual status update, fix before resuming hype.

---

## Quick reference links

| Doc | Purpose |
|-----|---------|
| [`WINDOWS_SETUP.md`](WINDOWS_SETUP.md) | Operator setup |
| [`TESTNET_OPERATOR_GUIDE.md`](TESTNET_OPERATOR_GUIDE.md) | Full testnet runbook |
| [`TOKENOMICS.md`](TOKENOMICS.md) | Economics source of truth |
| [`MESSAGING_KIT.md`](MESSAGING_KIT.md) | Public copy |
| [`MARKETING_PLAN.md`](MARKETING_PLAN.md) | Channel strategy |
| [`OWNERSHIP.md`](OWNERSHIP.md) | Admin keys → multisig |

---

## Sign-off block

| Milestone | Date | Signed off by | Notes |
|-----------|------|---------------|-------|
| Testnet public | | | |
| Website live | | | |
| First curated launch | | | |
| Mainnet | | | |
