// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {SafeERC20} from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import {ReentrancyGuard} from "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

import {IUniswapV2Factory} from "../dex/interfaces/IUniswapV2.sol";
import {IUniswapV2Router02} from "../dex/interfaces/IUniswapV2.sol";
import {EyesLiquidityLocker} from "./EyesLiquidityLocker.sol";
import {EyesLaunchFactory} from "../EyesLaunchFactory.sol";
import {EyesLaunchToken} from "../EyesLaunchToken.sol";
import {IEyesLaunchFactory} from "../interfaces/IEyesLaunchpad.sol";

/// @title EyesLiquiditySeeder
/// @notice Creates a Uniswap V2-style pair, seeds liquidity, and permanently locks LP tokens.
contract EyesLiquiditySeeder is ReentrancyGuard {
    using SafeERC20 for IERC20;

    struct SeedResult {
        address pair;
        uint256 lpAmount;
        uint256 tokenUsed;
        uint256 ethUsed;
    }

    error ZeroAddress();
    error OnlyFactory();
    error UnknownLaunch();
    error InsufficientEth();
    error LiquidityAlreadyLocked();

    address public immutable factory;
    address public immutable locker;
    IUniswapV2Router02 public immutable router;

    modifier onlyFactory() {
        if (msg.sender != factory) revert OnlyFactory();
        _;
    }

    constructor(address factory_, address locker_, address router_) {
        if (factory_ == address(0) || locker_ == address(0) || router_ == address(0)) {
            revert ZeroAddress();
        }
        factory = factory_;
        locker = locker_;
        router = IUniswapV2Router02(router_);
    }

    /// @notice Seed launch liquidity on a Uniswap V2 router and lock 100% of LP tokens forever.
    /// @param launchId Launch identifier from EyesLaunchFactory.
    /// @param tokenAmount Launch tokens to pair (pulled from factory).
    /// @param tokenMin Minimum launch tokens accepted by the router (slippage guard).
    /// @param ethMin Minimum ETH accepted by the router (slippage guard).
    function seedAndLockLiquidity(
        uint256 launchId,
        uint256 tokenAmount,
        uint256 tokenMin,
        uint256 ethMin
    ) external payable onlyFactory nonReentrant returns (SeedResult memory result) {
        if (msg.value == 0 || tokenAmount == 0) revert InsufficientEth();

        IEyesLaunchFactory launchFactory = IEyesLaunchFactory(factory);
        EyesLaunchToken launchToken = EyesLaunchToken(launchFactory.getLaunch(launchId).token);
        if (address(launchToken) == address(0)) revert UnknownLaunch();
        if (launchToken.liquidityLocked()) revert LiquidityAlreadyLocked();

        address launchTokenAddr = address(launchToken);
        IERC20(launchTokenAddr).safeTransferFrom(factory, address(this), tokenAmount);
        IERC20(launchTokenAddr).forceApprove(address(router), tokenAmount);

        (uint256 amountToken, uint256 amountETH, uint256 liquidity) = router.addLiquidityETH{value: msg.value}(
            launchTokenAddr,
            tokenAmount,
            tokenMin,
            ethMin,
            address(this),
            block.timestamp + 15 minutes
        );

        address pair = IUniswapV2Factory(router.factory()).getPair(router.WETH(), launchTokenAddr);
        require(pair != address(0), "Seeder: pair missing");

        IERC20(pair).forceApprove(locker, liquidity);
        EyesLiquidityLocker(locker).lockLiquidity(
            launchId, launchTokenAddr, pair, launchToken.creator(), liquidity
        );

        EyesLaunchFactory(factory).finalizeLiquiditySeed(launchId, pair, liquidity);

        result = SeedResult({
            pair: pair,
            lpAmount: liquidity,
            tokenUsed: amountToken,
            ethUsed: amountETH
        });
    }
}
