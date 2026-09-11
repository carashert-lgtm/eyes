# One-command local live test (Anvil must already be running in another terminal)
# Terminal 1: .\scripts\start-anvil.ps1
# Terminal 2: .\scripts\local-anvil-first-run.ps1

$ErrorActionPreference = "Stop"
& "$PSScriptRoot\deploy-anvil.ps1" -Step all
