# Eyes Warden — local Discord bot + webhook server
$ErrorActionPreference = "Stop"
Set-Location $PSScriptRoot

if (-not (Test-Path "node_modules")) {
    Write-Host "Installing dependencies..."
    npm install
}

$env:RUN_LOCAL_DISCORD_BOT = "true"
Write-Host "Starting Eyes Warden (Ctrl+C to stop)..."
Write-Host "Webhook: http://localhost:3847/health"
npm start
