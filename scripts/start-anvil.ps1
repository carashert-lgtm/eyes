# Start Foundry Anvil — prefunded local chain (no faucet required)
# Keep this terminal open while testing.

$ErrorActionPreference = "Stop"

function Require-Anvil {
    $anvil = Get-Command anvil -ErrorAction SilentlyContinue
    if (-not $anvil) {
        $fallback = Join-Path $env:USERPROFILE ".foundry\bin\anvil.exe"
        if (Test-Path $fallback) {
            $env:Path = "$(Split-Path $fallback);$env:Path"
        } else {
            Write-Host "FAIL: anvil not found. Install Foundry: https://book.getfoundry.sh/getting-started/installation" -ForegroundColor Red
            exit 1
        }
    }
}

Require-Anvil

$port = if ($env:ANVIL_PORT) { $env:ANVIL_PORT } else { "8545" }
$chainId = if ($env:ANVIL_CHAIN_ID) { $env:ANVIL_CHAIN_ID } else { "31337" }

Write-Host "`n=== Eyes Open — Anvil Local Chain ===" -ForegroundColor Cyan
Write-Host "RPC:      http://127.0.0.1:$port" -ForegroundColor Green
Write-Host "Chain ID: $chainId" -ForegroundColor Green
Write-Host ""
Write-Host "Default account #0 (deployer / treasury / presale recipient):" -ForegroundColor Yellow
Write-Host "  Address:     0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266" -ForegroundColor White
Write-Host "  Private key: 0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80" -ForegroundColor White
Write-Host ""
Write-Host "Account #1 (optional presale contributor wallet):" -ForegroundColor Yellow
Write-Host "  Address:     0x70997970C51812dc3A010C7d01b50e0d17dc79C8" -ForegroundColor White
Write-Host "  Private key: 0x59c6995e998f97a5a0044966f0945389dc9e86dae88c7a8412f4603b6b786eaf" -ForegroundColor White
Write-Host ""
Write-Host "Next (new terminal): .\scripts\deploy-anvil.ps1 -Step all" -ForegroundColor Cyan
Write-Host ""

anvil --host 127.0.0.1 --port $port --chain-id $chainId --accounts 10 --balance 10000
