# One-shot: sync env -> Railway redeploy -> Vercel webhook URL -> site redeploy
$ErrorActionPreference = "Stop"
$repoRoot = Resolve-Path (Join-Path $PSScriptRoot "..")
$projectId = "eb46f082-82df-4f96-b5c5-3d48cecacc46"
$railwayUrl = "https://eyesteam-production.up.railway.app"

Write-Host "=== Team Space production fix ===" -ForegroundColor Cyan

& (Join-Path $PSScriptRoot "set-railway-bot-env.ps1")
if ($LASTEXITCODE -ne 0) { exit 1 }

Set-Location (Join-Path $repoRoot "ops\discord-bot")
Write-Host "Railway deploy (includes local platform.db with your codes)..." -ForegroundColor Green
$prevEap = $ErrorActionPreference
$ErrorActionPreference = "Continue"
& railway up --project $projectId --service eyesteam --environment production --detach 2>&1 | Out-Host
$railwayExit = $LASTEXITCODE
$ErrorActionPreference = $prevEap
if ($railwayExit -ne 0) { exit 1 }

Start-Sleep -Seconds 5
try {
    $health = Invoke-RestMethod -Uri "$railwayUrl/health" -TimeoutSec 20
    Write-Host "Railway health: $($health | ConvertTo-Json -Compress)" -ForegroundColor Green
} catch {
    Write-Host "WARN: Railway health check failed - wait 1 min and retry activation" -ForegroundColor Yellow
}

Set-Location $repoRoot
Write-Host "Updating Vercel BOT_WEBHOOK_URL..." -ForegroundColor Green
$prevEap = $ErrorActionPreference
$ErrorActionPreference = "Continue"
echo $railwayUrl | npx vercel env add BOT_WEBHOOK_URL production --force 2>&1 | Out-Host

Write-Host "Redeploying eyesopen.to..." -ForegroundColor Green
npx vercel deploy --prod --yes 2>&1 | Tee-Object -Variable vercelOut | Out-Host
$ErrorActionPreference = $prevEap

Write-Host ""
Write-Host "DONE. Test: https://www.eyesopen.to/team/activate" -ForegroundColor Cyan
Write-Host "Use a NEW code from !teamcode create (Railway bot only - stop local npm start first)." -ForegroundColor Yellow
Write-Host ""
