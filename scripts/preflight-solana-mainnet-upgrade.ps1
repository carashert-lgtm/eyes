# Abort unless every check passes — run BEFORE funding or upgrading mainnet.
$ErrorActionPreference = "Stop"
$repoRoot = Split-Path -Parent $PSScriptRoot
Set-Location $repoRoot

$EXPECTED_PROGRAM_ID = "5RpsHikcarovDnb61ChFR36Ko3PYy8sxPS3aJiTQBpQF"
$EXPECTED_DEPLOY_WALLET = "92pAWnyJniKsPkWLHYLWYoXxP9JVFhxZzJkdJDKH99Db"
$MIN_WALLET_SOL = 1.55

$SOL = Join-Path $env:USERPROFILE ".local\share\solana\install\releases\stable-e29e5d910f0c2b7176f58174e592e8488099ef75\solana-release\bin"
if (-not (Test-Path "$SOL\solana.exe")) { throw "Solana CLI missing" }
$env:Path = "$SOL;" + $env:Path

$deployKey = Join-Path $repoRoot "deploy\devnet-keypair.json"
$programKey = Join-Path $repoRoot "target\deploy\eyes_launch_factory-keypair.json"
$programSo = Join-Path $repoRoot "target\deploy\eyes_launch_factory.so"

$failures = @()

function Fail($msg) { $script:failures += $msg; Write-Host "FAIL: $msg" -ForegroundColor Red }
function Pass($msg) { Write-Host "OK:   $msg" -ForegroundColor Green }

# --- source ---
$lib = Get-Content (Join-Path $repoRoot "programs\eyes_launch_factory\src\lib.rs") -Raw
if ($lib -match 'declare_id!\("([^"]+)"\)') {
  if ($Matches[1] -eq $EXPECTED_PROGRAM_ID) { Pass "declare_id in lib.rs" } else { Fail "declare_id mismatch in lib.rs: $($Matches[1])" }
} else { Fail "declare_id not found in lib.rs" }

$idl = Get-Content (Join-Path $repoRoot "web\lib\idl\eyes_launch_factory.json") -Raw | ConvertFrom-Json
if ($idl.address -eq $EXPECTED_PROGRAM_ID) { Pass "IDL address" } else { Fail "IDL address mismatch" }

# --- files ---
foreach ($p in @($deployKey, $programKey, $programSo)) {
  if (Test-Path $p) { Pass "exists: $(Split-Path $p -Leaf)" } else { Fail "missing: $p" }
}

$deployAddr = & solana-keygen pubkey $deployKey
$programId = & solana-keygen pubkey $programKey
if ($deployAddr -eq $EXPECTED_DEPLOY_WALLET) { Pass "deploy wallet pubkey" } else { Fail "deploy wallet unexpected: $deployAddr" }
if ($programId -eq $EXPECTED_PROGRAM_ID) { Pass "program keypair pubkey" } else { Fail "program keypair unexpected: $programId" }

# --- binary embed ---
$py = @"
import pathlib, sys
ALPHABET = '123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz'
def b58decode(s):
    n = 0
    for c in s:
        n = n*58 + ALPHABET.index(c)
    pad = len(s) - len(s.lstrip('1'))
    b = n.to_bytes((n.bit_length()+7)//8, 'big') if n else b''
    return b'\x00'*pad + b
data = pathlib.Path(r'$programSo').read_bytes()
correct = b58decode('$EXPECTED_PROGRAM_ID')
wrong = b58decode('Fg6PaFpoGXkYsidMpWTK6W2BeZ7FEfcmtkgHYnY9kW8')
if correct not in data: sys.exit(2)
if wrong in data: sys.exit(3)
print(len(data))
"@
$embed = python -c $py 2>&1
if ($LASTEXITCODE -eq 0) { Pass "local .so embeds correct program id ($embed bytes)" }
elseif ($LASTEXITCODE -eq 2) { Fail "local .so missing correct program id" }
elseif ($LASTEXITCODE -eq 3) { Fail "local .so still has Anchor placeholder id" }
else { Fail "binary check failed: $embed" }

# --- on-chain ---
solana config set --url mainnet-beta | Out-Null
solana config set --keypair $deployKey | Out-Null

$balStr = solana balance $deployAddr
$balNum = [double]($balStr -replace ' SOL','')
if ($balNum -ge $MIN_WALLET_SOL) { Pass "wallet balance $balStr (>= $MIN_WALLET_SOL)" }
else { Fail "wallet balance $balStr - send SOL to $EXPECTED_DEPLOY_WALLET (need >= $MIN_WALLET_SOL)" }

$show = solana program show $EXPECTED_PROGRAM_ID 2>&1 | Out-String
if ($show -match "Authority:\s+$EXPECTED_DEPLOY_WALLET") { Pass "upgrade authority is deploy wallet" }
else { Fail "upgrade authority mismatch`n$show" }

if ($show -match "Data Length:\s+(\d+)") {
  $onChainLen = [int]$Matches[1]
  $localLen = (Get-Item $programSo).Length
  if ($onChainLen -eq $localLen) { Pass "on-chain program size matches local build: $localLen bytes" }
  else { Pass "on-chain size $onChainLen vs local $localLen - upgrade will replace" }
} else { Fail "could not read on-chain program size" }

# factory not init yet (expected pre-upgrade)
$factoryPda = "851TehsRXhkHfHn62RuDiYaRMibtuUSShqt57MCEghRa"
$factoryInfo = solana account $factoryPda 2>&1 | Out-String
if ($factoryInfo -match "Account does not exist") { Pass "factory PDA not initialized yet (expected)" }
else { Pass "factory PDA already exists - init step will skip" }

Write-Host ""
if ($failures.Count -eq 0) {
  Write-Host "ALL CHECKS PASSED - safe to upgrade + initialize when you say go." -ForegroundColor Green
  exit 0
}
Write-Host "$($failures.Count) CHECK(S) FAILED - DO NOT UPGRADE" -ForegroundColor Red
$failures | ForEach-Object { Write-Host "  - $_" }
exit 1
