// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";

import {EyesToken} from "../src/EyesToken.sol";
import {EyesFeeCollector} from "../src/EyesFeeCollector.sol";
import {EyesLaunchFactory} from "../src/EyesLaunchFactory.sol";
import {EyesLiquidityLocker} from "../src/liquidity/EyesLiquidityLocker.sol";
import {EyesLiquiditySeeder} from "../src/liquidity/EyesLiquiditySeeder.sol";
import {EyesFeeRouter} from "../src/trading/EyesFeeRouter.sol";
import {EyesBuyBurnExecutor} from "../src/treasury/EyesBuyBurnExecutor.sol";
import {IUniswapV2Router02} from "../src/dex/interfaces/IUniswapV2.sol";

import {EyesScriptBase} from "./EyesScriptBase.sol";
import {BaseSepoliaConfig} from "./config/BaseSepoliaConfig.sol";
import {console2} from "forge-std/console2.sol";

/// @title DeployEyes
/// @notice Deploys the full Eyes Open stack for Base Sepolia (or any EVM chain via .env).
///
/// ## Ownership (testnet)
/// - Deployer (`msg.sender`) becomes **owner** on all Ownable contracts.
/// - This is intentional for testnet iteration.
/// - **MAINNET:** transfer ownership to a Gnosis Safe multisig + timelock before public launch.
contract DeployEyes is EyesScriptBase {
    struct Deployment {
        EyesToken eyes;
        EyesFeeCollector feeCollector;
        EyesLaunchFactory factory;
        EyesLiquidityLocker locker;
        EyesLiquiditySeeder seeder;
        EyesFeeRouter feeRouter;
        EyesBuyBurnExecutor buyBurnExecutor;
        address dexRouter;
        address weth;
    }

    function run() external returns (Deployment memory d) {
        if (block.chainid == BaseSepoliaConfig.CHAIN_ID) {
            _requireChain(BaseSepoliaConfig.CHAIN_ID);
        }

        _preflightBroadcast("deploy", 0.005 ether);

        address treasury = _treasury();
        d.dexRouter = _dexRouter();
        d.weth = IUniswapV2Router02(d.dexRouter).WETH();

        _logDeploymentHeader("Eyes Open - Deploy");

        vm.startBroadcast();

        d.eyes = new EyesToken(treasury);
        d.feeCollector = new EyesFeeCollector(address(d.eyes), address(0));
        d.factory = new EyesLaunchFactory(address(d.eyes), address(d.feeCollector));
        d.feeCollector.setFactory(address(d.factory));

        d.locker = new EyesLiquidityLocker();
        d.seeder = new EyesLiquiditySeeder(address(d.factory), address(d.locker), d.dexRouter);
        d.locker.setSeeder(address(d.seeder));
        d.factory.setLiquiditySeeder(address(d.seeder));

        d.feeRouter = new EyesFeeRouter(address(d.factory), address(d.feeCollector), d.dexRouter);
        d.factory.setFeeRouter(address(d.feeRouter));
        d.feeCollector.setFeeRouter(address(d.feeRouter), true);

        d.buyBurnExecutor =
            new EyesBuyBurnExecutor(address(d.feeCollector), address(d.eyes), d.dexRouter);
        d.feeCollector.setBuyBurnExecutor(address(d.buyBurnExecutor));

        vm.stopBroadcast();

        _writeDeploymentJson(
            address(d.eyes),
            address(d.feeCollector),
            address(d.factory),
            address(d.locker),
            address(d.seeder),
            address(d.feeRouter),
            address(d.buyBurnExecutor),
            d.dexRouter,
            d.weth
        );

        console2.log("eyesToken", address(d.eyes));
        console2.log("feeCollector", address(d.feeCollector));
        console2.log("factory", address(d.factory));
        console2.log("liquidityLocker", address(d.locker));
        console2.log("liquiditySeeder", address(d.seeder));
        console2.log("feeRouter", address(d.feeRouter));
        console2.log("buyBurnExecutor", address(d.buyBurnExecutor));
        console2.log("dexRouter", d.dexRouter);
        console2.log("weth", d.weth);
        console2.log("treasury", treasury);
        console2.log("Saved", DEPLOYMENT_PATH);
        console2.log("Env snippet", ENV_SNIPPET_PATH);
        console2.log("Merge deployments/base-sepolia.env into your .env");
    }
}
