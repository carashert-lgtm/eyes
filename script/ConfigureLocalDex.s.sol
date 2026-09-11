// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {EyesScriptBase} from "./EyesScriptBase.sol";
import {console2} from "forge-std/console2.sol";

/// @title ConfigureLocalDex
/// @notice Wire mock router for $EYES buy & burn on Anvil.
contract ConfigureLocalDex is EyesScriptBase {
    function run() external {
        _requireDeploymentFile();

        address buyBurn = _resolveAddress("EYES_BUY_BURN_EXECUTOR", "buyBurnExecutor");

        _logDeploymentHeader("Eyes Open - Configure Local DEX");

        vm.startBroadcast();
        _prepareAnvilBuyBurn(buyBurn);
        vm.stopBroadcast();

        console2.log("ConfigureLocalDex complete.");
    }
}
