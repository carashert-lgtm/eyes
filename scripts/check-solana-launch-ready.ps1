# Preflight checklist for Solana fair launch go-live.

$ErrorActionPreference = "Stop"
$repoRoot = Split-Path -Parent $PSScriptRoot
Set-Location $repoRoot

Write-Host "=== Solana launch readiness ===" -ForegroundColor Cyan

$issues = @()

if (-not (Test-Path "programs/eyes_launch_factory/src/lib.rs")) {
  $issues += "Anchor program missing at programs/eyes_launch_factory"
}

if (-not (Get-Command solana -ErrorAction SilentlyContinue)) {
  $issues += "Solana CLI not installed — run scripts/install-solana-toolchain.ps1"
}

if (-not (Get-Command anchor -ErrorAction SilentlyContinue)) {
  $issues += "Anchor not installed — run scripts/install-solana-toolchain.ps1"
}

$programId = $env:NEXT_PUBLIC_SOLANA_LAUNCH_PROGRAM_ID
if (-not $programId) {
  $issues += "NEXT_PUBLIC_SOLANA_LAUNCH_PROGRAM_ID not set"
}

$rpc = $env:SOLANA_RPC_URL
if (-not $rpc) {
  $issues += "SOLANA_RPC_URL not set (use Helius/QuickNode mainnet RPC)"
}

if ($issues.Count -eq 0) {
  Write-Host "All local checks passed." -ForegroundColor Green
  Write-Host "Program ID: $programId"
  Write-Host "RPC: $($rpc.Substring(0, [Math]::Min(40, $rpc.Length)))..."
} else {
  Write-Host "Issues found:" -ForegroundColor Red
  $issues | ForEach-Object { Write-Host "  - $_" }
  exit 1
}
