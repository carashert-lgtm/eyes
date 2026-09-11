param(
    [Parameter(Mandatory = $true)]
    [ValidateSet("doctor", "build", "dex", "deploy", "configure", "seed", "e2e", "keeper", "verify", "coin-verify", "refresh", "sync-web", "all")]
    [string]$Step
)

$ErrorActionPreference = "Stop"
Set-Location $PSScriptRoot\..

. "$PSScriptRoot\Load-AnvilEnv.ps1"
Import-AnvilEnv -RepoRoot (Get-Location)

function Require-Forge {
    $forge = Get-Command forge -ErrorAction SilentlyContinue
    if (-not $forge) {
        $fallback = Join-Path $env:USERPROFILE ".foundry\bin\forge.exe"
        if (Test-Path $fallback) {
            $env:Path = "$(Split-Path $fallback);$env:Path"
        } else {
            Write-Host "FAIL: forge not found." -ForegroundColor Red
            exit 1
        }
    }
}

function Test-AnvilRunning {
    param([string]$RpcUrl)
    try {
        $body = '{"jsonrpc":"2.0","method":"eth_chainId","params":[],"id":1}'
        $resp = Invoke-RestMethod -Uri $RpcUrl -Method Post -Body $body -ContentType "application/json" -TimeoutSec 3
        return $resp.result -eq "0x7a69"  # 31337
    } catch {
        return $false
    }
}

function Test-ContractHasCode {
    param(
        [string]$RpcUrl,
        [string]$Address
    )
    try {
        $body = @{
            jsonrpc = "2.0"
            method  = "eth_getCode"
            params  = @($Address, "latest")
            id      = 1
        } | ConvertTo-Json
        $resp = Invoke-RestMethod -Uri $RpcUrl -Method Post -Body $body -ContentType "application/json" -TimeoutSec 5
        $code = [string]$resp.result
        return ($code -and $code -ne "0x" -and $code.Length -gt 2)
    } catch {
        return $false
    }
}

function Ensure-AnvilDeploymentFresh {
    param([string]$RpcUrl)

    $deployJson = Join-Path (Get-Location) "deployments\anvil.json"
    if (-not (Test-Path $deployJson)) {
        Write-Host "FAIL: deployments/anvil.json missing. Run -Step dex then deploy." -ForegroundColor Red
        exit 1
    }

    $deploy = Get-Content $deployJson | ConvertFrom-Json
    if (Test-ContractHasCode -RpcUrl $RpcUrl -Address $deploy.factory) {
        return
    }

    Write-Host "Stale Anvil deployment (chain was reset). Re-deploying stack..." -ForegroundColor Yellow
    foreach ($s in @("dex", "deploy", "configure", "e2e")) {
        & $PSCommandPath -Step $s
        if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }
    }
    & "$PSScriptRoot\sync-deploy-to-web.ps1" -Network anvil
}

Require-Forge

$rpc = Get-EyesEnvValue "ANVIL_RPC_URL"
$sender = Get-EyesEnvValue "EYES_TREASURY"

if ($Step -notin @("build")) {
    if (-not (Test-AnvilRunning -RpcUrl $rpc)) {
        Write-Host "FAIL: Anvil is not running on $rpc" -ForegroundColor Red
        Write-Host "FIX:  Start in another terminal: .\scripts\start-anvil.ps1" -ForegroundColor Yellow
        exit 1
    }
}

Write-Host "`n=== Eyes Open Anvil - $Step ===" -ForegroundColor Cyan

switch ($Step) {
    "doctor" {
        forge script script/Doctor.s.sol:Doctor --rpc-url $rpc -vvvv
    }
    "build" {
        if (-not (Test-Path "lib/forge-std")) {
            forge install OpenZeppelin/openzeppelin-contracts foundry-rs/forge-std
        }
        forge build
        forge test --no-match-test "skip"
    }
    "dex" {
        forge script script/DeployLocalDex.s.sol:DeployLocalDex `
            --rpc-url $rpc --broadcast --unlocked --sender $sender -vvvv
        if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }
        Import-AnvilEnv -RepoRoot (Get-Location)
        Write-Host "`nMock DEX deployed. UNISWAP_V2_ROUTER set in deployments/anvil-dex.env" -ForegroundColor Green
    }
    "deploy" {
        Import-AnvilEnv -RepoRoot (Get-Location)
        if (-not (Get-EyesEnvValue "UNISWAP_V2_ROUTER")) {
            Write-Host "FAIL: Run -Step dex first (mock Uniswap required on Anvil)." -ForegroundColor Red
            exit 1
        }
        forge script script/DeployEyes.s.sol:DeployEyes `
            --rpc-url $rpc --broadcast --unlocked --sender $sender -vvvv
        Import-AnvilEnv -RepoRoot (Get-Location)
    }
    "configure" {
        forge script script/ConfigureLocalDex.s.sol:ConfigureLocalDex `
            --rpc-url $rpc --broadcast --unlocked --sender $sender -vvvv
    }
    "seed" {
        forge script script/SeedEyesLiquidity.s.sol:SeedEyesLiquidity `
            --rpc-url $rpc --broadcast --unlocked --sender $sender -vvvv
    }
    "e2e" {
        forge script script/EyesE2EDemo.s.sol:EyesE2EDemo `
            --rpc-url $rpc --broadcast --unlocked --sender $sender -vvvv
    }
    "keeper" {
        forge script script/RunKeeper.s.sol:RunKeeper `
            --rpc-url $rpc --broadcast --unlocked --sender $sender -vvvv
    }
    "verify" {
        forge script script/VerifyDeployment.s.sol:VerifyDeployment --rpc-url $rpc -vvvv
    }
    "coin-verify" {
        Ensure-AnvilDeploymentFresh -RpcUrl $rpc
        forge script script/AnvilCoinVerify.s.sol:AnvilCoinVerify --rpc-url $rpc -vvvv
        if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }
        forge script script/AnvilCoinVerify.s.sol:AnvilCoinVerify --sig "runWindowChecks()" --rpc-url $rpc -vvvv
    }
    "refresh" {
        foreach ($s in @("dex", "deploy", "configure", "e2e", "sync-web")) {
            & $PSCommandPath -Step $s
            if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }
        }
        Write-Host "`nAnvil stack refreshed. Run -Step coin-verify to validate." -ForegroundColor Green
    }
    "sync-web" {
        & "$PSScriptRoot\sync-deploy-to-web.ps1" -Network anvil
    }
    "all" {
        foreach ($s in @("build", "dex", "deploy", "seed", "configure", "e2e", "verify", "coin-verify", "keeper", "sync-web")) {
            & $PSCommandPath -Step $s
            if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }
        }
        Write-Host "`n=== Anvil full stack ready ===" -ForegroundColor Green
        Write-Host "Web: NEXT_PUBLIC_USE_ANVIL=true then restart npm run dev" -ForegroundColor Cyan
    }
}
