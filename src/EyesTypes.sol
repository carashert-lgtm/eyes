// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

/// @title EyesTypes
/// @notice Shared constants and structs for the Eyes Open ($EYES) launchpad.
library EyesTypes {
    /// @dev Platform token $EYES fixed supply: 1,000,000,000 (18 decimals).
    uint256 internal constant EYES_TOTAL_SUPPLY = 1_000_000_000 ether;

    /// @dev Default fair-launch token supply for new launches (configurable per launch).
    uint256 internal constant DEFAULT_LAUNCH_SUPPLY = 1_000_000_000 ether;

    /// @dev Basis points denominator (10_000 = 100%).
    uint256 internal constant BPS = 10_000;

    /// @dev Default trading fee: 1% of swap volume (100 / 10_000).
    uint16 internal constant DEFAULT_TOTAL_FEE_BPS = 100;

    /// @dev Default share of the trading fee paid to the launch creator (50%).
    uint16 internal constant DEFAULT_CREATOR_FEE_BPS = 5000;

    /// @dev Default share of the trading fee queued for $EYES buy & burn (50%).
    uint16 internal constant DEFAULT_BURN_FEE_BPS = 5000;

    /// @dev Default protocol share of the trading fee (0% — official model is 50/50 creator/burn).
    uint16 internal constant DEFAULT_PROTOCOL_FEE_BPS = 0;

    enum LaunchPhase {
        Pending,
        EyesWindow,
        Trading
    }

    struct LaunchConfig {
        string name;
        string symbol;
        address creator;
        uint256 tokenSupply;
        uint64 eyesWindowDuration;
        uint16 creatorFeeBps;
        uint16 burnFeeBps;
    }

    struct LaunchInfo {
        address token;
        address creator;
        address pair;
        uint64 eyesWindowStart;
        uint64 eyesWindowEnd;
        LaunchPhase phase;
        bool liquidityLocked;
    }

    struct FeeConfig {
        uint16 creatorBps;
        uint16 burnBps;
        uint16 protocolBps;
    }
}
