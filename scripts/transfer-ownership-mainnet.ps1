# Transfer Ownable admin on all mainnet stack contracts -> Gnosis Safe.
# After the first transfer, the CURRENT owner key must sign — not DEPLOYER_PRIVATE_KEY.
param(
    [Parameter(Mandatory = $true)]
    [string]$SafeAddress,
    [string]$OwnerPrivateKey = ""
)

$ErrorActionPreference = "Stop"
Set-Location $PSScriptRoot\..

. "$PSScriptRoot\Load-EyesEnv.ps1"
Import-EyesEnv -RepoRoot (Get-Location)

$mainnetJson = Join-Path (Get-Location) "deployments\base-mainnet.json"
$mainnetEnv = Join-Path (Get-Location) "deployments\base-mainnet.env"

if (-not (Test-Path $mainnetJson)) {
    Write-Host "FAIL: run deploy-base-mainnet.ps1 -Step stack first" -ForegroundColor Red
    exit 1
}

Set-EyesEnvValue "EYES_DEPLOYMENT_PATH" "deployments/base-mainnet.json"
Set-EyesEnvValue "EYES_ENV_SNIPPET_PATH" "deployments/base-mainnet.env"
if (Test-Path $mainnetEnv) {
    Import-EyesDotEnvFile -Path $mainnetEnv
}

if ($SafeAddress -notmatch '^0x[0-9a-fA-F]{40}$') {
    Write-Host "FAIL: SafeAddress must be 0x + 40 hex chars" -ForegroundColor Red
    exit 1
}

Require-EyesEnvVar "BASE_MAINNET_RPC_URL"

Set-EyesEnvValue "NEW_OWNER" $SafeAddress

$deploy = Get-Content $mainnetJson | ConvertFrom-Json
$exports = @{
    EYES_DEPLOYMENT_PATH  = "deployments/base-mainnet.json"
    EYES_ENV_SNIPPET_PATH = "deployments/base-mainnet.env"
    EYES_TOKEN            = $deploy.eyesToken
    EYES_FEE_COLLECTOR    = $deploy.feeCollector
    EYES_FACTORY          = $deploy.factory
    EYES_FEE_ROUTER       = $deploy.feeRouter
}
foreach ($name in $exports.Keys) {
    Set-EyesEnvValue $name $exports[$name]
    Set-Item -Path "env:$name" -Value $exports[$name]
}

$key = $OwnerPrivateKey
if (-not $key) { $key = Get-EyesEnvValue "CURRENT_OWNER_PRIVATE_KEY" }
if (-not $key) { $key = Get-EyesEnvValue "DEPLOYER_PRIVATE_KEY" }
if (-not $key) {
    Write-Host "FAIL: set CURRENT_OWNER_PRIVATE_KEY in .env (wallet that owns contracts today)" -ForegroundColor Red
    Write-Host "      or pass -OwnerPrivateKey (64 hex chars, no 0x needed)" -ForegroundColor Red
    exit 1
}
if ($key.StartsWith("0x")) { $keyHex = $key } else { $keyHex = "0x$key" }

$rpc = Get-EyesEnvValue "BASE_MAINNET_RPC_URL"
if (-not $rpc) { $rpc = "https://mainnet.base.org" }

$signer = (cast wallet address --private-key $keyHex 2>$null).Trim()
Write-Host ""
Write-Host "=== Transfer ownership -> Safe ===" -ForegroundColor Cyan
Write-Host "Safe:   $SafeAddress" -ForegroundColor Yellow
Write-Host "Signer: $signer" -ForegroundColor Yellow
Write-Host "Deploy: $mainnetJson" -ForegroundColor DarkGray
Write-Host ""
Write-Host "If Signer is not the current owner(), transfers will be skipped on-chain." -ForegroundColor DarkGray
Write-Host ""

forge script script/TransferOwnership.s.sol:TransferOwnership `
    --rpc-url $rpc --broadcast --private-key $keyHex -vvvv

Write-Host ""
Write-Host "Done. Check owner() on token + factory on BaseScan." -ForegroundColor Green
