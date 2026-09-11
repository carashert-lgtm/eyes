# Push bot secrets from web/.env.local to Railway (no workspace picker).
# WARNING: web/.env.local is usually ANVIL/local — use set-railway-bot-mainnet.ps1 for production !presalesend.
param(
    [switch]$LocalAnvil
)

$ErrorActionPreference = "Stop"
$repoRoot = Resolve-Path (Join-Path $PSScriptRoot "..")
$webEnv = Join-Path $repoRoot "web\.env.local"
$projectId = "eb46f082-82df-4f96-b5c5-3d48cecacc46"
$service = "eyesteam"
$environment = "production"

if (-not $LocalAnvil) {
    Write-Host ""
    Write-Host "STOP: This script copies web/.env.local (usually Anvil chain 31337) to Railway." -ForegroundColor Red
    Write-Host "That breaks !presalesend on production (localhost:8545 + wrong token/key)." -ForegroundColor Red
    Write-Host ""
    Write-Host "For mainnet bot:" -ForegroundColor Yellow
    Write-Host "  .\scripts\set-railway-bot-mainnet.ps1 -TreasuryPrivateKey 0xYOUR_TREASURY_KEY" -ForegroundColor White
    Write-Host ""
    Write-Host "To force local Anvil sync anyway: .\scripts\set-railway-bot-env.ps1 -LocalAnvil" -ForegroundColor DarkGray
    exit 1
}

. (Join-Path $repoRoot "scripts\Load-EyesEnv.ps1")

if (-not (Test-Path $webEnv)) {
    Write-Host "FAIL: Missing $webEnv" -ForegroundColor Red
    exit 1
}

Import-EyesDotEnvFile -Path $webEnv

$keys = @(
    "DISCORD_BOT_TOKEN",
    "DISCORD_GUILD_ID",
    "DISCORD_OWNER_IDS",
    "DISCORD_STAFF_LOG_CHANNEL_ID",
    "PLATFORM_API_SECRET",
    "PRESALE_TOKEN_CAP",
    "EYES_TOKEN_ADDRESS",
    "PRESALE_DISTRIBUTOR_PRIVATE_KEY",
    "BASE_MAINNET_RPC_URL",
    "PRESALE_CHAIN_ID"
)

Write-Host ""
Write-Host "Railway env sync -> eyesteam (production)" -ForegroundColor Cyan
Write-Host "If prompted, pick: carashert-lgtm's Projects" -ForegroundColor Yellow
Write-Host ""

foreach ($key in $keys) {
    $val = Get-EyesEnvValue $key
    if (-not $val) {
        Write-Host "  skip $key" -ForegroundColor DarkGray
        continue
    }
    $prevEap = $ErrorActionPreference
    $ErrorActionPreference = "Continue"
    & railway variables --project $projectId --environment $environment --service $service --set "${key}=${val}" 2>&1 | Out-Host
    $ErrorActionPreference = $prevEap
    if ($LASTEXITCODE -ne 0) {
        Write-Host "FAIL on $key - run: railway login" -ForegroundColor Red
        exit 1
    }
    Write-Host "  ok $key" -ForegroundColor Green
}

$prevEap = $ErrorActionPreference
$ErrorActionPreference = "Continue"
& railway variables --project $projectId --environment $environment --service $service --set "DB_PATH=/app/data/platform.db" 2>&1 | Out-Host
& railway variables --project $projectId --environment $environment --service $service --set "SITE_URL=https://www.eyesopen.to" 2>&1 | Out-Host
& railway variables --project $projectId --environment $environment --service $service --set "PRESALE_TOKEN_CAP=200000000" 2>&1 | Out-Host
& railway variables --project $projectId --environment $environment --service $service --set "TEAM_POOL_TOKENS=100000000" 2>&1 | Out-Host
& railway variables --project $projectId --environment $environment --service $service --set "PRESALE_DISTRIBUTE_BATCH=5" 2>&1 | Out-Host
$ErrorActionPreference = $prevEap

Write-Host ""
Write-Host "Done. Redeploy from Railway dashboard (eyesteam -> Deploy) or run:" -ForegroundColor Green
Write-Host "  railway up --project $projectId --service $service --environment $environment --detach" -ForegroundColor White
Write-Host ""
