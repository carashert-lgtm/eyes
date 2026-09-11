# Build and deploy eyes_launch_factory to Solana (devnet or mainnet).
# Requires: Solana CLI + Anchor (run install-solana-toolchain.ps1 as Administrator first).
#
# Usage:
#   .\scripts\deploy-solana-program.ps1 -Cluster devnet
#   .\scripts\deploy-solana-program.ps1 -Cluster mainnet

param(
  [ValidateSet('devnet', 'mainnet')]
  [string]$Cluster = 'devnet'
)

$ErrorActionPreference = "Stop"
$repoRoot = Split-Path -Parent $PSScriptRoot
Set-Location $repoRoot

$solanaBin = Join-Path $env:USERPROFILE ".local\share\solana\install\active_release\bin"
if (Test-Path $solanaBin) {
  $env:Path = "$solanaBin;" + $env:Path
}

if (-not (Get-Command anchor -ErrorAction SilentlyContinue)) {
  Write-Error "Anchor not found. Run scripts/install-solana-toolchain.ps1 as Administrator."
}

$url = if ($Cluster -eq 'mainnet') { 'mainnet-beta' } else { 'devnet' }
solana config set --url $url

Write-Host "Building Anchor program..." -ForegroundColor Cyan
anchor build

Write-Host "Deploying to $Cluster..." -ForegroundColor Cyan
anchor deploy --provider.cluster $Cluster

$programId = (Get-Content "target\deploy\eyes_launch_factory-keypair.json" -Raw | ConvertFrom-Json)
$keypairPath = "target\deploy\eyes_launch_factory-keypair.json"
$id = (solana-keygen pubkey $keypairPath)

Write-Host "`nProgram ID: $id" -ForegroundColor Green

$outJson = @{
  cluster = $Cluster
  programId = $id
  deployedAt = (Get-Date).ToUniversalTime().ToString('o')
} | ConvertTo-Json

$outPath = "deployments\solana-$Cluster.json"
$outJson | Set-Content $outPath -Encoding utf8
Write-Host "Wrote $outPath"

Write-Host "`nInitialize factory (once per cluster):" -ForegroundColor Yellow
Write-Host "  anchor run initialize --provider.cluster $Cluster"

Write-Host "`nVercel env:" -ForegroundColor Yellow
Write-Host "  NEXT_PUBLIC_SOLANA_LAUNCH_PROGRAM_ID=$id"
if ($Cluster -eq 'devnet') {
  Write-Host "  NEXT_PUBLIC_SOLANA_CLUSTER=devnet"
  Write-Host "  NEXT_PUBLIC_SOLANA_RPC_URL=https://api.devnet.solana.com"
  Write-Host "  (Devnet testing is free — solana airdrop 2)"
} else {
  Write-Host "  NEXT_PUBLIC_SOLANA_CLUSTER=mainnet-beta"
  Write-Host "  SOLANA_RPC_URL=<your-helius-url>"
  Write-Host "  NEXT_PUBLIC_SOLANA_RPC_URL=<same-helius-url>"
  Write-Host "  (~1.5 SOL program deploy + ~0.25 SOL per test launch with 0.01 SOL LP)"
}
