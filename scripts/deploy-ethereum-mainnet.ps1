# Deploy $EYES + launch stack on Ethereum mainnet.
#
# Usage:
#   .\scripts\deploy-ethereum-mainnet.ps1 -Step build
#   .\scripts\deploy-ethereum-mainnet.ps1 -Step check
#   .\scripts\deploy-ethereum-mainnet.ps1 -Step token -ConfirmMainnet
#   .\scripts\deploy-ethereum-mainnet.ps1 -Step stack -ConfirmMainnet
#   .\scripts\deploy-ethereum-mainnet.ps1 -Step verify
#   .\scripts\deploy-ethereum-mainnet.ps1 -Step etherscan
#   .\scripts\deploy-ethereum-mainnet.ps1 -Step push-vercel

param(
    [Parameter(Mandatory = $true)]
    [ValidateSet("build", "check", "token", "stack", "verify", "etherscan", "push-vercel")]
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

if (-not (Get-EyesEnvValue "ETHEREUM_MAINNET_RPC_URL")) {
    Set-EyesEnvValue "ETHEREUM_MAINNET_RPC_URL" "https://ethereum.publicnode.com"
}
if (-not (Get-EyesEnvValue "UNISWAP_V2_ROUTER")) {
    Set-EyesEnvValue "UNISWAP_V2_ROUTER" "0x7a250d5630B4cF539739dF2C5dAcb4c659F2488D"
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
    return "0x$key"
}

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

$rpc = Get-EyesEnvValue "ETHEREUM_MAINNET_RPC_URL"
$key = Get-EyesEnvValue "DEPLOYER_PRIVATE_KEY"
$treasury = Get-EyesEnvValue "EYES_TREASURY"
if (-not $treasury) {
    $treasury = Get-EyesEnvValue "NEXT_PUBLIC_PRESALE_RECIPIENT"
}
if ($treasury) {
    Set-EyesEnvValue "EYES_TREASURY" $treasury
}

Write-Host ""
Write-Host "=== Eyes Open - Ethereum mainnet ($Step) ===" -ForegroundColor Cyan

switch ($Step) {
    "build" {
        if (-not (Test-Path "lib/forge-std")) {
            forge install OpenZeppelin/openzeppelin-contracts foundry-rs/forge-std
        }
        forge build
        forge test
    }
    "check" {
        & "$PSScriptRoot\check-ethereum-launch-ready.ps1"
    }
    "token" {
        if (-not $ConfirmMainnet) {
            Write-Host "Mainnet token deploy requires -ConfirmMainnet" -ForegroundColor Yellow
            exit 1
        }
        Require-EyesEnvVar "ETHEREUM_MAINNET_RPC_URL"
        Require-EyesEnvVar "DEPLOYER_PRIVATE_KEY"
        Require-EyesEnvVar "EYES_TREASURY"
        if (-not (Test-EyesPrivateKey (Get-EyesEnvValue "DEPLOYER_PRIVATE_KEY"))) {
            Write-Host "FAIL: invalid DEPLOYER_PRIVATE_KEY" -ForegroundColor Red
            exit 1
        }

        $env:EYES_DEPLOYMENT_PATH = "deployments/ethereum-mainnet.json"
        $env:EYES_ENV_SNIPPET_PATH = "deployments/ethereum-mainnet.env"
        $keyHex = Get-EyesPrivateKeyHex (Get-EyesEnvValue "DEPLOYER_PRIVATE_KEY")

        Write-Host "Treasury: $treasury" -ForegroundColor Green
        Write-Host "Chain: Ethereum mainnet (1)" -ForegroundColor Green
        Write-Host "Launch fees still settle on Base - this token wires the ETH launch stack." -ForegroundColor Yellow

        forge script script/DeployEyesTokenEthereum.s.sol:DeployEyesTokenEthereum `
            --rpc-url $rpc --broadcast --private-key $keyHex -vvvv

        if (Test-Path "deployments/ethereum-mainnet.json") {
            $deploy = Get-Content "deployments/ethereum-mainnet.json" | ConvertFrom-Json
            if ($deploy.eyesToken) {
                Set-EyesEnvValue "EYES_TOKEN" $deploy.eyesToken
                Write-Host "Set EYES_TOKEN=$($deploy.eyesToken) in .env" -ForegroundColor Green
            }
        }
        Write-Host "Next: -Step stack -ConfirmMainnet" -ForegroundColor Green
    }
    "stack" {
        if (-not $ConfirmMainnet) {
            Write-Host "Mainnet stack deploy requires -ConfirmMainnet" -ForegroundColor Yellow
            exit 1
        }
        Require-EyesEnvVar "ETHEREUM_MAINNET_RPC_URL"
        Require-EyesEnvVar "DEPLOYER_PRIVATE_KEY"

        if (-not (Get-EyesEnvValue "EYES_TOKEN")) {
            if (Test-Path "deployments/ethereum-mainnet.json") {
                $j = Get-Content "deployments/ethereum-mainnet.json" | ConvertFrom-Json
                if ($j.eyesToken) { Set-EyesEnvValue "EYES_TOKEN" $j.eyesToken }
            }
        }
        if (-not (Get-EyesEnvValue "EYES_TOKEN")) {
            Write-Host "FAIL: EYES_TOKEN not set - run -Step token first" -ForegroundColor Red
            exit 1
        }
        if (-not (Test-EyesPrivateKey (Get-EyesEnvValue "DEPLOYER_PRIVATE_KEY"))) {
            Write-Host "FAIL: invalid DEPLOYER_PRIVATE_KEY" -ForegroundColor Red
            exit 1
        }

        $env:EYES_DEPLOYMENT_PATH = "deployments/ethereum-mainnet.json"
        $env:EYES_ENV_SNIPPET_PATH = "deployments/ethereum-mainnet.env"
        Set-EyesEnvValue "UNISWAP_V2_ROUTER" "0x7a250d5630B4cF539739dF2C5dAcb4c659F2488D"
        $keyHex = Get-EyesPrivateKeyHex (Get-EyesEnvValue "DEPLOYER_PRIVATE_KEY")

        Write-Host "Using EYES_TOKEN: $(Get-EyesEnvValue 'EYES_TOKEN')" -ForegroundColor Green
        forge script script/DeployEyesStackEthereum.s.sol:DeployEyesStackEthereum `
            --rpc-url $rpc --broadcast --private-key $keyHex -vvvv

        Write-Host ""
        Write-Host "Next: -Step verify, -Step etherscan, -Step push-vercel" -ForegroundColor Green
    }
    "verify" {
        Require-EyesEnvVar "ETHEREUM_MAINNET_RPC_URL"
        if (-not (Test-Path "deployments/ethereum-mainnet.json")) {
            Write-Host "FAIL: run -Step stack first" -ForegroundColor Red
            exit 1
        }
        $j = Get-Content "deployments/ethereum-mainnet.json" | ConvertFrom-Json
        if ($j.factory) {
            forge script script/VerifyDeployment.s.sol:VerifyDeployment --rpc-url $rpc -vvvv
        } else {
            Write-Host "FAIL: factory missing in ethereum-mainnet.json" -ForegroundColor Red
            exit 1
        }
    }
    "etherscan" {
        & "$PSScriptRoot\verify-etherscan-stack.ps1"
    }
    "push-vercel" {
        & "$PSScriptRoot\push-ethereum-launch-vercel.ps1"
    }
}
