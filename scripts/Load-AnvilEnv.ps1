# Load Anvil local-test environment variables into the current PowerShell session.
# Dot-source from deploy-anvil.ps1:  . "$PSScriptRoot\Load-AnvilEnv.ps1"

. "$PSScriptRoot\Load-EyesEnv.ps1"

function Import-AnvilEnv {
    param(
        [Parameter(Mandatory = $true)][string]$RepoRoot
    )

    $anvilEnv = Join-Path $RepoRoot ".env.anvil"
    if (Test-Path $anvilEnv) {
        Import-EyesDotEnvFile -Path $anvilEnv
    }

    # Defaults — Anvil account #0 (prefunded, no faucet needed)
    $defaults = @{
        ANVIL_RPC_URL = "http://127.0.0.1:8545"
        DEPLOYER_PRIVATE_KEY = "0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80"
        EYES_TREASURY = "0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266"
        EYES_DEPLOYMENT_PATH = "deployments/anvil.json"
        EYES_ENV_SNIPPET_PATH = "deployments/anvil.env"
        EYES_LP_TOKEN_AMOUNT = "1000000000000000000000000"
        EYES_LP_ETH_AMOUNT = "10000000000000000"
        DEMO_LAUNCH_ETH = "5000000000000000"
        DEMO_LAUNCH_TOKENS = "500000000000000000000000000"
        DEMO_SWAP_ETH = "50000000000000000"
        DEMO_EYES_WINDOW_SECONDS = "3600"
        KEEPER_MIN_PROCEEDINGS = "100000000000000"
        LOCAL_DEX_EYES_FLOAT = "10000000000000000000000000"
        LOCAL_PAIR_EYES_FLOAT = "5000000000000000000000000"
    }

    foreach ($entry in $defaults.GetEnumerator()) {
        if ($null -eq (Get-EyesEnvValue $entry.Key)) {
            Set-EyesEnvValue $entry.Key $entry.Value
        }
    }

    # Always force Anvil deployer/treasury (root .env testnet keys break local forge)
    Set-EyesEnvValue "DEPLOYER_PRIVATE_KEY" $defaults["DEPLOYER_PRIVATE_KEY"]
    Set-EyesEnvValue "EYES_TREASURY" $defaults["EYES_TREASURY"]
    Set-EyesEnvValue "EYES_DEPLOYMENT_PATH" $defaults["EYES_DEPLOYMENT_PATH"]
    Set-EyesEnvValue "EYES_ENV_SNIPPET_PATH" $defaults["EYES_ENV_SNIPPET_PATH"]
    Set-EyesEnvValue "ANVIL_RPC_URL" $defaults["ANVIL_RPC_URL"]
    Set-EyesEnvValue "DEMO_SWAP_ETH" $defaults["DEMO_SWAP_ETH"]
    Set-EyesEnvValue "DEMO_LAUNCH_ETH" $defaults["DEMO_LAUNCH_ETH"]
    Set-EyesEnvValue "DEMO_LAUNCH_TOKENS" $defaults["DEMO_LAUNCH_TOKENS"]
    Set-EyesEnvValue "DEMO_EYES_WINDOW_SECONDS" $defaults["DEMO_EYES_WINDOW_SECONDS"]

    # Optional root .env fills RPC overrides only
    $rootEnv = Join-Path $RepoRoot ".env"
    if (Test-Path $rootEnv) {
        Import-EyesDotEnvFile -Path $rootEnv -FillMissingOnly
    }

    # Generated deployment snippets (after dex / deploy steps)
    $dexEnv = Join-Path $RepoRoot "deployments\anvil-dex.env"
    if (Test-Path $dexEnv) {
        Import-EyesDotEnvFile -Path $dexEnv
    }

    $deployEnv = Join-Path $RepoRoot "deployments\anvil.env"
    if (Test-Path $deployEnv) {
        Import-EyesDotEnvFile -Path $deployEnv
    }

    # Forge scripts read BASE_SEPOLIA_RPC_URL in some tooling — mirror Anvil RPC
    if ($null -eq (Get-EyesEnvValue "BASE_SEPOLIA_RPC_URL")) {
        Set-EyesEnvValue "BASE_SEPOLIA_RPC_URL" (Get-EyesEnvValue "ANVIL_RPC_URL")
    }
}
