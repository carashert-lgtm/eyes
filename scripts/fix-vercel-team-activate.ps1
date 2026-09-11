# Sync Vercel production env for Team Space activation + redeploy site.
$ErrorActionPreference = "Stop"
$repoRoot = Resolve-Path (Join-Path $PSScriptRoot "..")
$railwayUrl = "https://eyesteam-production.up.railway.app"

. (Join-Path $repoRoot "scripts\Load-EyesEnv.ps1")
Import-EyesDotEnvFile -Path (Join-Path $repoRoot "web\.env.local")

$secret = Get-EyesEnvValue "PLATFORM_API_SECRET"
$sessionSecret = Get-EyesEnvValue "TEAM_SESSION_SECRET"
if (-not $secret) { throw "PLATFORM_API_SECRET missing in web/.env.local" }

Set-Location $repoRoot

Write-Host "Setting Vercel production env (eyes project)..." -ForegroundColor Cyan
$secret | npx vercel env add PLATFORM_API_SECRET production --force 2>&1 | Out-Host
$railwayUrl | npx vercel env add BOT_WEBHOOK_URL production --force 2>&1 | Out-Host
if ($sessionSecret) {
    $sessionSecret | npx vercel env add TEAM_SESSION_SECRET production --force 2>&1 | Out-Host
}

Write-Host "Deploying production..." -ForegroundColor Green
npx vercel deploy --prod --yes 2>&1 | Out-Host

Write-Host ""
Write-Host "Done. Create a NEW !teamcode create - old codes may be used." -ForegroundColor Yellow
Write-Host "Test: https://www.eyesopen.to/team/activate" -ForegroundColor Cyan
