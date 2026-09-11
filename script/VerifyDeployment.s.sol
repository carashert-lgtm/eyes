// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {EyesToken} from "../src/EyesToken.sol";
import {EyesFeeCollector} from "../src/EyesFeeCollector.sol";
import {EyesLaunchFactory} from "../src/EyesLaunchFactory.sol";
import {EyesBuyBurnExecutor} from "../src/treasury/EyesBuyBurnExecutor.sol";
import {IEyesKeeper} from "../src/interfaces/IEyesKeeper.sol";

import {EyesScriptBase} from "./EyesScriptBase.sol";
import {console2} from "forge-std/console2.sol";

/// @title VerifyDeployment
/// @notice Read-only operator check - no transactions broadcast.
contract VerifyDeployment is EyesScriptBase {
    function run() external view {
        _requireDeploymentFile();
        if (_isLocalAnvil()) {
            _preflightAnvilDeployment();
        }

        address eyesToken = _readDeployment("eyesToken");
        address feeCollector = _readDeployment("feeCollector");
        address factory = _readDeployment("factory");
        address buyBurn = _readDeployment("buyBurnExecutor");

        _logDeploymentHeader("Eyes Open - Verify Deployment");

        console2.log("chainId", block.chainid);
        console2.log("eyesToken", eyesToken);
        console2.log("eyesSupply", EyesToken(eyesToken).totalSupply());
        console2.log("factory", factory);
        console2.log("launchesEnabled", EyesLaunchFactory(factory).launchesEnabled());
        console2.log(
            "launcherWhitelistEnabled", EyesLaunchFactory(factory).launcherWhitelistEnabled()
        );
        console2.log("launchCount", EyesLaunchFactory(factory).launchCount());

        (uint256 pending,, uint256 creatorPaid, uint256 eyesBurned) =
            EyesFeeCollector(payable(feeCollector)).burnQueueStats();
        console2.log("pendingBurnEth", pending);
        console2.log("totalCreatorFeesPaid", creatorPaid);
        console2.log("totalEyesBurnedViaQueue", eyesBurned);

        IEyesKeeper.BurnQueueStatus memory status =
            EyesBuyBurnExecutor(payable(buyBurn)).burnQueueStatus();
        console2.log("keeperReady", status.ready);
        console2.log("keeperMinProceedsEth", status.minProceedsEth);
        console2.log("executorTotalBurned", status.totalEyesBurned);
    }
}
