# Deploy Eyes Solana launch program to MAINNET once deploy wallet is funded.
# Send mainnet SOL to the address printed below BEFORE running this.

$ErrorActionPreference = "Stop"
$repoRoot = Split-Path -Parent $PSScriptRoot
Set-Location $repoRoot

$SOL = Join-Path $env:USERPROFILE ".local\share\solana\install\releases\stable-e29e5d910f0c2b7176f58174e592e8488099ef75\solana-release\bin"
if (-not (Test-Path "$SOL\solana.exe")) {
  Write-Error "Solana CLI not found. Run scripts/install-solana-toolchain.ps1 as Administrator first."
}
$env:Path = "$SOL;" + $env:Path

$deployKey = Join-Path $repoRoot "deploy\devnet-keypair.json"
$programSo = Join-Path $repoRoot "target\deploy\eyes_launch_factory.so"
$programKey = Join-Path $repoRoot "target\deploy\eyes_launch_factory-keypair.json"

if (-not (Test-Path $deployKey)) { Write-Error "Missing deploy keypair: $deployKey" }
if (-not (Test-Path $programSo)) {
  Write-Host "Building program..." -ForegroundColor Yellow
  & "$SOL\cargo-build-sbf.exe" --manifest-path programs\eyes_launch_factory\Cargo.toml --sbf-out-dir target\deploy
}

$deployAddr = & solana-keygen pubkey $deployKey
$programId = & solana-keygen pubkey $programKey

solana config set --url mainnet-beta | Out-Null
solana config set --keypair $deployKey | Out-Null

Write-Host ""
Write-Host "=== Eyes Open Solana mainnet deploy ===" -ForegroundColor Cyan
Write-Host "Fund this address on SOLANA MAINNET (not devnet, not Ethereum):" -ForegroundColor Yellow
Write-Host "  $deployAddr" -ForegroundColor White
Write-Host "Program ID will be: $programId" -ForegroundColor DarkGray

$bal = solana balance $deployAddr
Write-Host "Current balance: $bal" -ForegroundColor $(if ($bal -match '^0(\.0*)? SOL$') { 'Red' } else { 'Green' })

$balNum = [double]($bal -replace ' SOL','')
if ($balNum -lt 1.4) {
  Write-Host ""
  Write-Host "Need at least ~1.5 SOL to deploy program + init factory. Send ~2 SOL for deploy + test launch." -ForegroundColor Red
  exit 1
}

Write-Host ""
Write-Host "Deploying program..." -ForegroundColor Yellow
solana program deploy $programSo --program-id $programKey

Write-Host "Initializing factory..." -ForegroundColor Yellow
Push-Location "$repoRoot\web"
$env:NEXT_PUBLIC_SOLANA_LAUNCH_PROGRAM_ID = $programId
$env:SOLANA_RPC_URL = if ($env:SOLANA_RPC_URL) { $env:SOLANA_RPC_URL } else { "https://api.mainnet-beta.solana.com" }
$env:SOLANA_DEPLOYER_KEYPAIR = $deployKey
node scripts\initialize-solana-factory.mjs
Pop-Location

$out = @{
  cluster = "mainnet-beta"
  programId = $programId
  deployWallet = $deployAddr
  deployedAt = (Get-Date).ToUniversalTime().ToString("o")
} | ConvertTo-Json
$out | Set-Content (Join-Path $repoRoot "deployments\solana-mainnet.json") -Encoding utf8

Write-Host ""
Write-Host "SUCCESS" -ForegroundColor Green
Write-Host "  Program ID: $programId"
Write-Host "  Saved: deployments\solana-mainnet.json"
Write-Host ""
Write-Host "Next: set on Vercel Production:" -ForegroundColor Yellow
Write-Host "  NEXT_PUBLIC_SOLANA_LAUNCH_PROGRAM_ID=$programId"
Write-Host "  NEXT_PUBLIC_SOLANA_CLUSTER=mainnet-beta"
Write-Host "  SOLANA_RPC_URL=<helius or similar>"
Write-Host "  NEXT_PUBLIC_SOLANA_RPC_URL=<same>"
