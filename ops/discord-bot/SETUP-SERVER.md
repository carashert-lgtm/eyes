# Eyes Warden — server permission checklist

After inviting **Eyes Warden**, set these once in Discord:

## 1. Role order
**Server Settings → Roles** — drag **Eyes Warden** **above** roles it assigns (Team, Verified, etc.).

## 2. Admin Logs channel
The bot posts staff alerts to `#brad-n-dad` (rename to `#staff-log` when ready).

**Admin Logs category → Edit → Permissions → Eyes Warden:**
- View Channel
- Send Messages
- Embed Links
- Read Message History

Without this, `staffLog` warnings appear in the console only.

## 3. Public channels
Eyes Warden needs **View + Send** in channels where users run commands:
- `#general`, `#rules`, `#how-to-presale`, `#tokenomics`, etc.

## 4. Bot permissions (server level)
- Manage Server (invite tracking)
- Manage Roles (`!giverole`)
- Manage Messages + Moderate Members (profanity filter)

## 5. Start locally
```powershell
cd ops/discord-bot
.\start-eyes-bot.bat
```

## 6. Production (Railway)
Set on the Railway service:
- `DISCORD_BOT_TOKEN` (Eyes Warden — not Bradley)
- `DISCORD_GUILD_ID=1432509930220425239`
- `DISCORD_OWNER_IDS=1023748166161551360`
- `DISCORD_STAFF_LOG_CHANNEL_ID=1537880411093471232`
- `PLATFORM_API_SECRET` (same as Vercel)
- Mount volume at `/app/data`

Set on **Vercel**: `BOT_WEBHOOK_URL=https://<railway-host>`

Stop Railway **Bradley** service for Eyes guild if both use Discord gateway (different tokens = both can run).
