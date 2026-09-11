// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {EyesToken} from "../src/EyesToken.sol";
import {EyesFeeCollector} from "../src/EyesFeeCollector.sol";
import {EyesLaunchFactory} from "../src/EyesLaunchFactory.sol";
import {EyesLaunchToken} from "../src/EyesLaunchToken.sol";
import {EyesFeeRouter} from "../src/trading/EyesFeeRouter.sol";
import {EyesBuyBurnExecutor} from "../src/treasury/EyesBuyBurnExecutor.sol";
import {EyesTypes} from "../src/EyesTypes.sol";

import {EyesScriptBase} from "./EyesScriptBase.sol";
import {console2} from "forge-std/console2.sol";

/// @title EyesE2EDemo
/// @notice Full testnet walkthrough: launch -> lock -> swap -> buy & burn.
contract EyesE2EDemo is EyesScriptBase {
    function run() external {
        _enforceSupportedChain();

        uint256 launchEth = _envUintOr("DEMO_LAUNCH_ETH", 0.005 ether);
        uint256 swapEth = _envUintOr("DEMO_SWAP_ETH", 0.001 ether);
        uint256 minBal = launchEth + swapEth + 0.003 ether;
        if (_isLocalAnvil()) {
            minBal += _envUintOr("EYES_LP_ETH_AMOUNT", 0.01 ether);
        }
        _preflightBroadcast("e2e-demo", minBal);

        address factoryAddr = _resolveAddress("EYES_FACTORY", "factory");
        if (!EyesLaunchFactory(factoryAddr).launchesEnabled()) {
            revert PreflightFailed("Launches disabled on factory - run: cast send $EYES_FACTORY setLaunchesEnabled(true)");
        }

        _logDeploymentHeader("Eyes Open - E2E Demo");

        vm.startBroadcast();
        (address launchToken, uint256 eyesSupplyBefore, uint256 burnQueued) = _demoLaunchAndSwap(launchEth, swapEth);
        if (burnQueued > 0) {
            _demoBuyBurn(eyesSupplyBefore);
        }
        vm.stopBroadcast();

        address eyesToken = _resolveAddress("EYES_TOKEN", "eyesToken");
        address buyBurnAddr = _resolveAddress("EYES_BUY_BURN_EXECUTOR", "buyBurnExecutor");
        EyesToken eyes = EyesToken(eyesToken);
        EyesBuyBurnExecutor executor = EyesBuyBurnExecutor(payable(buyBurnAddr));

        console2.log("launchTokenBalance", EyesLaunchToken(launchToken).balanceOf(msg.sender));
        console2.log("eyesSupplyAfter", eyes.totalSupply());
        console2.log("eyesBurned", eyesSupplyBefore - eyes.totalSupply());
        console2.log("totalExecutorBurns", executor.totalEyesBurned());
        console2.log("E2E demo complete.");
    }

    function _demoLaunchAndSwap(uint256 launchEth, uint256 swapEth)
        internal
        returns (address launchToken, uint256 eyesSupplyBefore, uint256 burnQueued)
    {
        address eyesToken = _resolveAddress("EYES_TOKEN", "eyesToken");
        address feeCollectorAddr = _resolveAddress("EYES_FEE_COLLECTOR", "feeCollector");
        EyesFeeCollector collector = EyesFeeCollector(payable(feeCollectorAddr));

        eyesSupplyBefore = EyesToken(eyesToken).totalSupply();
        uint256 burnQueueBefore = collector.accumulatedBurnProceeds();

        uint256 launchId;
        (launchToken, launchId) = _createDemoLaunch();
        _seedDemoLaunch(launchEth, launchId);
        _swapDemoLaunch(swapEth, launchToken);

        burnQueued = collector.accumulatedBurnProceeds() - burnQueueBefore;
        console2.log("burnQueueAfterSwap", burnQueued);
    }

    function _createDemoLaunch() internal returns (address launchToken, uint256 launchId) {
        EyesLaunchFactory factory = EyesLaunchFactory(_resolveAddress("EYES_FACTORY", "factory"));
        (launchToken, launchId) = factory.createLaunch(
            EyesTypes.LaunchConfig({
                name: "Eyes Test Launch",
                symbol: "ETL",
                creator: msg.sender,
                tokenSupply: EyesTypes.DEFAULT_LAUNCH_SUPPLY,
                eyesWindowDuration: uint64(_envUintOr("DEMO_EYES_WINDOW_SECONDS", 3600)),
                creatorFeeBps: 0,
                burnFeeBps: 0
            })
        );
        console2.log("launchId", launchId);
        console2.log("launchToken", launchToken);
    }

    function _seedDemoLaunch(uint256 launchEth, uint256 launchId) internal {
        EyesLaunchFactory factory = EyesLaunchFactory(_resolveAddress("EYES_FACTORY", "factory"));
        uint256 launchTokens = _envUintOr("DEMO_LAUNCH_TOKENS", 500_000_000 ether);
        (address pair, uint256 lpLocked) =
            factory.seedLiquidity{value: launchEth}(launchId, launchTokens, 1, 1);
        console2.log("launchPair", pair);
        console2.log("lpLockedForever", lpLocked);
    }

    function _swapDemoLaunch(uint256 swapEth, address launchToken) internal {
        EyesFeeRouter feeRouter = EyesFeeRouter(payable(_resolveAddress("EYES_FEE_ROUTER", "feeRouter")));
        feeRouter.swapExactETHForLaunchTokens{value: swapEth}(
            launchToken, 1, msg.sender, block.timestamp + 30 minutes
        );
    }

    function _demoBuyBurn(uint256) internal {
        address buyBurnAddr = _resolveAddress("EYES_BUY_BURN_EXECUTOR", "buyBurnExecutor");
        _prepareAnvilBuyBurn(buyBurnAddr);
        EyesBuyBurnExecutor(payable(buyBurnAddr)).executeBuyAndBurnAuto();
    }
}
