# On-chain presale payment audit for a tx hash or wallet.
param(
    [string]$TxHash,
    [string]$Wallet,
    [string]$Treasury = "0x3dFf4ADfA6d7482e3fFB362Aa9d6370bCC45c4b5",
    [string]$Rpc = "https://mainnet.base.org"
)

$ErrorActionPreference = "Stop"

function Write-Row($label, $value, $ok) {
    $tag = if ($null -eq $ok) { "INFO" } elseif ($ok) { "OK" } else { "FAIL" }
    $color = switch ($tag) { "OK" { "Green" } "FAIL" { "Red" } default { "DarkGray" } }
    Write-Host ("[{0}] {1}: {2}" -f $tag, $label, $value) -ForegroundColor $color
}

Write-Host ""
Write-Host "=== Presale payment investigation (Base) ===" -ForegroundColor Cyan
Write-Host "Treasury: $Treasury"
Write-Host ""

if ($TxHash) {
    if ($TxHash -notmatch '^0x[0-9a-fA-F]{64}$') {
        Write-Host "Invalid tx hash" -ForegroundColor Red
        exit 1
    }

    $tx = cast tx $TxHash --rpc-url $Rpc -j | ConvertFrom-Json
    $receipt = cast receipt $TxHash --rpc-url $Rpc -j | ConvertFrom-Json

    Write-Row "Tx status" $receipt.status ($receipt.status -eq "0x1")
    Write-Row "From" $tx.from $null
    Write-Row "To" $tx.to $null
    Write-Row "Value (wei)" $tx.value $null

    $toTreasury = ($tx.to -and $tx.to.ToLower() -eq $Treasury.ToLower())
    Write-Row "Direct ETH to treasury" $(if ($toTreasury) { "yes" } else { "no" }) $toTreasury

    if (-not $toTreasury) {
        Write-Host ""
        Write-Host "Checking internal transfers (Blockscout)..." -ForegroundColor Yellow
        try {
            $uri = "https://base.blockscout.com/api/v2/transactions/$TxHash/internal-transactions"
            $internals = Invoke-RestMethod $uri -TimeoutSec 20
            $hits = @()
            foreach ($it in ($internals.items | ForEach-Object { $_ })) {
                $from = $it.from.hash
                $to = $it.to.hash
                if ($to.ToLower() -eq $Treasury.ToLower()) {
                    $hits += "$from -> treasury value=$($it.value)"
                }
            }
            if ($hits.Count -gt 0) {
                Write-Row "Internal to treasury" ($hits -join "; ") $true
            } else {
                Write-Row "Internal to treasury" "none found" $false
            }
        } catch {
            Write-Row "Internal lookup" $_.Exception.Message $false
        }
    }

    Write-Host ""
    Write-Host "Bot lookup (if BOT_WEBHOOK_URL + secret configured locally):" -ForegroundColor DarkGray
    Write-Host "  POST /webhook/presale/lookup { txHash: '$TxHash' }"
}

if ($Wallet) {
    Write-Host ""
    Write-Host "Wallet outgoing to treasury:" -ForegroundColor Yellow
    try {
        $uri = "https://base.blockscout.com/api/v2/addresses/$Wallet/transactions"
        $data = Invoke-RestMethod $uri -TimeoutSec 20
        $out = @()
        foreach ($tx in ($data.items | Select-Object -First 50)) {
            $from = $tx.from.hash
            $to = $tx.to.hash
            if ($from.ToLower() -eq $Wallet.ToLower() -and $to.ToLower() -eq $Treasury.ToLower()) {
                $out += "$($tx.hash) value=$($tx.value)"
            }
        }
        if ($out.Count -gt 0) {
            foreach ($line in $out) { Write-Row "Payment" $line $true }
        } else {
            Write-Row "Payments to treasury" "none in recent txs" $false
        }
    } catch {
        Write-Row "Wallet scan" $_.Exception.Message $false
    }
}

$bal = cast balance $Treasury --rpc-url $Rpc
Write-Host ""
Write-Row "Treasury ETH balance now" $bal $null
Write-Host ""
