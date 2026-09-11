# Revert accidental 50M test grant in local bot DB + snapshot files.
$ErrorActionPreference = "Stop"
$repoRoot = Resolve-Path (Join-Path $PSScriptRoot "..")
$botDir = Join-Path $repoRoot "ops\discord-bot"
$dbPath = Join-Path $botDir "data\platform.db"

if (Test-Path $dbPath) {
    node --input-type=module -e @"
import Database from 'better-sqlite3';
const db = new Database('$($dbPath -replace '\\','/')');
const now = new Date().toISOString();
db.prepare(\`
  UPDATE users SET
    total_allocated = 500,
    locked = 500,
    unlocked = 100,
    claimed = 0,
    updated_at = ?
  WHERE discord_id = '576940650117988352'
\`).run(now);
console.log('Fixed dannye6200 in platform.db');
"@ 
}

Copy-Item (Join-Path $repoRoot "data\platform-snapshot.json") (Join-Path $repoRoot "web\data\platform-snapshot.json") -Force
Write-Host "Snapshot reset: pool ~99.99% remaining, dannye6200 = 500 locked / 100 unlocked" -ForegroundColor Green
Write-Host "Redeploy Railway (includes platform.db) + Vercel to push live." -ForegroundColor Yellow
