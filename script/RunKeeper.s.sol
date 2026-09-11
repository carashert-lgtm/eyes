// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {EyesBuyBurnExecutor} from "../src/treasury/EyesBuyBurnExecutor.sol";
import {EyesFeeCollector} from "../src/EyesFeeCollector.sol";
import {IEyesKeeper} from "../src/interfaces/IEyesKeeper.sol";

import {EyesScriptBase} from "./EyesScriptBase.sol";
import {BaseSepoliaConfig} from "./config/BaseSepoliaConfig.sol";
import {console2} from "forge-std/console2.sol";

/// @title RunKeeper
/// @notice Manual or bot-friendly keeper script for buy & burn execution.
/// @dev Safe to run on a cron/loop. Skips gracefully when queue is below threshold.
contract RunKeeper is EyesScriptBase {
    function run() external {
        _enforceSupportedChain();

        address executorAddr = _resolveAddress("EYES_BUY_BURN_EXECUTOR", "buyBurnExecutor");
        address collectorAddr = _resolveAddress("EYES_FEE_COLLECTOR", "feeCollector");

        EyesBuyBurnExecutor executor = EyesBuyBurnExecutor(payable(executorAddr));
        EyesFeeCollector collector = EyesFeeCollector(payable(collectorAddr));

        IEyesKeeper.BurnQueueStatus memory status = executor.burnQueueStatus();

        _logDeploymentHeader("Eyes Open - Keeper");
        console2.log("pendingBurnEth", status.pendingEth);
        console2.log("minProceedsEth", status.minProceedsEth);
        console2.log("ready", status.ready);
        console2.log("eyesSupply", status.eyesSupply);
        console2.log("totalEyesBurned", status.totalEyesBurned);

        if (!status.ready) {
            console2.log("SKIP: burn queue below threshold");
            console2.log("FIX: Run swaps via EyesFeeRouter, or lower minProceedsEth on executor");
            console2.log("CHECK: cast call $EYES_FEE_COLLECTOR accumulatedBurnProceeds()");
            return;
        }

        vm.startBroadcast();
        uint256 burned = executor.executeBuyAndBurnAuto();
        vm.stopBroadcast();

        console2.log("eyesBurnedThisRun", burned);
        console2.log("pendingAfter", collector.accumulatedBurnProceeds());
    }
}
