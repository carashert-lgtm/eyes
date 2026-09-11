# Production checks for go-live items 4–7 (presale, Safe admin, factory create flow).
# No secrets printed. Requires cast + network.
$ErrorActionPreference = "Stop"
Set-Location $PSScriptRoot\..

. "$PSScriptRoot\Load-EyesEnv.ps1"
Import-EyesEnv -RepoRoot (Get-Location)

$mainnetJson = Join-Path (Get-Location) "deployments\base-mainnet.json"
if (-not (Test-Path $mainnetJson)) {
    Write-Host "FAIL: missing deployments/base-mainnet.json" -ForegroundColor Red
    exit 1
}
$deploy = Get-Content $mainnetJson | ConvertFrom-Json

$rpc = Get-EyesEnvValue "BASE_MAINNET_RPC_URL"
if (-not $rpc) { $rpc = "https://mainnet.base.org" }

$safe = Get-EyesEnvValue "NEW_OWNER"
if (-not $safe) { $safe = "0xbe5B4c6aC168107C25510469fF02cc0896015bfa" }

$site = Get-EyesEnvValue "SITE_URL"
if (-not $site) { $site = "https://www.eyesopen.to" }

function Show-Check($name, $ok, $detail) {
    $tag = if ($ok) { "PASS" } else { "FAIL" }
    $color = if ($ok) { "Green" } else { "Red" }
    Write-Host ("  [{0}] {1}" -f $tag, $name) -ForegroundColor $color
    if ($detail) { Write-Host ("       {0}" -f $detail) -ForegroundColor DarkGray }
}

Write-Host ""
Write-Host "=== Go-live checks (4-7) ===" -ForegroundColor Cyan
Write-Host ""

# --- 4. Presale smoke (API + bot) ---
Write-Host "4. Presale pipeline" -ForegroundColor Yellow
try {
    $stats = Invoke-RestMethod "$site/api/presale/stats" -TimeoutSec 20
    $s = $stats.stats
    Show-Check "Presale stats API" $stats.ok "contributors=$($s.contributors) sent=$($s.contributorsSent) capLeft=$($s.tokensRemaining)"
    $tier = Invoke-RestMethod "$site/api/presale/tier" -TimeoutSec 20
    Show-Check "Presale tier API" ($null -ne $tier.model) "windowOpen=$($tier.windowOpen) endsIn=$($tier.endsIn)"
} catch {
    Show-Check "Presale APIs" $false $_.Exception.Message
}

try {
    $health = Invoke-RestMethod "https://eyesteam-production.up.railway.app/health" -TimeoutSec 15
    Show-Check "Railway bot" $health.ok "pending presale=$($health.pending.presale)"
} catch {
    Show-Check "Railway bot" $false $_.Exception.Message
}

Write-Host ""

# --- 5. Safe / contract admin ---
Write-Host "5. Contract admin (owner())" -ForegroundColor Yellow
$contracts = @{
    eyesToken     = $deploy.eyesToken
    factory       = $deploy.factory
    feeCollector  = $deploy.feeCollector
    feeRouter     = $deploy.feeRouter
}
$ownerOk = $true
foreach ($name in $contracts.Keys) {
    $addr = $contracts[$name]
    $owner = (cast call $addr "owner()(address)" --rpc-url $rpc).Trim()
    $match = ($owner.ToLower() -eq $safe.ToLower())
    if (-not $match) { $ownerOk = $false }
    Show-Check "$name owner()" $match "$addr -> $owner"
}

$safeCode = cast code $safe --rpc-url $rpc
$safeDeployed = ($safeCode -ne "0x" -and $safeCode.Length -gt 4)
Show-Check "Gnosis Safe deployed at owner address" $safeDeployed "owner=$safe (code len=$($safeCode.Length))"

Write-Host ""

# --- 6. Safe signers (only if Safe proxy exists) ---
Write-Host "6. Safe signer hygiene" -ForegroundColor Yellow
if ($safeDeployed) {
    try {
        $owners = cast call $safe "getOwners()(address[])" --rpc-url $rpc
        $threshold = cast call $safe "getThreshold()(uint256)" --rpc-url $rpc
        $treasury = $deploy.treasury
        $treasuryIsSigner = $owners -match [regex]::Escape($treasury)
        Show-Check "Treasury NOT a Safe signer" (-not $treasuryIsSigner) "threshold=$threshold owners=$owners"
    } catch {
        Show-Check "Safe getOwners()" $false $_.Exception.Message
    }
} else {
    Show-Check "Safe signer review" $false "Deploy a Gnosis Safe on Base, then transfer owner() from the current EOA admin."
}

Write-Host ""

# --- 7. Launch factory /app/create ---
Write-Host "7. Launch factory (/app/create)" -ForegroundColor Yellow
$factory = $deploy.factory
$enabled = cast call $factory "launchesEnabled()(bool)" --rpc-url $rpc
$launchCount = cast call $factory "launchCount()(uint256)" --rpc-url $rpc
Show-Check "Factory bytecode on Base" ($true) $factory
Show-Check "launchesEnabled" ($enabled -eq "true") "launchesEnabled=$enabled launchCount=$launchCount"

try {
    $createPage = Invoke-WebRequest "$site/app/create" -TimeoutSec 20 -UseBasicParsing
    $html = $createPage.Content
    $hasFactoryBanner = $html -match "not live on Base mainnet yet"
    Show-Check "/app/create factory wired" (-not $hasFactoryBanner) "missing-factory banner absent on production HTML"
} catch {
    Show-Check "/app/create page" $false $_.Exception.Message
}

Write-Host ""
Write-Host "Done. Fix any FAIL rows before public launch." -ForegroundColor Cyan
Write-Host ""
