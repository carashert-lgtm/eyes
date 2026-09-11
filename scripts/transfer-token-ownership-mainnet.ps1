# Transfer EyesToken owner() from deployer EOA to Gnosis Safe on Base mainnet.
param(
    [Parameter(Mandatory = $true)]
    [string]$SafeAddress
)

$ErrorActionPreference = "Stop"
Set-Location $PSScriptRoot\..

. "$PSScriptRoot\Load-EyesEnv.ps1"
Import-EyesEnv -RepoRoot (Get-Location)

if ($SafeAddress -notmatch '^0x[0-9a-fA-F]{40}$') {
    Write-Host "FAIL: SafeAddress must be 0x + 40 hex chars" -ForegroundColor Red
    exit 1
}

Require-EyesEnvVar "BASE_MAINNET_RPC_URL"
Require-EyesEnvVar "DEPLOYER_PRIVATE_KEY"

Set-EyesEnvValue "NEW_OWNER" $SafeAddress

$key = Get-EyesEnvValue "DEPLOYER_PRIVATE_KEY"
if ($key.StartsWith("0x")) { $keyHex = $key } else { $keyHex = "0x$key" }

Write-Host ""
Write-Host "=== Transfer EyesToken ownership -> Safe ===" -ForegroundColor Cyan
Write-Host "Safe: $SafeAddress" -ForegroundColor Yellow
Write-Host "Signer: deployer key from .env (must currently own token)" -ForegroundColor DarkGray
Write-Host ""

$rpc = Get-EyesEnvValue "BASE_MAINNET_RPC_URL"
forge script script/TransferEyesTokenOwnership.s.sol:TransferEyesTokenOwnership `
    --rpc-url $rpc --broadcast --private-key $keyHex -vvvv

Write-Host ""
Write-Host "Verify on BaseScan:" -ForegroundColor Green
Write-Host "  cast call <EYES_TOKEN> `"owner()(address)`" --rpc-url $rpc" -ForegroundColor White
