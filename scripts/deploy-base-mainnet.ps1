# Deploy $EYES on Base mainnet (token only - no Uniswap LP).
# Presale distributor can send tokens; token is NOT publicly buyable until you seed LP later.
#
# Usage:
#   .\scripts\deploy-base-mainnet.ps1 -Step build
#   .\scripts\deploy-base-mainnet.ps1 -Step token -ConfirmMainnet
#   .\scripts\deploy-base-mainnet.ps1 -Step verify

param(
    [Parameter(Mandatory = $true)]
    [ValidateSet("build", "token", "verify", "basescan", "transfer-ownership", "stack")]
    [string]$Step,

    [switch]$ConfirmMainnet
)

$ErrorActionPreference = "Stop"
Set-Location $PSScriptRoot\..

. "$PSScriptRoot\Load-EyesEnv.ps1"
Import-EyesEnv -RepoRoot (Get-Location)

$webEnv = Join-Path (Get-Location) "web\.env.local"
if (Test-Path $webEnv) {
    Import-EyesDotEnvFile -Path $webEnv -FillMissingOnly
}

if (-not (Get-EyesEnvValue "BASE_MAINNET_RPC_URL")) {
    Set-EyesEnvValue "BASE_MAINNET_RPC_URL" "https://mainnet.base.org"
}
if (-not (Get-EyesEnvValue "UNISWAP_V2_ROUTER")) {
    Set-EyesEnvValue "UNISWAP_V2_ROUTER" "0x4752ba5DBc23f44D87826276BF6Fd6b1C372aD24"
}
if (-not (Get-EyesEnvValue "EYES_TOKEN")) {
    if (Test-Path "deployments/base-mainnet.json") {
        $j = Get-Content "deployments/base-mainnet.json" | ConvertFrom-Json
        if ($j.eyesToken) { Set-EyesEnvValue "EYES_TOKEN" $j.eyesToken }
    }
}

function Test-EyesPrivateKey {
    param([string]$Key)
    if (-not $Key) { return $false }
    $hex = if ($Key.StartsWith("0x")) { $Key.Substring(2) } else { $Key }
    return $hex -match '^[0-9a-fA-F]{64}$'
}

function Get-EyesPrivateKeyHex {
    param([string]$Key)
    if ($Key.StartsWith("0x")) { return $Key }
    return "0x$Key"
}

$env:EYES_DEPLOYMENT_PATH = "deployments/base-mainnet.json"
$env:EYES_ENV_SNIPPET_PATH = "deployments/base-mainnet.env"

function Require-Forge {
    $forge = Get-Command forge -ErrorAction SilentlyContinue
    if (-not $forge) {
        $fallback = Join-Path $env:USERPROFILE ".foundry\bin\forge.exe"
        if (Test-Path $fallback) {
            $env:Path = "$(Split-Path $fallback);$env:Path"
        } else {
            Write-Host "FAIL: forge not found. See docs/WINDOWS_SETUP.md" -ForegroundColor Red
            exit 1
        }
    }
}

Require-Forge

$rpc = Get-EyesEnvValue "BASE_MAINNET_RPC_URL"
$key = Get-EyesEnvValue "DEPLOYER_PRIVATE_KEY"
$treasury = Get-EyesEnvValue "EYES_TREASURY"
if (-not $treasury) {
    $treasury = Get-EyesEnvValue "NEXT_PUBLIC_PRESALE_RECIPIENT"
}
if ($treasury) {
    Set-EyesEnvValue "EYES_TREASURY" $treasury
}

Write-Host ""
Write-Host "=== Eyes Open - Base mainnet ($Step) ===" -ForegroundColor Cyan

switch ($Step) {
    "build" {
        if (-not (Test-Path "lib/forge-std")) {
            forge install OpenZeppelin/openzeppelin-contracts foundry-rs/forge-std
        }
        forge build
        forge test
    }
    "token" {
        if (-not $ConfirmMainnet) {
            Write-Host ""
            Write-Host "Mainnet deploy requires -ConfirmMainnet" -ForegroundColor Yellow
            Write-Host "  .\scripts\deploy-base-mainnet.ps1 -Step token -ConfirmMainnet" -ForegroundColor White
            Write-Host ""
            Write-Host 'This deploys $EYES only (no LP). Treasury receives 1B supply for presale sends.' -ForegroundColor DarkGray
            exit 1
        }
        Require-EyesEnvVar "BASE_MAINNET_RPC_URL"
        Require-EyesEnvVar "DEPLOYER_PRIVATE_KEY"

        $presaleRecipient = Get-EyesEnvValue "NEXT_PUBLIC_PRESALE_RECIPIENT"
        if ($presaleRecipient) {
            Set-EyesEnvValue "EYES_TREASURY" $presaleRecipient
            $treasury = $presaleRecipient
        }
        Require-EyesEnvVar "EYES_TREASURY"

        if (-not (Test-EyesPrivateKey $key)) {
            Write-Host ""
            Write-Host "FAIL: DEPLOYER_PRIVATE_KEY in .env is invalid (need 64-char hex, not a wallet address)." -ForegroundColor Red
            Write-Host "FIX:  Add the private key for your Base mainnet deployer wallet to .env" -ForegroundColor Yellow
            Write-Host "      Wallet needs a small amount of ETH on Base for gas (~0.001 ETH)." -ForegroundColor Yellow
            exit 1
        }

        $rpc = Get-EyesEnvValue "BASE_MAINNET_RPC_URL"
        $key = Get-EyesPrivateKeyHex (Get-EyesEnvValue "DEPLOYER_PRIVATE_KEY")

        Write-Host "Treasury (full supply): $treasury" -ForegroundColor Green
        Write-Host "Chain: Base mainnet (8453)" -ForegroundColor Green
        Write-Host "Skipping LP seed - token not publicly buyable on DEX" -ForegroundColor Yellow

        forge script script/DeployEyesTokenOnly.s.sol:DeployEyesTokenOnly `
            --rpc-url $rpc --broadcast --private-key $key -vvvv

        Write-Host ""
        Write-Host "Done. Merge deployments/base-mainnet.env into Railway + Vercel:" -ForegroundColor Green
        Write-Host "  EYES_TOKEN_ADDRESS / NEXT_PUBLIC_EYES_TOKEN_ADDRESS" -ForegroundColor White
        Write-Host "  PRESALE_DISTRIBUTOR_PRIVATE_KEY (treasury key)" -ForegroundColor White
        Write-Host "  Verify: .\scripts\deploy-base-mainnet.ps1 -Step verify" -ForegroundColor White
    }
    "verify" {
        Require-EyesEnvVar "BASE_MAINNET_RPC_URL"
        if (-not (Test-Path "deployments/base-mainnet.json")) {
            Write-Host "FAIL: run -Step token first" -ForegroundColor Red
            exit 1
        }
        $j = Get-Content "deployments/base-mainnet.json" | ConvertFrom-Json
        if ($j.factory) {
            forge script script/VerifyDeployment.s.sol:VerifyDeployment --rpc-url $rpc -vvvv
        } else {
            forge script script/VerifyEyesTokenOnly.s.sol:VerifyEyesTokenOnly --rpc-url $rpc -vvvv
        }
    }
    "basescan" {
        & "$PSScriptRoot\verify-basescan-mainnet.ps1"
    }
    "stack" {
        if (-not $ConfirmMainnet) {
            Write-Host "Mainnet stack deploy requires -ConfirmMainnet" -ForegroundColor Yellow
            exit 1
        }
        Require-EyesEnvVar "BASE_MAINNET_RPC_URL"
        Require-EyesEnvVar "DEPLOYER_PRIVATE_KEY"
        if (-not (Get-EyesEnvValue "EYES_TOKEN")) {
            Write-Host "FAIL: EYES_TOKEN not set and not in base-mainnet.json" -ForegroundColor Red
            exit 1
        }
        if (-not (Test-EyesPrivateKey (Get-EyesEnvValue "DEPLOYER_PRIVATE_KEY"))) {
            Write-Host "FAIL: invalid DEPLOYER_PRIVATE_KEY" -ForegroundColor Red
            exit 1
        }
        Set-EyesEnvValue "UNISWAP_V2_ROUTER" "0x4752ba5DBc23f44D87826276BF6Fd6b1C372aD24"
        $key = Get-EyesPrivateKeyHex (Get-EyesEnvValue "DEPLOYER_PRIVATE_KEY")
        Write-Host "Using existing EYES_TOKEN: $(Get-EyesEnvValue 'EYES_TOKEN')" -ForegroundColor Green
        forge script script/DeployEyesStackMainnet.s.sol:DeployEyesStackMainnet `
            --rpc-url $rpc --broadcast --private-key $key -vvvv
        Write-Host ""
        Write-Host "Next: -Step verify, push factory/collector to Vercel, transfer ownership to Safe" -ForegroundColor Green
    }
    "transfer-ownership" {
        $safe = Get-EyesEnvValue "NEW_OWNER"
        if (-not $safe) {
            Write-Host "FAIL: set NEW_OWNER in .env to your Gnosis Safe address" -ForegroundColor Red
            exit 1
        }
        & "$PSScriptRoot\transfer-ownership-mainnet.ps1" -SafeAddress $safe
    }
}
