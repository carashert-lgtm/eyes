// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";

import {IUniswapV2Factory} from "../src/dex/interfaces/IUniswapV2.sol";
import {IUniswapV2Router02} from "../src/dex/interfaces/IUniswapV2.sol";

import {EyesScriptBase} from "./EyesScriptBase.sol";
import {BaseSepoliaConfig} from "./config/BaseSepoliaConfig.sol";
import {console2} from "forge-std/console2.sol";

/// @title SeedEyesLiquidity
/// @notice Seeds the platform $EYES/WETH pool on Uniswap V2 (required for buy & burn).
contract SeedEyesLiquidity is EyesScriptBase {
    function run() external {
        _enforceSupportedChain();

        address eyesToken = _resolveAddress("EYES_TOKEN", "eyesToken");
        address dexRouter = _dexRouter();
        address weth = IUniswapV2Router02(dexRouter).WETH();
        address treasury = _treasury();

        uint256 eyesAmount = _envUintOr("EYES_LP_TOKEN_AMOUNT", 1_000_000 ether);
        uint256 ethAmount = _envUintOr("EYES_LP_ETH_AMOUNT", 0.01 ether);

        _preflightBroadcast("seed-eyes-lp", ethAmount + 0.002 ether);

        if (eyesToken.code.length == 0) {
            revert PreflightFailed("EYES_TOKEN is not a contract - check .env or deployment JSON");
        }

        uint256 treasuryBalance = IERC20(eyesToken).balanceOf(treasury);
        if (treasury != msg.sender && treasuryBalance < eyesAmount) {
            revert PreflightFailed("Treasury must approve deployer or seed as treasury");
        }
        if (treasury == msg.sender && treasuryBalance < eyesAmount) {
            revert PreflightFailed("Treasury lacks EYES balance for LP seed");
        }

        _logDeploymentHeader("Eyes Open - Seed EYES/WETH LP");

        vm.startBroadcast();

        if (treasury != msg.sender) {
            IERC20(eyesToken).transferFrom(treasury, msg.sender, eyesAmount);
        }
        IERC20(eyesToken).approve(dexRouter, eyesAmount);

        (,, uint256 liquidity) = IUniswapV2Router02(dexRouter).addLiquidityETH{value: ethAmount}(
            eyesToken,
            eyesAmount,
            eyesAmount,
            ethAmount,
            msg.sender,
            block.timestamp + 30 minutes
        );

        address pair = IUniswapV2Factory(IUniswapV2Router02(dexRouter).factory()).getPair(
            eyesToken, weth
        );

        vm.stopBroadcast();

        console2.log("eyesToken", eyesToken);
        console2.log("weth", weth);
        console2.log("pair", pair);
        console2.log("liquidityMinted", liquidity);
        console2.log("eyesAdded", eyesAmount);
        console2.log("ethAdded", ethAmount);
    }
}
