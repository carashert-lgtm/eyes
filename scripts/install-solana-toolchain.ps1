# Install Solana CLI + Anchor for Eyes Open Solana launch development (Windows).
# Run PowerShell AS ADMINISTRATOR (symlink step requires it). Requires Rust (rustc).

$ErrorActionPreference = "Stop"

Write-Host "=== Eyes Open — Solana toolchain install ===" -ForegroundColor Cyan

if (-not (Get-Command rustc -ErrorAction SilentlyContinue)) {
  Write-Error "Rust is required. Install from https://rustup.rs then re-run."
}

Write-Host "`n[1/3] Installing Solana CLI (Agave)..." -ForegroundColor Yellow
if (-not (Get-Command solana -ErrorAction SilentlyContinue)) {
  $solanaInstaller = Join-Path $env:TEMP "solana-install-init.exe"
  Invoke-WebRequest -Uri "https://release.anza.xyz/stable/solana-install-init-x86_64-pc-windows-msvc.exe" -OutFile $solanaInstaller
  & $solanaInstaller stable
  $solanaBin = Join-Path $env:USERPROFILE ".local\share\solana\install\active_release\bin"
  $env:Path = "$solanaBin;" + $env:Path
} else {
  Write-Host "  solana already installed: $(solana --version)"
}

Write-Host "`n[2/3] Installing Anchor (avm)..." -ForegroundColor Yellow
if (-not (Get-Command avm -ErrorAction SilentlyContinue)) {
  cargo install --git https://github.com/coral-xyz/anchor avm --locked --force
}
avm install 0.30.1
avm use 0.30.1

Write-Host "`n[3/3] Verifying..." -ForegroundColor Yellow
solana --version
anchor --version
rustc --version

Write-Host "`nNext steps:" -ForegroundColor Green
Write-Host "  1. solana-keygen new   # deployer wallet (or use existing)"
Write-Host "  2. solana config set --url devnet"
Write-Host "  3. solana airdrop 2    # devnet SOL"
Write-Host "  4. cd programs/eyes_launch_factory && anchor build"
Write-Host "  5. anchor deploy --provider.cluster devnet"
Write-Host "  6. Set NEXT_PUBLIC_SOLANA_LAUNCH_PROGRAM_ID + SOLANA_RPC_URL on Vercel"
