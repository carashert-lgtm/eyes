# Verify $EYES token on BaseScan (mainnet token-only deploy).
$ErrorActionPreference = "Stop"
Set-Location $PSScriptRoot\..

. "$PSScriptRoot\Load-EyesEnv.ps1"
Import-EyesEnv -RepoRoot (Get-Location)

if (-not (Test-Path "deployments/base-mainnet.json")) {
    Write-Host "FAIL: deployments/base-mainnet.json missing" -ForegroundColor Red
    exit 1
}

$deploy = Get-Content "deployments/base-mainnet.json" | ConvertFrom-Json
$token = $deploy.eyesToken
$treasury = $deploy.treasury

Require-EyesEnvVar "BASESCAN_API_KEY"

function Require-Forge {
    $forge = Get-Command forge -ErrorAction SilentlyContinue
    if (-not $forge) {
        $fallback = Join-Path $env:USERPROFILE ".foundry\bin\forge.exe"
        if (Test-Path $fallback) {
            $env:Path = "$(Split-Path $fallback);$env:Path"
        } else {
            Write-Host "FAIL: forge not found" -ForegroundColor Red
            exit 1
        }
    }
}

Require-Forge

Write-Host ""
Write-Host "=== BaseScan verify: EyesToken ===" -ForegroundColor Cyan
Write-Host "Token:    $token" -ForegroundColor DarkGray
Write-Host "Treasury: $treasury" -ForegroundColor DarkGray
Write-Host ""

$ctorArgs = & cast abi-encode "constructor(address)" $treasury
if ($LASTEXITCODE -ne 0) { exit 1 }

forge verify-contract $token `
    src/EyesToken.sol:EyesToken `
    --constructor-args $ctorArgs `
    --chain base `
    --verifier etherscan `
    --verifier-url "https://api.etherscan.io/v2/api?chainid=8453" `
    --etherscan-api-key (Get-EyesEnvValue "BASESCAN_API_KEY") `
    --watch

Write-Host ""
Write-Host "Check: https://basescan.org/address/$token#code" -ForegroundColor Green
