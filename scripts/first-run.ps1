# Eyes Open - First Run (Windows)

$ErrorActionPreference = "Stop"

$scriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
Set-Location (Join-Path $scriptDir "..")

. "$scriptDir\Load-EyesEnv.ps1"
Import-EyesEnv -RepoRoot (Get-Location)

Write-Host "`n=== Eyes Open First Run ===" -ForegroundColor Cyan
Write-Host "See docs/WINDOWS_SETUP.md for details.`n"

& "$scriptDir\deploy-base-sepolia.ps1" -Step doctor
if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }

& "$scriptDir\deploy-base-sepolia.ps1" -Step build
if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }

& "$scriptDir\deploy-base-sepolia.ps1" -Step deploy
if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }

Import-EyesEnv -RepoRoot (Get-Location)

& "$scriptDir\deploy-base-sepolia.ps1" -Step seed
if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }

& "$scriptDir\deploy-base-sepolia.ps1" -Step e2e
if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }

& "$scriptDir\deploy-base-sepolia.ps1" -Step verify
if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }

Write-Host "`n=== First run complete ===" -ForegroundColor Green
Write-Host "Next: run keeper periodically with -Step keeper"
