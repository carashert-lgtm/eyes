# Fill remaining Vercel production env gaps for eyes project.
# Usage: paste values when prompted, or pass as params.
# Run from repo root: .\scripts\add-vercel-env-gaps.ps1

param(
  [string]$GoogleClientId,
  [string]$GoogleClientSecret,
  [string]$DiscordInviteUrl,
  [string]$WalletConnectProjectId,
  [string]$EtherscanApiKey,
  [string]$AlchemyBaseRpcUrl
)

$ErrorActionPreference = "Stop"
Set-Location (Split-Path -Parent $PSScriptRoot)

function Add-VercelEnv {
  param([string]$Name, [string]$Value, [string]$Env = "production")
  if (-not $Value) { Write-Host "  skip $Name (empty)" -ForegroundColor DarkGray; return }
  Write-Host "Adding $Name -> $Env ..."
  echo $Value | vercel env add $Name $Env --yes 2>&1 | Out-Host
}

Write-Host "Eyes Open — Vercel env gaps" -ForegroundColor Cyan

if (-not $GoogleClientId) { $GoogleClientId = Read-Host "GOOGLE_CLIENT_ID (optional, Enter to skip)" }
if (-not $GoogleClientSecret) { $GoogleClientSecret = Read-Host "GOOGLE_CLIENT_SECRET (optional)" }
if (-not $DiscordInviteUrl) { $DiscordInviteUrl = Read-Host "NEXT_PUBLIC_SOCIAL_DISCORD e.g. https://discord.gg/xxxxx (optional)" }
if (-not $WalletConnectProjectId) { $WalletConnectProjectId = Read-Host "NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID (optional)" }
if (-not $EtherscanApiKey) { $EtherscanApiKey = Read-Host "BASESCAN_API_KEY / ETHERSCAN_API_KEY (optional)" }
if (-not $AlchemyBaseRpcUrl) { $AlchemyBaseRpcUrl = Read-Host "BASE_MAINNET_RPC_URL Alchemy URL (optional)" }

Add-VercelEnv "GOOGLE_CLIENT_ID" $GoogleClientId
Add-VercelEnv "GOOGLE_CLIENT_SECRET" $GoogleClientSecret
Add-VercelEnv "NEXT_PUBLIC_SOCIAL_DISCORD" $DiscordInviteUrl
Add-VercelEnv "NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID" $WalletConnectProjectId
Add-VercelEnv "BASESCAN_API_KEY" $EtherscanApiKey
Add-VercelEnv "ETHERSCAN_API_KEY" $EtherscanApiKey
if ($AlchemyBaseRpcUrl) {
  vercel env rm BASE_MAINNET_RPC_URL production -y 2>$null | Out-Null
  Add-VercelEnv "BASE_MAINNET_RPC_URL" $AlchemyBaseRpcUrl
}

Write-Host ""
Write-Host "Done. Redeploy: vercel deploy --prod --yes" -ForegroundColor Green
