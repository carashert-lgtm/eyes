param(
    [Parameter(Mandatory = $true)]
    [ValidateSet("doctor", "preflight", "deploy", "seed", "e2e", "keeper", "verify", "transfer", "build", "all")]
    [string]$Step
)

$ErrorActionPreference = "Stop"
Set-Location $PSScriptRoot\..

. "$PSScriptRoot\Load-EyesEnv.ps1"
Import-EyesEnv -RepoRoot (Get-Location)

function Require-Forge {
    $forge = Get-Command forge -ErrorAction SilentlyContinue
    if (-not $forge) {
        $fallback = Join-Path $env:USERPROFILE ".foundry\bin\forge.exe"
        if (Test-Path $fallback) {
            $env:Path = "$(Split-Path $fallback);$env:Path"
        } else {
            Write-Host "FAIL: forge not found." -ForegroundColor Red
            Write-Host "FIX:  See docs/WINDOWS_SETUP.md" -ForegroundColor Yellow
            exit 1
        }
    }
}

Require-Forge

$rpc = Get-EyesEnvValue "BASE_SEPOLIA_RPC_URL"
$key = Get-EyesEnvValue "DEPLOYER_PRIVATE_KEY"

if ($Step -notin @("build", "doctor", "preflight")) {
    Require-EyesEnvVar "BASE_SEPOLIA_RPC_URL"
    Require-EyesEnvVar "DEPLOYER_PRIVATE_KEY"
}

Write-Host "`n=== Eyes Open - $Step ===" -ForegroundColor Cyan

switch ($Step) {
    "doctor" {
        Require-EyesEnvVar "BASE_SEPOLIA_RPC_URL"
        Require-EyesEnvVar "DEPLOYER_PRIVATE_KEY"
        forge script script/Doctor.s.sol:Doctor --rpc-url $rpc -vvvv
    }
    "preflight" {
        & $PSCommandPath -Step doctor
    }
    "build" {
        if (-not (Test-Path "lib/forge-std")) {
            Write-Host "Installing dependencies..."
            git --version *> $null
            if ($LASTEXITCODE -ne 0) {
                Write-Host "FAIL: git not found. Install: winget install Git.Git" -ForegroundColor Red
                exit 1
            }
            forge install OpenZeppelin/openzeppelin-contracts foundry-rs/forge-std
        }
        forge build
        forge test
    }
    "deploy" {
        forge script script/DeployEyes.s.sol:DeployEyes `
            --rpc-url $rpc --broadcast --private-key $key -vvvv
        Write-Host "`nNext: merge deployments/base-sepolia.env into .env" -ForegroundColor Green
    }
    "seed" {
        forge script script/SeedEyesLiquidity.s.sol:SeedEyesLiquidity `
            --rpc-url $rpc --broadcast --private-key $key -vvvv
    }
    "e2e" {
        forge script script/EyesE2EDemo.s.sol:EyesE2EDemo `
            --rpc-url $rpc --broadcast --private-key $key -vvvv
    }
    "keeper" {
        forge script script/RunKeeper.s.sol:RunKeeper `
            --rpc-url $rpc --broadcast --private-key $key -vvvv
    }
    "verify" {
        forge script script/VerifyDeployment.s.sol:VerifyDeployment --rpc-url $rpc -vvvv
    }
    "transfer" {
        Require-EyesEnvVar "NEW_OWNER"
        forge script script/TransferOwnership.s.sol:TransferOwnership `
            --rpc-url $rpc --broadcast --private-key $key -vvvv
    }
    "all" {
        & $PSCommandPath -Step build
        & $PSCommandPath -Step deploy
        Import-EyesEnv -RepoRoot (Get-Location)
        & $PSCommandPath -Step seed
        & $PSCommandPath -Step e2e
        & $PSCommandPath -Step verify
    }
}
