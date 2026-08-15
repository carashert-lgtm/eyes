// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {EyesScriptBase} from "./EyesScriptBase.sol";
import {BaseSepoliaConfig} from "./config/BaseSepoliaConfig.sol";
import {console2} from "forge-std/console2.sol";

/// @title Doctor
/// @notice Local + RPC health check. No transactions. Run before first deploy.
contract Doctor is EyesScriptBase {
    function run() external view {
        _logDeploymentHeader("Eyes Open - Doctor");

        console2.log("chainId", block.chainid);
        console2.log("expectedBaseSepolia", BaseSepoliaConfig.CHAIN_ID);
        if (block.chainid != BaseSepoliaConfig.CHAIN_ID) {
            console2.log("WARN: RPC is not Base Sepolia. Use BASE_SEPOLIA_RPC_URL.");
        }

        console2.log("broadcaster", msg.sender);
        console2.log("balanceEth", msg.sender.balance / 1 ether);
        console2.log("balanceWei", msg.sender.balance);

        if (msg.sender.balance < 0.01 ether) {
            console2.log("FAIL: Need testnet ETH. Faucet: https://www.alchemy.com/faucets/base-sepolia");
        } else {
            console2.log("OK: Broadcaster has ETH");
        }

        address router = _dexRouter();
        console2.log("dexRouter", router);
        if (router.code.length == 0) {
            console2.log("FAIL: Router has no code on this chain");
        } else {
            console2.log("OK: Router bytecode found");
        }

        if (vm.exists(DEPLOYMENT_PATH)) {
            console2.log("OK: Found", DEPLOYMENT_PATH);
            console2.log("  eyesToken", _readDeployment("eyesToken"));
            console2.log("  factory", _readDeployment("factory"));
        } else {
            console2.log("INFO: No deployment file yet. Next: -Step deploy");
        }

        console2.log("");
        console2.log("Required .env keys:");
        console2.log("  BASE_SEPOLIA_RPC_URL");
        console2.log("  DEPLOYER_PRIVATE_KEY");
        console2.log("  EYES_TREASURY (optional, defaults to deployer)");
    }
}
