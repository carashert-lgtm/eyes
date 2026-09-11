# Eyes Open Discord Bot

Official **$EYES** server bot — team pool, referrals, presale distribution, and community moderation.

**Bradley stays in the server for music** (`/play`, `/queue`, etc.) — he does not handle presale/team `!` commands in the Eyes guild.

---

## Dual-bot setup (Eyes + Bradley)

| Bot | Token env | In Eyes guild |
|-----|-----------|---------------|
| **Eyes Open bot** (this) | `DISCORD_BOT_TOKEN` in `web/.env.local` | All `!presale` / `!team` / `!help` commands + mod filter |
| **Bradley** | `DISCORD_TOKEN` in `bradbot.py/.env` | **Slash music only** — `/play`, `/queue`, `/skip`, … |

No overlapping prefix commands: Bradley blocks `!` commands in guild `1432509930220425239` and uses `!bradhelp` elsewhere.

### Eyes bot setup

1. [Discord Developer Portal](https://discord.com/developers/applications) → **New Application** → name it **Eyes Open** (or similar).
2. **Bot** tab → **Reset Token** → copy token → save as `DISCORD_BOT_TOKEN` (never commit).
3. Enable **Privileged Gateway Intents:**
   - Message Content Intent
   - Server Members Intent
   - *(Required — login fails with `Used disallowed intents` without these)*
4. **OAuth2 → URL Generator**
   - Scopes: `bot`
   - Bot permissions:
     - View Channels, Send Messages, Embed Links, Read Message History
     - Manage Server (invite tracking)
     - Manage Roles
     - Manage Messages (profanity filter)
     - Moderate Members (timeouts)
5. Open the generated URL → add bot to guild **`1432509930220425239`** (Eyes).
6. **Server Settings → Roles** — drag the Eyes bot role **above** Team / Verified roles it will assign.

### 2. Configure env

```powershell
cd ops/discord-bot
copy .env.example .env
```

Edit `.env` (minimum):

```env
DISCORD_GUILD_ID=1432509930220425239
DISCORD_OWNER_IDS=<your Discord user id>
DISCORD_STAFF_LOG_CHANNEL_ID=<#staff-log channel id>
```

Put the bot token in **`web/.env.local`** (shared with Next.js):

```env
DISCORD_BOT_TOKEN=<new bot token>
PLATFORM_API_SECRET=<same on both web and bot>
BOT_WEBHOOK_URL=https://<your-railway-service>.up.railway.app
```

On startup the bot prints ✓/✗ for required keys.

### 3. Bradley (music only)

1. Keep Bradley in the Eyes server for voice/music.
2. Bradley's `.env` has `EYES_GUILD_ID=1432509930220425239` — he auto-skips prefix commands and profanity filter there.
3. Use **`/play`** in Discord for music (not `!play`).

### 4. Run locally (optional)

```powershell
cd ops/discord-bot
npm install
# Railway must be STOPPED, or set RUN_LOCAL_DISCORD_BOT=true only when testing alone:
$env:RUN_LOCAL_DISCORD_BOT="true"
npm start
```

Railway: push to connected repo — gateway auto-starts when `RAILWAY_ENVIRONMENT` is set.

---

## What this bot does (Bradley comparison)

| Feature | Eyes bot | Bradley |
|---------|----------|---------|
| Presale register + send | ✅ | ❌ |
| Team pool / referrals | ✅ | ❌ |
| Wallet link + claims | ✅ | ❌ |
| Profanity filter (Eyes guild) | ✅ | ❌ (deferred) |
| Mod log | ✅ `!setmodlog` | ✅ `!setlog` (other guilds) |
| Music | ❌ | ✅ `/play` slash |
| Stock / pump / telegram | ❌ | ❌ removed |
| AI chat / server clone | ❌ | ✅ skip |

---

## Env load order (later overrides earlier)

1. `ops/discord-bot/.env` — guild id, owner ids, paths
2. `local.env` (repo root, optional)
3. `web/.env.local` — bot token, `PLATFORM_API_SECRET`, `BOT_WEBHOOK_URL`

Enable **Message Content Intent** in Discord Developer Portal.

---

## Data flow

- SQLite: `ops/discord-bot/data/platform.db`
- Web snapshot: `data/platform-snapshot.json` (read by Next.js Team Space `/api/team/pool`)
- Team activation webhook: `POST /webhook/team-activate` (web calls when user enters code)

Set `PLATFORM_SNAPSHOT_PATH` on Vercel to a synced copy or use external storage for production.

---

## Commands

### Everyone

| Command | Description |
|---------|-------------|
| `!myref` / `!referral` | Your referral link |
| `!refstats` | Your stats |
| `!linkwallet 0x…` | Link wallet for pool + presale status |
| `!presalestatus` / `!mypresale` | Presale queue status for linked wallet |
| `!claim amount` | Queue unlocked team tokens for send |
| `!teamstatus` / `!teamleaderboard` | Allocation status |
| `!teamcheckmcap` | Mcap unlock tier labels (informational) |
| `!poolhelp` / `!help` | Command list |

### Owner

| Command | Description |
|---------|-------------|
| `!whoami` | Check owner ID config |
| `!refstats @user` | Another user's referral stats |
| `!presalesend` / `!presalesend run` | Dry-run / send queued $EYES |
| `!sendstatus` / `!keycheck` | Distributor readiness |
| `!givelocked` / `!giveunlocked` / `!teamadd` / `!teamunlock` | Team pool grants |
| `!teamcode create/list/revoke` | Team Space activation codes |
| `!discordinvite @user` | Enable auto invite rewards for a user |
| `!telegraminvite @user` | Manual Telegram invite credit |
| `!giverole @user @role` | Assign role |
| `!setmodlog #channel` | Moderation log channel |
| `!modlogstatus` / `!clearmodlog` | Mod log settings |

Rewards default to **locked** balance from the **100M owner allocation pool** (10%) — not public presale dilution.

Bot replies stay minimal: no treasury/wallet addresses in public channels (details live in pinned general chat + site). Staff log channel may include tx ids for ops.

---

## Moderation env (optional)

| Variable | Default | Purpose |
|----------|---------|---------|
| `MOD_FILTER_ENABLED` | `true` | Profanity filter on/off |
| `MOD_TIMEOUT_MINUTES` | `10` | Timeout duration |
| `DISCORD_MOD_LOG_CHANNEL_ID` | — | Mod log (falls back to staff log) |
