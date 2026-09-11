# Readiness check before Base mainnet token-only deploy (no secrets printed).
$ErrorActionPreference = "Stop"
Set-Location $PSScriptRoot\..

. "$PSScriptRoot\Load-EyesEnv.ps1"
Import-EyesEnv -RepoRoot (Get-Location)
$webEnv = Join-Path (Get-Location) "web\.env.local"
if (Test-Path $webEnv) { Import-EyesDotEnvFile -Path $webEnv -FillMissingOnly }

function Show-Check($name, $ok, $detail) {
    $tag = if ($ok) { "PASS" } else { "WAIT" }
    $color = if ($ok) { "Green" } else { "Yellow" }
    Write-Host ("  [{0}] {1} - {2}" -f $tag, $name, $detail) -ForegroundColor $color
}

Write-Host ""
Write-Host "=== Mainnet deploy readiness ===" -ForegroundColor Cyan

$key = Get-EyesEnvValue "DEPLOYER_PRIVATE_KEY"
$hexOnly = if ($key -and $key.StartsWith("0x")) { $key.Substring(2) } else { $key }
$keyOk = $hexOnly -match '^[0-9a-fA-F]{64}$'
Show-Check "DEPLOYER_PRIVATE_KEY" $keyOk $(if ($keyOk) { "valid format" } elseif ($key) { "invalid (need 64 hex chars)" } else { "not in .env yet" })

$rpc = Get-EyesEnvValue "BASE_MAINNET_RPC_URL"
if (-not $rpc) { $rpc = "https://mainnet.base.org" }
Show-Check "BASE_MAINNET_RPC_URL" $true $rpc

$treasury = Get-EyesEnvValue "NEXT_PUBLIC_PRESALE_RECIPIENT"
if (-not $treasury) { $treasury = Get-EyesEnvValue "EYES_TREASURY" }
Show-Check "Treasury (1B mint target)" ($treasury -match '^0x[0-9a-fA-F]{40}$') $(if ($treasury) { $treasury } else { "missing" })

Show-Check "Deploy script" (Test-Path "scripts\deploy-base-mainnet.ps1") "deploy-base-mainnet.ps1"
Show-Check "Token deploy contract" (Test-Path "script\DeployEyesTokenOnly.s.sol") "DeployEyesTokenOnly.s.sol"
Show-Check "Already deployed?" (Test-Path "deployments\base-mainnet.json") $(if (Test-Path "deployments\base-mainnet.json") { "exists - skip redeploy unless intentional" } else { "not yet - good for first deploy" })

if ($keyOk) {
    try {
        $keyHex = if ($key.StartsWith("0x")) { $key } else { "0x$key" }
        $addr = & cast wallet address --private-key $keyHex 2>$null
        if ($addr) {
            $bal = & cast balance $addr --rpc-url $rpc 2>$null
            $eth = [double]$bal
            Show-Check "Deployer ETH on Base" ($eth -ge 0.0005) "$addr -> $bal ETH (need ~0.001+)"
        }
    } catch {
        Show-Check "Deployer balance" $false "could not query (install cast / fund wallet)"
    }
}

try {
    $h = Invoke-RestMethod -Uri "https://eyesteam-production.up.railway.app/health" -TimeoutSec 12
    Show-Check "Railway bot" $true $h.service
} catch {
    Show-Check "Railway bot" $false "health check failed"
}

Show-Check "Presale Phase 2 (distributor)" (Test-Path "ops\discord-bot\src\presale-distribute.js") "double-send guards active"
Show-Check "PLATFORM_API_SECRET" (Test-EyesEnvVar "PLATFORM_API_SECRET") "set for bot webhooks"

Write-Host ""
Write-Host "After deploy you still need:" -ForegroundColor DarkGray
Write-Host "  - EYES_TOKEN_ADDRESS on Railway + Vercel (from deployments/base-mainnet.env)" -ForegroundColor DarkGray
Write-Host "  - PRESALE_DISTRIBUTOR_PRIVATE_KEY = treasury key for !presalesend run" -ForegroundColor DarkGray
Write-Host "  - Do NOT seed Uniswap LP until public trading launch" -ForegroundColor DarkGray
Write-Host ""
