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
import {BaseSepoliaConfig} from "./config/BaseSepoliaConfig.sol";
import {console2} from "forge-std/console2.sol";

/// @title EyesE2EDemo
/// @notice Full testnet walkthrough: launch -> lock -> swap -> buy & burn.
contract EyesE2EDemo is EyesScriptBase {
    function run() external {
        if (block.chainid == BaseSepoliaConfig.CHAIN_ID) {
            _requireChain(BaseSepoliaConfig.CHAIN_ID);
        }

        address eyesToken = _resolveAddress("EYES_TOKEN", "eyesToken");
        address factoryAddr = _resolveAddress("EYES_FACTORY", "factory");
        address feeRouterAddr = _resolveAddress("EYES_FEE_ROUTER", "feeRouter");
        address buyBurnAddr = _resolveAddress("EYES_BUY_BURN_EXECUTOR", "buyBurnExecutor");
        address feeCollectorAddr = _resolveAddress("EYES_FEE_COLLECTOR", "feeCollector");

        uint256 launchEth = _envUintOr("DEMO_LAUNCH_ETH", 0.005 ether);
        uint256 launchTokens = _envUintOr("DEMO_LAUNCH_TOKENS", 500_000_000 ether);
        uint256 swapEth = _envUintOr("DEMO_SWAP_ETH", 0.001 ether);
        uint64 windowSeconds = uint64(_envUintOr("DEMO_EYES_WINDOW_SECONDS", 3600));

        _preflightBroadcast("e2e-demo", launchEth + swapEth + 0.003 ether);

        EyesLaunchFactory factory = EyesLaunchFactory(factoryAddr);
        EyesFeeRouter feeRouter = EyesFeeRouter(payable(feeRouterAddr));
        EyesBuyBurnExecutor executor = EyesBuyBurnExecutor(payable(buyBurnAddr));
        EyesFeeCollector collector = EyesFeeCollector(payable(feeCollectorAddr));
        EyesToken eyes = EyesToken(eyesToken);

        if (!factory.launchesEnabled()) {
            revert PreflightFailed("Launches disabled on factory - run: cast send $EYES_FACTORY setLaunchesEnabled(true)");
        }

        _logDeploymentHeader("Eyes Open - E2E Demo");

        vm.startBroadcast();

        (address launchTokenAddr, uint256 launchId) = factory.createLaunch(
            EyesTypes.LaunchConfig({
                name: "Eyes Test Launch",
                symbol: "ETL",
                creator: msg.sender,
                tokenSupply: EyesTypes.DEFAULT_LAUNCH_SUPPLY,
                eyesWindowDuration: windowSeconds,
                creatorFeeBps: 0,
                burnFeeBps: 0
            })
        );
        console2.log("launchId", launchId);
        console2.log("launchToken", launchTokenAddr);

        (address pair, uint256 lpLocked) = factory.seedLiquidity{value: launchEth}(
            launchId, launchTokens, 1, 1
        );
        console2.log("launchPair", pair);
        console2.log("lpLockedForever", lpLocked);

        uint256 eyesSupplyBefore = eyes.totalSupply();
        uint256 burnQueueBefore = collector.accumulatedBurnProceeds();

        feeRouter.swapExactETHForLaunchTokens{value: swapEth}(
            launchTokenAddr, 1, msg.sender, block.timestamp + 30 minutes
        );

        uint256 burnQueueAfterSwap = collector.accumulatedBurnProceeds();
        console2.log("burnQueueAfterSwap", burnQueueAfterSwap - burnQueueBefore);

        if (burnQueueAfterSwap > 0) {
            executor.executeBuyAndBurnAuto();
        }

        vm.stopBroadcast();

        EyesLaunchToken launchToken = EyesLaunchToken(launchTokenAddr);
        console2.log("launchTokenBalance", launchToken.balanceOf(msg.sender));
        console2.log("eyesSupplyAfter", eyes.totalSupply());
        console2.log("eyesBurned", eyesSupplyBefore - eyes.totalSupply());
        console2.log("totalExecutorBurns", executor.totalEyesBurned());
        console2.log("E2E demo complete.");
    }
}
