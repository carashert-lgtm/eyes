# Push Solana launch env vars to Vercel Production.
# Usage: .\scripts\push-solana-launch-vercel.ps1 -ProgramId <pubkey> -RpcUrl <helius-url>

param(
  [Parameter(Mandatory = $true)]
  [string]$ProgramId,
  [Parameter(Mandatory = $true)]
  [string]$RpcUrl,
  [string]$DefaultLpSol = "0.05"
)

$ErrorActionPreference = "Stop"
Set-Location (Split-Path -Parent $PSScriptRoot)

Write-Host "Setting Solana launch env on Vercel (Production)..." -ForegroundColor Cyan

echo $ProgramId | vercel env add NEXT_PUBLIC_SOLANA_LAUNCH_PROGRAM_ID production
echo $RpcUrl | vercel env add SOLANA_RPC_URL production
echo $DefaultLpSol | vercel env add NEXT_PUBLIC_LAUNCH_DEFAULT_LP_SOL production

Write-Host "Done. Redeploy production for changes to take effect:" -ForegroundColor Green
Write-Host "  vercel deploy --prod --yes"
