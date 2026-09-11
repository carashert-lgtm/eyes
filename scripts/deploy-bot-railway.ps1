# Deploy Eyes Open Discord bot to Railway (~5 min, free tier works).
# Gives you a public HTTPS URL for Vercel BOT_WEBHOOK_URL.

$ErrorActionPreference = "Stop"
$repoRoot = Resolve-Path (Join-Path $PSScriptRoot "..")
$botDir = Join-Path $repoRoot "ops\discord-bot"
$webEnv = Join-Path $repoRoot "web\.env.local"
$botEnv = Join-Path $botDir ".env"
$projectId = "eb46f082-82df-4f96-b5c5-3d48cecacc46"
$service = "eyesteam"
$environment = "production"
$railwayUrl = "https://eyesteam-production.up.railway.app"

. (Join-Path $repoRoot "scripts\Load-EyesEnv.ps1")

function Read-DotEnvMap {
    param([string[]]$Paths)
    $map = @{}
    $keys = @(
        "DISCORD_BOT_TOKEN", "DISCORD_GUILD_ID", "DISCORD_OWNER_IDS",
        "DISCORD_STAFF_LOG_CHANNEL_ID", "DISCORD_MOD_LOG_CHANNEL_ID",
        "DISCORD_LAUNCHES_CHANNEL_ID",
        "PLATFORM_API_SECRET", "SITE_URL", "MOD_FILTER_ENABLED",
        "MOD_TIMEOUT_MINUTES", "TEAM_POOL_TOKENS", "PRESALE_TOKEN_CAP",
        "REFERRAL_REWARD_DISCORD", "REFERRAL_REWARD_TELEGRAM",
        "REFERRAL_REWARD_CLICK", "REFERRAL_REWARD_JOIN",
        "REFERRAL_REWARD_CONTRIBUTION", "LARGE_UNLOCK_THRESHOLD"
    )
    foreach ($path in $Paths) {
        if (-not (Test-Path $path)) { continue }
        Import-EyesDotEnvFile -Path $path -FillMissingOnly
    }
    foreach ($key in $keys) {
        $v = Get-EyesEnvValue $key
        if ($v) { $map[$key] = $v }
    }
    return $map
}

Write-Host ""
Write-Host "=== Eyes Open bot -> Railway ===" -ForegroundColor Cyan

if (-not (Get-Command railway -ErrorAction SilentlyContinue)) {
    Write-Host "Installing Railway CLI..." -ForegroundColor Yellow
    npm install -g @railway/cli
}

Set-Location $botDir

# Non-interactive link (no --workspace flag — that opens an interactive picker)
& railway link --project $projectId --service $service --environment $environment 2>&1 | Out-Host
if ($LASTEXITCODE -ne 0) {
    Write-Host ""
    Write-Host "Link failed. Run manually:" -ForegroundColor Yellow
    Write-Host "  railway login" -ForegroundColor White
    Write-Host "  railway link --project eb46f082-82df-4f96-b5c5-3d48cecacc46 --service eyesteam --environment production" -ForegroundColor White
    exit 1
}

$envMap = Read-DotEnvMap @($botEnv, $webEnv)
if (-not $envMap["DISCORD_BOT_TOKEN"]) {
    Write-Host "FAIL: DISCORD_BOT_TOKEN not in web/.env.local" -ForegroundColor Red
    exit 1
}
if (-not $envMap["PLATFORM_API_SECRET"]) {
    Write-Host "FAIL: PLATFORM_API_SECRET not in web/.env.local" -ForegroundColor Red
    exit 1
}
if (-not $envMap["DISCORD_OWNER_IDS"]) {
    Write-Host "WARN: DISCORD_OWNER_IDS missing - set on Railway after deploy" -ForegroundColor Yellow
}

if (-not $envMap["SITE_URL"]) { $envMap["SITE_URL"] = "https://www.eyesopen.to" }

Write-Host ""
Write-Host "3) Setting Railway variables (Eyes Warden)..." -ForegroundColor Green
foreach ($entry in $envMap.GetEnumerator()) {
    $prevEap = $ErrorActionPreference
    $ErrorActionPreference = "Continue"
    & railway variables --project $projectId --environment $environment --service $service --set "$($entry.Key)=$($entry.Value)" 2>&1 | Out-Null
    $ErrorActionPreference = $prevEap
    if ($LASTEXITCODE -ne 0) {
        Write-Host "FAIL on $($entry.Key)" -ForegroundColor Red
        exit 1
    }
    Write-Host "  ok $($entry.Key)" -ForegroundColor DarkGray
}
& railway variables --project $projectId --environment $environment --service $service --set "DB_PATH=/app/data/platform.db" 2>&1 | Out-Null
& railway variables --project $projectId --environment $environment --service $service --set "SITE_URL=https://www.eyesopen.to" 2>&1 | Out-Null
& railway variables --project $projectId --environment $environment --service $service --set "DISCORD_LAUNCHES_CHANNEL_ID=1540026807141793833" 2>&1 | Out-Null

Write-Host ""
Write-Host "4) Mainnet distributor env (chain + token; key if available)..." -ForegroundColor Green
& (Join-Path $PSScriptRoot "set-railway-bot-mainnet.ps1")
if ($LASTEXITCODE -ne 0) {
    Write-Host "WARN: mainnet env partial - bot still runs; presalesend needs treasury key on Railway" -ForegroundColor Yellow
}

Write-Host ""
Write-Host "5) Deploying (build ~2-3 min)..." -ForegroundColor Green
$prevEap = $ErrorActionPreference
$ErrorActionPreference = "Continue"
& railway up --project $projectId --service $service --environment $environment --detach 2>&1 | Out-Host
$railwayExit = $LASTEXITCODE
$ErrorActionPreference = $prevEap
if ($railwayExit -ne 0) { exit 1 }

Write-Host ""
Write-Host "6) Waiting for health..." -ForegroundColor Green
Start-Sleep -Seconds 45
try {
    $health = Invoke-RestMethod -Uri "$railwayUrl/health" -TimeoutSec 30
    Write-Host "  version: $($health.version)" -ForegroundColor Cyan
    Write-Host "  discordReady: $($health.discordReady)" -ForegroundColor Cyan
} catch {
    Write-Host "  WARN: health not ready yet - check: railway logs" -ForegroundColor Yellow
}

Write-Host ""
Write-Host "7) Vercel BOT_WEBHOOK_URL -> $railwayUrl" -ForegroundColor Green
Set-Location $repoRoot
$prevEap = $ErrorActionPreference
$ErrorActionPreference = "Continue"
echo $railwayUrl | npx vercel env add BOT_WEBHOOK_URL production --force 2>&1 | Out-Host
Write-Host "8) Redeploy eyesopen.to..." -ForegroundColor Green
npx vercel deploy --prod --yes 2>&1 | Out-Host
$ErrorActionPreference = $prevEap

Write-Host ""
Write-Host "DONE. Bot URL: $railwayUrl" -ForegroundColor Cyan
Write-Host "Stop local npm start / RUN_LOCAL_DISCORD_BOT so only Railway handles !commands." -ForegroundColor Yellow
Write-Host ""
