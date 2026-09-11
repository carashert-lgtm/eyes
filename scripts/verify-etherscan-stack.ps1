# Verify Ethereum mainnet stack on Etherscan (v2 API).
$ErrorActionPreference = "Stop"
Set-Location $PSScriptRoot\..

. "$PSScriptRoot\Load-EyesEnv.ps1"
Import-EyesEnv -RepoRoot (Get-Location)

$deploy = Get-Content "deployments/ethereum-mainnet.json" | ConvertFrom-Json
$key = Get-EyesEnvValue "ETHERSCAN_API_KEY"
if (-not $key) { $key = Get-EyesEnvValue "BASESCAN_API_KEY" }
if (-not $key) {
    Write-Host "FAIL: set ETHERSCAN_API_KEY or BASESCAN_API_KEY in .env" -ForegroundColor Red
    exit 1
}

function Require-ForgeTool($name) {
    if (-not (Get-Command $name -ErrorAction SilentlyContinue)) {
        $fallback = Join-Path $env:USERPROFILE ".foundry\bin\$name.exe"
        if (Test-Path $fallback) { $env:Path = "$(Split-Path $fallback);$env:Path" }
        else { throw "$name not found" }
    }
}
Require-ForgeTool "forge"
Require-ForgeTool "cast"

$verifier = "https://api.etherscan.io/v2/api?chainid=1"

function Verify-Contract($address, $path, $args) {
    Write-Host ""
    Write-Host "=== $path @ $address ===" -ForegroundColor Cyan
    $cmd = @(
        "verify-contract", $address, $path,
        "--chain", "mainnet",
        "--verifier", "etherscan",
        "--verifier-url", $verifier,
        "--etherscan-api-key", $key,
        "--watch"
    )
    if ($args) { $cmd += @("--constructor-args", $args) }
    & forge @cmd
}

$treasury = if ($deploy.treasury) { $deploy.treasury } else { Get-EyesEnvValue "EYES_TREASURY" }
$tokenArgs = (cast abi-encode "constructor(address)" $treasury).Trim()
$feeArgs = (cast abi-encode "constructor(address,address)" $deploy.eyesToken "0x0000000000000000000000000000000000000000").Trim()
$factoryArgs = (cast abi-encode "constructor(address,address)" $deploy.eyesToken $deploy.feeCollector).Trim()
$seederArgs = (cast abi-encode "constructor(address,address,address)" $deploy.factory $deploy.liquidityLocker $deploy.dexRouter).Trim()
$routerArgs = (cast abi-encode "constructor(address,address,address)" $deploy.factory $deploy.feeCollector $deploy.dexRouter).Trim()
$burnArgs = (cast abi-encode "constructor(address,address,address)" $deploy.feeCollector $deploy.eyesToken $deploy.dexRouter).Trim()

if ($deploy.eyesToken) {
    Verify-Contract $deploy.eyesToken "src/EyesToken.sol:EyesToken" $tokenArgs
}
Verify-Contract $deploy.feeCollector "src/EyesFeeCollector.sol:EyesFeeCollector" $feeArgs
Verify-Contract $deploy.factory "src/EyesLaunchFactory.sol:EyesLaunchFactory" $factoryArgs
Verify-Contract $deploy.liquidityLocker "src/liquidity/EyesLiquidityLocker.sol:EyesLiquidityLocker" $null
Verify-Contract $deploy.liquiditySeeder "src/liquidity/EyesLiquiditySeeder.sol:EyesLiquiditySeeder" $seederArgs
Verify-Contract $deploy.feeRouter "src/trading/EyesFeeRouter.sol:EyesFeeRouter" $routerArgs
Verify-Contract $deploy.buyBurnExecutor "src/treasury/EyesBuyBurnExecutor.sol:EyesBuyBurnExecutor" $burnArgs

Write-Host ""
Write-Host "Done. Check Etherscan for green checkmarks." -ForegroundColor Green
