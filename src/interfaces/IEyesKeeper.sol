// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

/// @title IEyesKeeper
/// @notice Read-only and keeper entrypoints for buy & burn operations.
interface IEyesKeeper {
    struct BurnQueueStatus {
        uint256 pendingEth;
        uint256 minProceedsEth;
        bool ready;
        uint256 totalEyesBurned;
        uint256 eyesSupply;
    }

    function burnQueueStatus() external view returns (BurnQueueStatus memory status);

    /// @notice Execute buy & burn when pending proceeds meet the minimum threshold.
    function executeBuyAndBurnIfReady(uint256 minEyesOut) external returns (uint256 eyesBurned);

    /// @notice Execute buy & burn using `maxSlippageBps` to derive `minEyesOut` from the DEX quote.
    function executeBuyAndBurnAuto() external returns (uint256 eyesBurned);
}
