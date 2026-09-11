# Smoke-test launch networks before mainnet spend (read-only where possible).
$ErrorActionPreference = "Stop"
$repoRoot = Split-Path -Parent $PSScriptRoot
Set-Location $repoRoot

Write-Host "`n=== Launch network smoke tests ===" -ForegroundColor Cyan

Write-Host "`n[Ethereum] Production preflight API..." -ForegroundColor Yellow
try {
  $eth = Invoke-RestMethod "https://www.eyesopen.to/api/launch/preflight?chain=ethereum&wallet=0x2C8988415c9f2D2a8F9bAE2489e400e3a351d00f"
  if ($eth.ok) { Write-Host "  PASS - factory $($eth.factory)" -ForegroundColor Green }
  else { Write-Host "  FAIL - $($eth.issues -join ', ')" -ForegroundColor Red }
} catch {
  Write-Host "  FAIL - $($_.Exception.Message)" -ForegroundColor Red
}

Write-Host "`n[Ethereum] On-chain factory read..." -ForegroundColor Yellow
Push-Location "$repoRoot\web"
node scripts/test-ethereum-launch.mjs
$ethExit = $LASTEXITCODE
Pop-Location
if ($ethExit -ne 0) { exit $ethExit }

Write-Host "`n[Base] Production preflight API..." -ForegroundColor Yellow
try {
  $base = Invoke-RestMethod "https://www.eyesopen.to/api/launch/preflight?chain=base&wallet=0x2C8988415c9f2D2a8F9bAE2489e400e3a351d00f"
  if ($base.ok) { Write-Host "  PASS - factory $($base.factory)" -ForegroundColor Green }
  else { Write-Host "  FAIL - $($base.issues -join ', ')" -ForegroundColor Red }
} catch {
  Write-Host "  FAIL - $($_.Exception.Message)" -ForegroundColor Red
}

Write-Host "`n[Solana] Devnet RPC + airdrop probe..." -ForegroundColor Yellow
Push-Location "$repoRoot\web"
$env:NEXT_PUBLIC_SOLANA_CLUSTER = "devnet"
if ($env:NEXT_PUBLIC_SOLANA_LAUNCH_PROGRAM_ID) {
  node scripts/test-solana-devnet.mjs
} else {
  Write-Host "  SKIP program check - set NEXT_PUBLIC_SOLANA_LAUNCH_PROGRAM_ID after devnet deploy" -ForegroundColor DarkYellow
  node scripts/test-solana-devnet.mjs
}
$solExit = $LASTEXITCODE
Pop-Location

Write-Host "`nDone." -ForegroundColor Cyan
if ($solExit -ne 0) {
  Write-Host "Solana devnet needs: faucet SOL to deploy/devnet-keypair.json then deploy program." -ForegroundColor DarkYellow
}
