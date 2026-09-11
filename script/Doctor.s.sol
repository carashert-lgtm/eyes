// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {EyesScriptBase} from "./EyesScriptBase.sol";
import {BaseSepoliaConfig} from "./config/BaseSepoliaConfig.sol";
import {LocalAnvilConfig} from "./config/LocalAnvilConfig.sol";
import {console2} from "forge-std/console2.sol";

/// @title Doctor
/// @notice Local + RPC health check. No transactions. Run before first deploy.
contract Doctor is EyesScriptBase {
    function run() external view {
        _logDeploymentHeader("Eyes Open - Doctor");

        console2.log("chainId", block.chainid);
        console2.log("expectedBaseSepolia", BaseSepoliaConfig.CHAIN_ID);
        console2.log("expectedAnvil", LocalAnvilConfig.CHAIN_ID);

        if (_isLocalAnvil()) {
            console2.log("OK: Anvil local chain (no faucet required)");
        } else if (block.chainid == BaseSepoliaConfig.CHAIN_ID) {
            console2.log("OK: Base Sepolia");
        } else {
            console2.log("WARN: Unknown chain. Use Anvil or Base Sepolia RPC.");
        }

        console2.log("broadcaster", msg.sender);
        console2.log("balanceEth", msg.sender.balance / 1 ether);
        console2.log("balanceWei", msg.sender.balance);

        if (msg.sender.balance < 0.01 ether) {
            if (_isLocalAnvil()) {
                console2.log("FAIL: Anvil account should be prefunded. Restart start-anvil.ps1");
            } else {
                console2.log("FAIL: Need testnet ETH or use local Anvil (docs/LOCAL_ANVIL_TEST.md)");
            }
        } else {
            console2.log("OK: Broadcaster has ETH");
        }

        address router = _dexRouter();
        console2.log("dexRouter", router);
        if (router.code.length == 0) {
            if (_isLocalAnvil()) {
                console2.log("INFO: Run deploy-anvil.ps1 -Step dex first on Anvil");
            } else {
                console2.log("FAIL: Router has no code on this chain");
            }
        } else {
            console2.log("OK: Router bytecode found");
        }

        string memory deployPath = _deploymentPath();
        if (vm.exists(deployPath)) {
            console2.log("OK: Found", deployPath);
            console2.log("  eyesToken", _readDeployment("eyesToken"));
            console2.log("  factory", _readDeployment("factory"));
        } else {
            console2.log("INFO: No deployment file yet. Next: deploy step");
        }

        console2.log("");
        console2.log("Anvil path: .\\scripts\\start-anvil.ps1 then deploy-anvil.ps1 -Step all");
        console2.log("Required env: DEPLOYER_PRIVATE_KEY, ANVIL_RPC_URL or BASE_SEPOLIA_RPC_URL");
    }
}
