# Consolidate split Preview + Production env vars into one row each.
# Safe: same locked values on both environments.
# Does NOT touch BOT_WEBHOOK_URL (different per env) or already-combined vars.

$ErrorActionPreference = "Continue"
Set-Location (Split-Path -Parent $PSScriptRoot)

$vars = @{
  "NEXT_PUBLIC_APP_ENV" = "production"
  "NEXT_PUBLIC_SITE_URL" = "https://www.eyesopen.to"
  "NEXT_PUBLIC_USE_ANVIL" = "false"
  "NEXT_PUBLIC_CHAIN_ID" = "8453"
  "NEXT_PUBLIC_CHAIN_NAME" = "Base"
  "NEXT_PUBLIC_PRESALE_RECIPIENT" = "0x3dFf4ADfA6d7482e3fFB362Aa9d6370bCC45c4b5"
  "NEXT_PUBLIC_PRESALE_START_ISO" = "2026-08-24T00:00:00.000Z"
  "NEXT_PUBLIC_PRESALE_WINDOW_DAYS" = "18"
  "NEXT_PUBLIC_PRESALE_TIER1_USD" = "0.0003"
  "NEXT_PUBLIC_PRESALE_TIER2_USD" = "0.0005"
  "NEXT_PUBLIC_PRESALE_TIER3_USD" = "0.0008"
  "NEXT_PUBLIC_PUBLIC_LAUNCH_PRICE_USD" = "0.0015"
  "NEXT_PUBLIC_FEATURE_WALLET" = "true"
  "NEXT_PUBLIC_SOCIAL_X" = "https://x.com/eyesopenlaunch"
  "NEXT_PUBLIC_SOCIAL_TELEGRAM" = "https://t.me/+WGZTDwqoswNlODMx"
}

foreach ($kv in $vars.GetEnumerator()) {
  $name = $kv.Key
  $value = $kv.Value
  Write-Host "Consolidating $name ..."
  vercel env rm $name preview -y 2>&1 | Out-Null
  vercel env rm $name production -y 2>&1 | Out-Null
  vercel env add $name "production,preview" --value $value --yes 2>&1
}

Write-Host "Done. Verifying..."
vercel env ls --json 2>$null | python scripts/analyze-vercel-env-dupes.py
