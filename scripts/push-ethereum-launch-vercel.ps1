# Push Ethereum launch factory env to Vercel production.
$ErrorActionPreference = "Stop"
Set-Location $PSScriptRoot\..

. "$PSScriptRoot\Load-EyesEnv.ps1"
Import-EyesEnv -RepoRoot (Get-Location)

if (-not (Test-Path "deployments/ethereum-mainnet.json")) {
    Write-Host "FAIL: deployments/ethereum-mainnet.json not found - deploy stack first" -ForegroundColor Red
    exit 1
}

$deploy = Get-Content "deployments/ethereum-mainnet.json" | ConvertFrom-Json
if (-not $deploy.factory) {
    Write-Host "FAIL: factory address missing in deployment json" -ForegroundColor Red
    exit 1
}

function Set-VercelEnv {
    param([string]$Name, [string]$Value, [string]$Env = "production")
    if (-not $Value) { return }
    Write-Host "Setting $Name on Vercel ($Env)..." -ForegroundColor Cyan
    vercel env rm $Name $Env -y 2>$null | Out-Null
    echo $Value | vercel env add $Name $Env --yes 2>&1 | Out-Host
}

$factory = $deploy.factory
$rpc = Get-EyesEnvValue "ETHEREUM_MAINNET_RPC_URL"
if (-not $rpc) { $rpc = "https://ethereum.publicnode.com" }

Set-VercelEnv "NEXT_PUBLIC_LAUNCH_FACTORY_ETHEREUM" $factory
Set-VercelEnv "NEXT_PUBLIC_LAUNCH_DEFAULT_LP_ETH_MAINNET" "0.05"
Set-VercelEnv "ETHEREUM_MAINNET_RPC_URL" $rpc

if ($deploy.feeCollector) {
    Set-VercelEnv "NEXT_PUBLIC_FEE_COLLECTOR_ETHEREUM" $deploy.feeCollector
}

$chains = Get-EyesEnvValue "NEXT_PUBLIC_LAUNCH_CHAINS"
if (-not $chains) { $chains = "base,ethereum,solana" }
Set-VercelEnv "NEXT_PUBLIC_LAUNCH_CHAINS" $chains

Write-Host ""
Write-Host "Ethereum factory: $factory" -ForegroundColor Green
Write-Host "Redeploy: vercel deploy --prod --yes" -ForegroundColor Yellow
