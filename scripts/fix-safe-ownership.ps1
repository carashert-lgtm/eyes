# Deploy counterfactual Safe + move contract admin to working Safe. No Safe UI.
param(
    [switch]$FindOnly,
    [switch]$DryRun
)

$ErrorActionPreference = "Stop"
Set-Location $PSScriptRoot\..

. "$PSScriptRoot\Load-EyesEnv.ps1"
Import-EyesEnv -RepoRoot (Get-Location)

$mainnetJson = Join-Path (Get-Location) "deployments\base-mainnet.json"
$deploy = Get-Content $mainnetJson | ConvertFrom-Json

$rpc = Get-EyesEnvValue "BASE_MAINNET_RPC_URL"
if (-not $rpc) { $rpc = "https://mainnet.base.org" }

Require-EyesEnvVar "DEPLOYER_PRIVATE_KEY"

Set-EyesEnvValue "COUNTERFACTUAL_SAFE" "0x9C456e582b23A42726C2B4772c0956DE1b8474bD"
Set-EyesEnvValue "NEW_OWNER" "0xbe5B4c6aC168107C25510469fF02cc0896015bfa"
Set-EyesEnvValue "SAFE_OWNER_DEPLOYER" $deploy.deployer
Set-EyesEnvValue "SAFE_OWNER_TREASURY" $deploy.treasury
Set-Item env:COUNTERFACTUAL_SAFE "0x9C456e582b23A42726C2B4772c0956DE1b8474bD"
Set-Item env:NEW_OWNER "0xbe5B4c6aC168107C25510469fF02cc0896015bfa"
Set-Item env:SAFE_OWNER_DEPLOYER $deploy.deployer
Set-Item env:SAFE_OWNER_TREASURY $deploy.treasury

$key = Get-EyesEnvValue "DEPLOYER_PRIVATE_KEY"
if ($key.StartsWith("0x")) { $keyHex = $key } else { $keyHex = "0x$key" }

Write-Host ""
Write-Host "=== Safe ownership recovery ===" -ForegroundColor Cyan
Write-Host "Stuck owner:  0x9C456e582b23A42726C2B4772c0956DE1b8474bD" -ForegroundColor Yellow
Write-Host "Target Safe:  0xbe5B4c6aC168107C25510469fF02cc0896015bfa" -ForegroundColor Yellow
Write-Host ""

Write-Host "Step 1: find counterfactual Safe params..." -ForegroundColor Cyan
$findOut = forge script script/FindCounterfactualSafe.s.sol:FindCounterfactualSafe --rpc-url $rpc -vv 2>&1 | Out-String
Write-Host $findOut

if ($findOut -notmatch "MATCH") {
    Write-Host "FAIL: could not derive Safe params for 0x9C456…" -ForegroundColor Red
    Write-Host "Trying extended search via cast is next — paste find output if asking for help." -ForegroundColor DarkGray
    exit 1
}

# Parse MATCH block from forge output
$salt = if ($findOut -match "saltNonce\s+(\d+)") { $Matches[1] } else { $null }
$threshold = if ($findOut -match "threshold\s+(\d+)") { $Matches[1] } else { $null }
$fallback = if ($findOut -match "fallbackHandler\s+(0x[0-9a-fA-F]{40})") { $Matches[1] } elseif ($findOut -match "fallbackHandler\s+true" -or $fallback -eq "1") { "0xfd0732Dc9E303f09fCEf3a7388Ad10A83459Ec99" } else { "0x0000000000000000000000000000000000000000" }
$useFallback = if ($fallback -ne "0x0000000000000000000000000000000000000000") { "1" } else { "0" }
$singleton = if ($findOut -match "singleton\s+(0x[0-9a-fA-F]{40})") { $Matches[1] } else { "0x41675C099F32341bf84BFc5382aF534df5C7461a" }

if (-not $salt -or -not $threshold) {
    Write-Host "FAIL: could not parse MATCH params" -ForegroundColor Red
    exit 1
}

Set-EyesEnvValue "SAFE_SALT_NONCE" $salt
Set-EyesEnvValue "SAFE_THRESHOLD" $threshold
Set-EyesEnvValue "SAFE_USE_FALLBACK" $useFallback
Set-EyesEnvValue "SAFE_FALLBACK_HANDLER" $fallback
Set-EyesEnvValue "SAFE_SINGLETON" $singleton
Set-Item env:SAFE_SALT_NONCE $salt
Set-Item env:SAFE_THRESHOLD $threshold
Set-Item env:SAFE_USE_FALLBACK $useFallback
Set-Item env:SAFE_FALLBACK_HANDLER $fallback
Set-Item env:SAFE_SINGLETON $singleton

Write-Host ""
Write-Host "Matched params: salt=$salt threshold=$threshold fallback=$fallback singleton=$singleton" -ForegroundColor Green

if ($FindOnly) { exit 0 }

Write-Host ""
Write-Host "Step 2: deploy Safe (if needed) + transfer admin to 0xbe5B…" -ForegroundColor Cyan

$forgeArgs = @(
    "script", "script/RecoverSafeOwnership.s.sol:RecoverSafeOwnership",
    "--rpc-url", $rpc,
    "-vvvv"
)
if (-not $DryRun) {
    $forgeArgs += @("--broadcast", "--private-key", $keyHex)
}

& forge @forgeArgs

Write-Host ""
Write-Host "Step 3: verify owner()..." -ForegroundColor Cyan
$eyes = $deploy.eyesToken
$newOwner = "0xbe5B4c6aC168107C25510469fF02cc0896015bfa"
$owner = (cast call $eyes "owner()(address)" --rpc-url $rpc).Trim()
if ($owner.ToLower() -eq $newOwner.ToLower()) {
    Write-Host "SUCCESS: token owner = $owner" -ForegroundColor Green
} else {
    Write-Host "WARN: token owner still $owner (expected $newOwner)" -ForegroundColor Yellow
}

Write-Host ""
Write-Host "Update Vercel:" -ForegroundColor Cyan
Write-Host "  NEXT_PUBLIC_MULTISIG_ADDRESS=$newOwner"
Write-Host "  NEXT_PUBLIC_OWNERSHIP_TRANSFERRED=true"
Write-Host ""
