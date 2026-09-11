# Expose local Discord bot webhook (port 3847) to the internet for production eyesopen.to.
# Requires cloudflared: winget install Cloudflare.cloudflared
#
# Usage:
#   1. Start bot: cd ops/discord-bot; npm start
#   2. Run this script in another terminal
#   3. Copy the https://*.trycloudflare.com URL
#   4. Vercel → eyes project → Settings → Environment Variables → BOT_WEBHOOK_URL = that URL
#   5. Redeploy production (or vercel deploy --prod)

$ErrorActionPreference = "Stop"
$port = if ($env:WEBHOOK_PORT) { $env:WEBHOOK_PORT } else { "3847" }

Write-Host "Expose bot webhook on http://localhost:$port" -ForegroundColor Cyan
Write-Host "Bot must be running (npm start in ops/discord-bot)." -ForegroundColor Yellow
Write-Host ""

if (-not (Get-Command cloudflared -ErrorAction SilentlyContinue)) {
  Write-Host "Install cloudflared first:" -ForegroundColor Red
  Write-Host "  winget install Cloudflare.cloudflared"
  exit 1
}

Write-Host "Starting Cloudflare quick tunnel…" -ForegroundColor Green
Write-Host "Paste the https URL into Vercel BOT_WEBHOOK_URL (Production)." -ForegroundColor Green
Write-Host ""

cloudflared tunnel --url "http://127.0.0.1:$port"
