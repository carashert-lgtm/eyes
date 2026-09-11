// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {SafeERC20} from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import {ReentrancyGuard} from "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

/// @title EyesLiquidityLocker
/// @notice Permanently burns Uniswap V2 LP tokens for Eyes Open fair launches.
///
/// ## Permanent lock guarantee
/// - LP tokens are sent to the dead address and **never released**.
/// - There is intentionally **no** `withdraw`, `unlock`, or `transferOut` function.
/// - Liquidity remains on the DEX pair; LP receipt tokens are burned for scanner recognition.
contract EyesLiquidityLocker is ReentrancyGuard {
    using SafeERC20 for IERC20;

    /// @dev Standard burn address recognized by DEX scanners (DexScreener, FOMO, etc.).
    address internal constant DEAD = 0x000000000000000000000000000000000000dEaD;

    struct LockRecord {
        uint256 launchId;
        address launchToken;
        address pair;
        address creator;
        uint256 lpAmount;
        uint64 lockedAt;
    }

    event LiquidityPermanentlyLocked(
        uint256 indexed launchId,
        address indexed launchToken,
        address indexed pair,
        address creator,
        uint256 lpAmount
    );

    error ZeroAddress();
    error ZeroAmount();
    error OnlySeeder();
    error AlreadyLocked();

    address public seeder;

    mapping(uint256 => LockRecord) public locks;
    mapping(address => uint256) public pairLaunchId;

    modifier onlySeeder() {
        if (msg.sender != seeder) revert OnlySeeder();
        _;
    }

    error SeederAlreadySet();

    constructor() {}

    /// @notice One-time wiring after EyesLiquiditySeeder is deployed.
    function setSeeder(address seeder_) external {
        if (seeder != address(0)) revert SeederAlreadySet();
        if (seeder_ == address(0)) revert ZeroAddress();
        seeder = seeder_;
    }

    /// @notice Permanently lock LP tokens for a launch. Callable only by EyesLiquiditySeeder.
    /// @dev LP tokens sent here cannot be recovered by anyone, including the Eyes team.
    function lockLiquidity(
        uint256 launchId,
        address launchToken,
        address pair,
        address creator,
        uint256 lpAmount
    ) external nonReentrant onlySeeder {
        if (launchToken == address(0) || pair == address(0) || creator == address(0)) revert ZeroAddress();
        if (lpAmount == 0) revert ZeroAmount();
        if (locks[launchId].lpAmount != 0) revert AlreadyLocked();

        IERC20(pair).safeTransferFrom(msg.sender, DEAD, lpAmount);

        locks[launchId] = LockRecord({
            launchId: launchId,
            launchToken: launchToken,
            pair: pair,
            creator: creator,
            lpAmount: lpAmount,
            lockedAt: uint64(block.timestamp)
        });
        pairLaunchId[pair] = launchId;

        emit LiquidityPermanentlyLocked(launchId, launchToken, pair, creator, lpAmount);
    }

    /// @notice Returns the permanently locked LP amount recorded for a launch.
    function lockedBalance(uint256 launchId) external view returns (uint256) {
        return locks[launchId].lpAmount;
    }
}
