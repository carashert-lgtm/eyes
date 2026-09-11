# Recover from locked 0x9C456 admin: redeploy launch stack, transfer to working Safe 0xbe5B.
# Keeps existing $EYES token. Abandons old factory/collector owned by dead address.
$ErrorActionPreference = "Stop"
Set-Location $PSScriptRoot\..

. "$PSScriptRoot\Load-EyesEnv.ps1"
Import-EyesEnv -RepoRoot (Get-Location)

$workingSafe = "0xbe5B4c6aC168107C25510469fF02cc0896015bfa"
$rpc = Get-EyesEnvValue "BASE_MAINNET_RPC_URL"
if (-not $rpc) { $rpc = "https://mainnet.base.org" }

Require-EyesEnvVar "DEPLOYER_PRIVATE_KEY"
$key = Get-EyesEnvValue "DEPLOYER_PRIVATE_KEY"
$keyHex = if ($key.StartsWith("0x")) { $key } else { "0x$key" }

$deployer = (cast wallet address --private-key $keyHex).Trim()
$bal = cast balance $deployer --rpc-url $rpc
Write-Host ""
Write-Host "=== Admin recovery (redeploy stack) ===" -ForegroundColor Cyan
Write-Host "Deployer: $deployer ($bal ETH)" -ForegroundColor Yellow
Write-Host "Working Safe: $workingSafe" -ForegroundColor Yellow
Write-Host ""

if ([double]$bal -lt 0.0003) {
    Write-Host "FAIL: fund deployer with Base ETH for gas (~0.001+)" -ForegroundColor Red
    exit 1
}

$jsonPath = Join-Path (Get-Location) "deployments\base-mainnet.json"
$bakPath = "$jsonPath.bak-$(Get-Date -Format 'yyyyMMdd-HHmmss')"
Copy-Item $jsonPath $bakPath
Write-Host "Backed up deployment JSON -> $bakPath" -ForegroundColor DarkGray

Set-EyesEnvValue "NEW_OWNER" $workingSafe
Set-EyesEnvValue "EYES_TOKEN" (Get-Content $jsonPath | ConvertFrom-Json).eyesToken

Write-Host ""
Write-Host "Step 1: Deploy fresh factory + fee stack (same `$EYES token)..." -ForegroundColor Cyan
& "$PSScriptRoot\deploy-base-mainnet.ps1" -Step stack -ConfirmMainnet
if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }

Write-Host ""
Write-Host "Step 2: Transfer new stack admin -> Safe $workingSafe ..." -ForegroundColor Cyan
& "$PSScriptRoot\transfer-ownership-mainnet.ps1" -SafeAddress $workingSafe
if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }

Write-Host ""
Write-Host "Step 3: Verify owner() on new contracts..." -ForegroundColor Cyan
$new = Get-Content $jsonPath | ConvertFrom-Json
foreach ($pair in @(
    @{ n = "factory"; a = $new.factory },
    @{ n = "feeCollector"; a = $new.feeCollector },
    @{ n = "feeRouter"; a = $new.feeRouter }
)) {
    $owner = (cast call $pair.a "owner()(address)" --rpc-url $rpc).Trim()
    $ok = ($owner.ToLower() -eq $workingSafe.ToLower())
    $tag = if ($ok) { "OK" } else { "FAIL" }
    Write-Host "  [$tag] $($pair.n) owner=$owner"
}

$tokenOwner = (cast call $new.eyesToken "owner()(address)" --rpc-url $rpc).Trim()
Write-Host "  [info] eyesToken owner=$tokenOwner (may still be dead 0x9C456; token has no admin mint)" -ForegroundColor DarkGray

Write-Host ""
Write-Host "Step 4: Update Vercel production env with NEW addresses from deployments/base-mainnet.json:" -ForegroundColor Cyan
Write-Host "  NEXT_PUBLIC_LAUNCH_FACTORY_ADDRESS=$($new.factory)"
Write-Host "  NEXT_PUBLIC_FEE_COLLECTOR_ADDRESS=$($new.feeCollector)"
Write-Host "  NEXT_PUBLIC_MULTISIG_ADDRESS=$workingSafe"
Write-Host "  NEXT_PUBLIC_OWNERSHIP_TRANSFERRED=true"
Write-Host ""
Write-Host "Then redeploy site (vercel --prod). Old factory $($new.factory) is live; abandoned contracts are harmless." -ForegroundColor Green
Write-Host ""
