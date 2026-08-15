# Shared .env loader for Eyes Open PowerShell scripts.
# Dot-source from scripts/*.ps1:  . "$PSScriptRoot\Load-EyesEnv.ps1"

function Get-EyesEnvValue {
    param([Parameter(Mandatory = $true)][string]$Name)

    $value = [System.Environment]::GetEnvironmentVariable($Name, "Process")
    if ($null -eq $value) {
        return $null
    }

    $trimmed = $value.Trim()
    if ($trimmed.Length -eq 0) {
        return $null
    }

    return $trimmed
}

function Set-EyesEnvValue {
    param(
        [Parameter(Mandatory = $true)][string]$Name,
        [Parameter(Mandatory = $true)][string]$Value
    )

    [System.Environment]::SetEnvironmentVariable($Name, $Value, "Process")
}

function Import-EyesDotEnvFile {
    param(
        [Parameter(Mandatory = $true)][string]$Path,
        [switch]$FillMissingOnly
    )

    if (-not (Test-Path $Path)) {
        return
    }

    Get-Content -Path $Path -Encoding UTF8 | ForEach-Object {
        $line = $_.Trim()
        if ($line.Length -eq 0 -or $line.StartsWith("#")) {
            return
        }

        if ($line -notmatch '^\s*([^#=]+?)=(.*)$') {
            return
        }

        $name = $matches[1].Trim()
        $value = $matches[2].Trim()

        if (
            ($value.StartsWith('"') -and $value.EndsWith('"')) -or
            ($value.StartsWith("'") -and $value.EndsWith("'"))
        ) {
            $value = $value.Substring(1, $value.Length - 2)
        }

        if ($value.Length -eq 0) {
            return
        }

        if ($FillMissingOnly) {
            if ($null -eq (Get-EyesEnvValue $name)) {
                Set-EyesEnvValue $name $value
            }
        } else {
            Set-EyesEnvValue $name $value
        }
    }
}

function Import-EyesEnv {
    param(
        [Parameter(Mandatory = $true)][string]$RepoRoot
    )

    $envPath = Join-Path $RepoRoot ".env"
    if (-not (Test-Path $envPath)) {
        Write-Host "FAIL: Copy .env.example to .env first." -ForegroundColor Red
        Write-Host "FIX:  copy .env.example .env" -ForegroundColor Yellow
        exit 1
    }

    Import-EyesDotEnvFile -Path $envPath

    $deploymentEnvPath = Join-Path $RepoRoot "deployments\base-sepolia.env"
    Import-EyesDotEnvFile -Path $deploymentEnvPath -FillMissingOnly
}

function Test-EyesEnvVar {
    param([Parameter(Mandatory = $true)][string]$Name)

    return $null -ne (Get-EyesEnvValue $Name)
}

function Require-EyesEnvVar {
    param([Parameter(Mandatory = $true)][string]$Name)

    if (-not (Test-EyesEnvVar $Name)) {
        Write-Host "FAIL: Missing .env key: $Name" -ForegroundColor Red
        Write-Host "FIX:  Add $Name to .env (see .env.example)" -ForegroundColor Yellow
        exit 1
    }
}
