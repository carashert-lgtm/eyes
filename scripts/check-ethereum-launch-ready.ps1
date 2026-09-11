# Readiness check before Ethereum mainnet launch stack deploy.
$ErrorActionPreference = "Stop"
Set-Location $PSScriptRoot\..

. "$PSScriptRoot\Load-EyesEnv.ps1"
Import-EyesEnv -RepoRoot (Get-Location)
$webEnv = Join-Path (Get-Location) "web\.env.local"
if (Test-Path $webEnv) { Import-EyesDotEnvFile -Path $webEnv -FillMissingOnly }

function Show-Check($name, $ok, $detail) {
    $tag = if ($ok) { "PASS" } else { "WAIT" }
    $color = if ($ok) { "Green" } else { "Yellow" }
    Write-Host ("  [{0}] {1} - {2}" -f $tag, $name, $detail) -ForegroundColor $color
}

Write-Host ""
Write-Host "=== Ethereum launch deploy readiness ===" -ForegroundColor Cyan

$key = Get-EyesEnvValue "DEPLOYER_PRIVATE_KEY"
$hexOnly = if ($key -and $key.StartsWith("0x")) { $key.Substring(2) } else { $key }
$keyOk = $hexOnly -match '^[0-9a-fA-F]{64}$'
Show-Check "DEPLOYER_PRIVATE_KEY" $keyOk $(if ($keyOk) { "valid format" } elseif ($key) { "invalid" } else { "missing" })

$rpc = Get-EyesEnvValue "ETHEREUM_MAINNET_RPC_URL"
if (-not $rpc) { $rpc = "https://ethereum.publicnode.com" }
Show-Check "ETHEREUM_MAINNET_RPC_URL" $true $rpc

$eyes = Get-EyesEnvValue "EYES_TOKEN"
if (-not $eyes -and (Test-Path "deployments/ethereum-mainnet.json")) {
    $j = Get-Content "deployments/ethereum-mainnet.json" | ConvertFrom-Json
    $eyes = $j.eyesToken
}
Show-Check "EYES_TOKEN on Ethereum" ($eyes -match '^0x[0-9a-fA-F]{40}$') $(if ($eyes) { $eyes } else { "run -Step token first" })

Show-Check "Deploy script" (Test-Path "scripts\deploy-ethereum-mainnet.ps1") "deploy-ethereum-mainnet.ps1"
Show-Check "Stack already deployed?" (Test-Path "deployments\ethereum-mainnet.json") $(if (Test-Path "deployments\ethereum-mainnet.json") {
    $j = Get-Content "deployments\ethereum-mainnet.json" | ConvertFrom-Json
    if ($j.factory) { "factory $($j.factory)" } else { "token-only - run -Step stack" }
} else { "not yet" })

if ($keyOk) {
    try {
        $keyHex = if ($key.StartsWith("0x")) { $key } else { "0x$key" }
        $addr = & cast wallet address --private-key $keyHex 2>$null
        if ($addr) {
            $bal = & cast balance $addr --rpc-url $rpc 2>$null
            $eth = [double]$bal
            Show-Check "Deployer ETH on Ethereum" ($eth -ge 0.05) "$addr -> $bal ETH (need ~0.05+ for stack, ~0.01 for token)"
        }
    } catch {
        Show-Check "Deployer balance" $false "could not query"
    }
}

$scanKey = Get-EyesEnvValue "ETHERSCAN_API_KEY"
if (-not $scanKey) { $scanKey = Get-EyesEnvValue "BASESCAN_API_KEY" }
Show-Check "Etherscan API key" ([bool]$scanKey) $(if ($scanKey) { "set" } else { "optional for verify" })

Write-Host ""
Write-Host "After stack deploy:" -ForegroundColor DarkGray
Write-Host "  .\scripts\deploy-ethereum-mainnet.ps1 -Step push-vercel" -ForegroundColor DarkGray
Write-Host "  vercel deploy --prod --yes" -ForegroundColor DarkGray
Write-Host ""
