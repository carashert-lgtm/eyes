# Sync deployed contract addresses into web/.env.local

# Usage:

#   .\scripts\sync-deploy-to-web.ps1              # Base Sepolia (default)

#   .\scripts\sync-deploy-to-web.ps1 -Network anvil



param(

    [ValidateSet("base-sepolia", "anvil")]

    [string]$Network = "base-sepolia"

)



$ErrorActionPreference = "Stop"

$repoRoot = Split-Path -Parent $PSScriptRoot



if ($Network -eq "anvil") {

    $deployJson = Join-Path $repoRoot "deployments\anvil.json"

    $chainId = "31337"

    $chainName = "Anvil Local"

    $useAnvil = "true"

    $presaleRecipient = "0x3dFf4ADfA6d7482e3fFB362Aa9d6370bCC45c4b5"

    $anvilRpc = "http://127.0.0.1:8545"

} else {

    $deployJson = Join-Path $repoRoot "deployments\base-sepolia.json"

    $chainId = "84532"

    $chainName = "Base Sepolia"

    $useAnvil = "false"

    $presaleRecipient = $null

    $anvilRpc = $null

}



$webEnv = Join-Path $repoRoot "web\.env.local"



if (-not (Test-Path $deployJson)) {

    Write-Host "FAIL: $deployJson not found. Run deploy first." -ForegroundColor Red

    exit 1

}



$deploy = Get-Content $deployJson | ConvertFrom-Json



function Set-EnvLine {

    param([string]$Path, [string]$Key, [string]$Value)

    $lines = @()

    if (Test-Path $Path) { $lines = Get-Content $Path }

    $filtered = $lines | Where-Object { $_ -notmatch "^$([regex]::Escape($Key))=" }

    $filtered += "$Key=$Value"

    Set-Content -Path $Path -Value $filtered -Encoding UTF8

}



$map = @{

    "NEXT_PUBLIC_EYES_TOKEN_ADDRESS" = $deploy.eyesToken

    "NEXT_PUBLIC_LAUNCH_FACTORY_ADDRESS" = $deploy.factory

    "NEXT_PUBLIC_FEE_COLLECTOR_ADDRESS" = $deploy.feeCollector

    "NEXT_PUBLIC_CHAIN_ID" = $chainId

    "NEXT_PUBLIC_CHAIN_NAME" = $chainName

    "NEXT_PUBLIC_FEATURE_WALLET" = "true"

    "NEXT_PUBLIC_FEATURE_CREATE_LAUNCH" = "true"

    "NEXT_PUBLIC_USE_ANVIL" = $useAnvil

}

if ($Network -eq "anvil") {
    $map["NEXT_PUBLIC_APP_ENV"] = "local"
    $map["NEXT_PUBLIC_SITE_URL"] = "http://localhost:3000"
    $map["PLATFORM_SNAPSHOT_PATH"] = "./data/platform-snapshot.json"
}



if ($presaleRecipient) {

    $map["NEXT_PUBLIC_PRESALE_RECIPIENT"] = $presaleRecipient

}

if ($anvilRpc) {

    $map["NEXT_PUBLIC_ANVIL_RPC_URL"] = $anvilRpc

    $map["BOT_WEBHOOK_URL"] = "http://localhost:3847"

}



if (-not (Test-Path $webEnv)) {

    New-Item -Path $webEnv -ItemType File -Force | Out-Null

}



foreach ($entry in $map.GetEnumerator()) {

    if ($entry.Value) {

        Set-EnvLine -Path $webEnv -Key $entry.Key -Value $entry.Value

        Write-Host "Set $($entry.Key)=$($entry.Value)" -ForegroundColor Green

    }

}



Write-Host "`nDone ($Network). Restart web dev server." -ForegroundColor Cyan

if ($Network -eq "anvil") {

    Write-Host "MetaMask: add network RPC $anvilRpc chain ID $chainId" -ForegroundColor Yellow

    Write-Host "Import Anvil account #0 private key for presale sends (see docs/LOCAL_ANVIL_TEST.md)" -ForegroundColor Yellow

}

