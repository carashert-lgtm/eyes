// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {EyesFeeCollector} from "../src/EyesFeeCollector.sol";
import {EyesLaunchFactory} from "../src/EyesLaunchFactory.sol";
import {EyesLiquidityLocker} from "../src/liquidity/EyesLiquidityLocker.sol";
import {EyesLiquiditySeeder} from "../src/liquidity/EyesLiquiditySeeder.sol";
import {EyesFeeRouter} from "../src/trading/EyesFeeRouter.sol";
import {EyesBuyBurnExecutor} from "../src/treasury/EyesBuyBurnExecutor.sol";
import {IUniswapV2Router02} from "../src/dex/interfaces/IUniswapV2.sol";

import {EyesScriptBase} from "./EyesScriptBase.sol";
import {BaseMainnetConfig} from "./config/BaseMainnetConfig.sol";
import {console2} from "forge-std/console2.sol";

/// @title DeployEyesStackMainnet
/// @notice Deploy launch factory + fee stack on Base mainnet using existing $EYES token.
/// @dev Does NOT deploy a new EyesToken or seed platform LP.
contract DeployEyesStackMainnet is EyesScriptBase {
    function run() external {
        _requireChain(BaseMainnetConfig.CHAIN_ID);
        _preflightBroadcast("deploy-stack-mainnet", 0.008 ether);

        address eyesToken = _resolveAddress("EYES_TOKEN", "eyesToken");
        if (eyesToken == address(0)) revert PreflightFailed("Set EYES_TOKEN or deploy token first");
        _requireContract(eyesToken, "eyesToken");

        address dexRouter = _dexRouter();
        address weth = IUniswapV2Router02(dexRouter).WETH();

        _logDeploymentHeader("Eyes Open - stack (existing $EYES)");

        vm.startBroadcast();

        EyesFeeCollector feeCollector = new EyesFeeCollector(eyesToken, address(0));
        EyesLaunchFactory factory =
            new EyesLaunchFactory(eyesToken, address(feeCollector));
        feeCollector.setFactory(address(factory));

        EyesLiquidityLocker locker = new EyesLiquidityLocker();
        EyesLiquiditySeeder seeder =
            new EyesLiquiditySeeder(address(factory), address(locker), dexRouter);
        locker.setSeeder(address(seeder));
        factory.setLiquiditySeeder(address(seeder));

        EyesFeeRouter feeRouter =
            new EyesFeeRouter(address(factory), address(feeCollector), dexRouter);
        factory.setFeeRouter(address(feeRouter));
        feeCollector.setFeeRouter(address(feeRouter), true);

        EyesBuyBurnExecutor buyBurnExecutor =
            new EyesBuyBurnExecutor(address(feeCollector), eyesToken, dexRouter);
        feeCollector.setBuyBurnExecutor(address(buyBurnExecutor));

        vm.stopBroadcast();

        _writeDeploymentJson(
            eyesToken,
            address(feeCollector),
            address(factory),
            address(locker),
            address(seeder),
            address(feeRouter),
            address(buyBurnExecutor),
            dexRouter,
            weth
        );

        console2.log("eyesToken (existing)", eyesToken);
        console2.log("feeCollector", address(feeCollector));
        console2.log("factory", address(factory));
        console2.log("liquidityLocker", address(locker));
        console2.log("liquiditySeeder", address(seeder));
        console2.log("feeRouter", address(feeRouter));
        console2.log("buyBurnExecutor", address(buyBurnExecutor));
        console2.log("dexRouter", dexRouter);
        console2.log("weth", weth);
        console2.log("Saved", _deploymentPath());
        console2.log("Do NOT seed $EYES LP until public trading launch.");
    }
}
