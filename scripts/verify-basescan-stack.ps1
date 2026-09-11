# Verify mainnet stack on BaseScan (Etherscan v2 API for Base).
$ErrorActionPreference = "Stop"
Set-Location $PSScriptRoot\..

. "$PSScriptRoot\Load-EyesEnv.ps1"
Import-EyesEnv -RepoRoot (Get-Location)

$deploy = Get-Content "deployments/base-mainnet.json" | ConvertFrom-Json
Require-EyesEnvVar "BASESCAN_API_KEY"

function Require-ForgeTool($name) {
    if (-not (Get-Command $name -ErrorAction SilentlyContinue)) {
        $fallback = Join-Path $env:USERPROFILE ".foundry\bin\$name.exe"
        if (Test-Path $fallback) { $env:Path = "$(Split-Path $fallback);$env:Path" }
        else { throw "$name not found" }
    }
}
Require-ForgeTool "forge"
Require-ForgeTool "cast"

$verifier = "https://api.etherscan.io/v2/api?chainid=8453"
$key = Get-EyesEnvValue "BASESCAN_API_KEY"

function Verify-Contract($address, $path, $args) {
    Write-Host ""
    Write-Host "=== $path @ $address ===" -ForegroundColor Cyan
    $cmd = @(
        "verify-contract", $address, $path,
        "--chain", "base",
        "--verifier", "etherscan",
        "--verifier-url", $verifier,
        "--etherscan-api-key", $key,
        "--watch"
    )
    if ($args) { $cmd += @("--constructor-args", $args) }
    & forge @cmd
}

$tokenArgs = (cast abi-encode "constructor(address)" $deploy.treasury).Trim()
$feeArgs = (cast abi-encode "constructor(address,address)" $deploy.eyesToken "0x0000000000000000000000000000000000000000").Trim()
$factoryArgs = (cast abi-encode "constructor(address,address)" $deploy.eyesToken $deploy.feeCollector).Trim()
$seederArgs = (cast abi-encode "constructor(address,address,address)" $deploy.factory $deploy.liquidityLocker $deploy.dexRouter).Trim()
$routerArgs = (cast abi-encode "constructor(address,address,address)" $deploy.factory $deploy.feeCollector $deploy.dexRouter).Trim()
$burnArgs = (cast abi-encode "constructor(address,address,address)" $deploy.feeCollector $deploy.eyesToken $deploy.dexRouter).Trim()

Verify-Contract $deploy.eyesToken "src/EyesToken.sol:EyesToken" $tokenArgs
Verify-Contract $deploy.feeCollector "src/EyesFeeCollector.sol:EyesFeeCollector" $feeArgs
Verify-Contract $deploy.factory "src/EyesLaunchFactory.sol:EyesLaunchFactory" $factoryArgs
Verify-Contract $deploy.liquidityLocker "src/liquidity/EyesLiquidityLocker.sol:EyesLiquidityLocker" $null
Verify-Contract $deploy.liquiditySeeder "src/liquidity/EyesLiquiditySeeder.sol:EyesLiquiditySeeder" $seederArgs
Verify-Contract $deploy.feeRouter "src/trading/EyesFeeRouter.sol:EyesFeeRouter" $routerArgs
Verify-Contract $deploy.buyBurnExecutor "src/treasury/EyesBuyBurnExecutor.sol:EyesBuyBurnExecutor" $burnArgs

Write-Host ""
Write-Host "Done. Check BaseScan for green checkmarks." -ForegroundColor Green
