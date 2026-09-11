// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";

import {EyesFeeCollector} from "../src/EyesFeeCollector.sol";
import {EyesLaunchFactory} from "../src/EyesLaunchFactory.sol";
import {EyesLaunchToken} from "../src/EyesLaunchToken.sol";
import {EyesLiquidityLocker} from "../src/liquidity/EyesLiquidityLocker.sol";
import {EyesBuyBurnExecutor} from "../src/treasury/EyesBuyBurnExecutor.sol";
import {EyesTypes} from "../src/EyesTypes.sol";

import {EyesScriptBase} from "./EyesScriptBase.sol";
import {console2} from "forge-std/console2.sol";

/// @title AnvilCoinVerify
/// @notice Read-only + local simulation checks for Anvil coin-only QA (no broadcast).
contract AnvilCoinVerify is EyesScriptBase {
    address internal constant DEAD = 0x000000000000000000000000000000000000dEaD;

    function run() external view {
        _preflightAnvilDeployment();
        _logDeploymentHeader("Anvil Coin Verify");

        address factoryAddr = _readDeployment("factory");
        address feeCollectorAddr = _readDeployment("feeCollector");
        address buyBurnAddr = _readDeployment("buyBurnExecutor");
        address lockerAddr = _readDeployment("liquidityLocker");

        EyesLaunchFactory factory = EyesLaunchFactory(factoryAddr);
        EyesFeeCollector collector = EyesFeeCollector(payable(feeCollectorAddr));
        EyesBuyBurnExecutor executor = EyesBuyBurnExecutor(payable(buyBurnAddr));
        EyesLiquidityLocker locker = EyesLiquidityLocker(lockerAddr);

        uint256 launchId = factory.launchCount();
        console2.log("launchCount", launchId);

        if (launchId == 0) {
            console2.log("CHECK buyBurn", "FAIL (no launch - run e2e first)");
            console2.log("CHECK fee5050", "FAIL");
            console2.log("CHECK lpLock", "FAIL");
            console2.log("CHECK eyesWindow", "FAIL");
            return;
        }

        EyesTypes.LaunchInfo memory info = factory.getLaunch(launchId);
        EyesLaunchToken launchToken = EyesLaunchToken(info.token);

        uint256 executorBurned = executor.totalEyesBurned();
        console2.log("executorTotalBurned", executorBurned);
        console2.log("CHECK buyBurn", executorBurned > 0 ? "PASS" : "FAIL");

        (,, uint256 creatorPaid, uint256 eyesBurnedTokens) = collector.burnQueueStats();
        console2.log("totalCreatorFeesPaid", creatorPaid);
        console2.log("totalEyesBurnedViaQueue", eyesBurnedTokens);

        uint256 lockedLp = locker.lockedBalance(launchId);
        console2.log("lockedLp", lockedLp);
        console2.log("liquidityLockedFlag", info.liquidityLocked);
        console2.log(
            "CHECK lpLock",
            info.liquidityLocked && lockedLp > 0 && IERC20(info.pair).balanceOf(DEAD) == lockedLp
                ? "PASS"
                : "FAIL"
        );

        bool feeBalanced = creatorPaid > 0 && eyesBurnedTokens > 0;
        console2.log("CHECK fee5050", feeBalanced ? "PASS" : "FAIL");

        console2.log("eyesWindowPhase", uint256(info.phase));
        console2.log("pairApproved", launchToken.approvedBuySources(info.pair));
    }

    /// @dev Simulation-only Eyes Window checks (call with `forge script ... --sig "runWindowChecks()"`).
    function runWindowChecks() external {
        _preflightAnvilDeployment();

        address factoryAddr = _readDeployment("factory");
        EyesLaunchFactory factory = EyesLaunchFactory(factoryAddr);
        uint256 launchId = factory.launchCount();
        require(launchId > 0, "no launch");

        EyesTypes.LaunchInfo memory info = factory.getLaunch(launchId);
        EyesLaunchToken token = EyesLaunchToken(info.token);
        address buyer = address(0xBEEF);

        vm.prank(info.pair);
        token.transfer(buyer, 1 ether);

        vm.prank(buyer);
        vm.expectRevert(EyesLaunchToken.TransferBlockedDuringWindow.selector);
        token.transfer(address(0xCAFE), 1);

        vm.prank(buyer);
        token.transfer(info.pair, 1);

        console2.log("CHECK eyesWindowBuy", "PASS");
        console2.log("CHECK eyesWindowP2PBlock", "PASS");
        console2.log("CHECK eyesWindowDexSell", "PASS");
    }
}
