# Push MAINNET presale-distributor env to Railway (eyesteam).
# Does NOT read web/.env.local (that file is Anvil/local - wrong for production bot).
param(
    [string]$TreasuryPrivateKey = "",
    [string]$BaseRpcUrl = ""
)

$ErrorActionPreference = "Stop"
$repoRoot = Resolve-Path (Join-Path $PSScriptRoot "..")
$mainnetEnv = Join-Path $repoRoot "deployments\base-mainnet.env"
$projectId = "eb46f082-82df-4f96-b5c5-3d48cecacc46"
$service = "eyesteam"
$environment = "production"

. (Join-Path $repoRoot "scripts\Load-EyesEnv.ps1")

if (-not (Test-Path $mainnetEnv)) {
    Write-Host "FAIL: Missing $mainnetEnv - run deploy-base-mainnet.ps1 first." -ForegroundColor Red
    exit 1
}

Import-EyesDotEnvFile -Path $mainnetEnv

$mainnetJson = Join-Path $repoRoot "deployments\base-mainnet.json"
$deployJson = $null
if (Test-Path $mainnetJson) {
    $deployJson = Get-Content $mainnetJson | ConvertFrom-Json
}

$token = Get-EyesEnvValue "EYES_TOKEN_ADDRESS"
if (-not $token) { $token = Get-EyesEnvValue "EYES_TOKEN" }
if (-not $token -and $deployJson) { $token = $deployJson.eyesToken }
$treasury = Get-EyesEnvValue "EYES_TREASURY"
if (-not $treasury) {
    $treasury = "0x3dFf4ADfA6d7482e3fFB362Aa9d6370bCC45c4b5"
}

# Load repo .env only (NOT web/.env.local - that file is Anvil/local).
$repoEnv = Join-Path $repoRoot ".env"
if (Test-Path $repoEnv) {
    Import-EyesDotEnvFile -Path $repoEnv -FillMissingOnly
}

if (-not $BaseRpcUrl) {
    $BaseRpcUrl = Get-EyesEnvValue "BASE_MAINNET_RPC_URL"
}
if ($BaseRpcUrl -match 'solana-mainnet') {
    Write-Host "WARN: BASE_MAINNET_RPC_URL points at Solana - using public Base RPC." -ForegroundColor Yellow
    $BaseRpcUrl = "https://mainnet.base.org"
}
if (-not $BaseRpcUrl) {
    $BaseRpcUrl = "https://mainnet.base.org"
}

if (-not $TreasuryPrivateKey) {
    Write-Host "Resolving treasury key from repo .env (never web/.env.local)..." -ForegroundColor DarkGray
    $resolveJson = & node (Join-Path $repoRoot "ops\discord-bot\src\cli\resolve-treasury-key.mjs") 2>&1 | Out-String
    if ($LASTEXITCODE -eq 0) {
        $resolved = $resolveJson | ConvertFrom-Json
        Write-Host "  matched: $($resolved.matchedKeySource) eyes=$($resolved.balanceEyes) eth=$($resolved.balanceEth)" -ForegroundColor DarkGray
        $TreasuryPrivateKey = Get-EyesEnvValue $resolved.matchedKeySource
    }
}

if (-not $TreasuryPrivateKey) {
    $TreasuryPrivateKey = Get-EyesEnvValue "PRESALE_DISTRIBUTOR_MAINNET_KEY"
}
if (-not $TreasuryPrivateKey) {
    $TreasuryPrivateKey = Get-EyesEnvValue "TREASURY_PRIVATE_KEY"
}

if (-not $token -or $token -notmatch '^0x[0-9a-fA-F]{40}$') {
    Write-Host "FAIL: EYES_TOKEN_ADDRESS missing in base-mainnet.env" -ForegroundColor Red
    exit 1
}

if (-not $TreasuryPrivateKey) {
    Write-Host ""
    Write-Host "Treasury private key required for wallet:" -ForegroundColor Yellow
    Write-Host "  $treasury" -ForegroundColor White
    Write-Host ""
    Write-Host "This is NOT the deployer wallet - export from MetaMask (Account details -> Show private key)." -ForegroundColor Yellow
    Write-Host "Then either:" -ForegroundColor Yellow
    Write-Host "  .\scripts\set-railway-bot-mainnet.ps1 -TreasuryPrivateKey 0x..." -ForegroundColor White
    Write-Host "  OR set PRESALE_DISTRIBUTOR_PRIVATE_KEY in Railway dashboard -> redeploy" -ForegroundColor White
    Write-Host ""
    Write-Host "Pushing chain/token/RPC now without the key..." -ForegroundColor Cyan
    $skipKey = $true
} else {
    $skipKey = $false
}

$sets = @{
    "PRESALE_CHAIN_ID"                 = "8453"
    "EYES_TOKEN_ADDRESS"               = $token
    "EYES_TREASURY"                    = $treasury
    "NEXT_PUBLIC_PRESALE_RECIPIENT"    = $treasury
    "BASE_MAINNET_RPC_URL"             = $BaseRpcUrl
    "PRESALE_DISTRIBUTE_BATCH"         = "5"
    "SITE_URL"                         = "https://www.eyesopen.to"
    "DB_PATH"                          = "/app/data/platform.db"
}

if (-not $skipKey) {
    $hex = if ($TreasuryPrivateKey.StartsWith("0x")) { $TreasuryPrivateKey.Substring(2) } else { $TreasuryPrivateKey }
    if ($hex -notmatch '^[0-9a-fA-F]{64}$') {
        Write-Host "FAIL: Treasury private key must be 64 hex chars" -ForegroundColor Red
        exit 1
    }
    $sets["PRESALE_DISTRIBUTOR_PRIVATE_KEY"] = $(if ($TreasuryPrivateKey.StartsWith("0x")) { $TreasuryPrivateKey } else { "0x$TreasuryPrivateKey" })
}

Write-Host ""
Write-Host "Railway MAINNET env -> eyesteam (production)" -ForegroundColor Cyan
Write-Host "Token: $token" -ForegroundColor DarkGray
Write-Host "Treasury: $treasury" -ForegroundColor DarkGray
Write-Host "Chain: 8453 (Base)" -ForegroundColor DarkGray
Write-Host ""

foreach ($key in $sets.Keys) {
    $val = $sets[$key]
    $prevEap = $ErrorActionPreference
    $ErrorActionPreference = "Continue"
    & railway variables --project $projectId --environment $environment --service $service --set "${key}=${val}" 2>&1 | Out-Host
    $ErrorActionPreference = $prevEap
    if ($LASTEXITCODE -ne 0) {
        Write-Host "FAIL on $key - run: railway login" -ForegroundColor Red
        exit 1
    }
    Write-Host "  ok $key" -ForegroundColor Green
}

Write-Host ""
Write-Host "Done. Redeploy eyesteam on Railway, then in Discord:" -ForegroundColor Green
Write-Host '  !sendstatus   (chain 8453, treasury match, EYES balance)' -ForegroundColor White
Write-Host '  !presalesend  (dry run)' -ForegroundColor White
Write-Host '  !presalesend run' -ForegroundColor White
Write-Host ""
