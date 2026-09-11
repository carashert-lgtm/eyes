// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {EyesTypes} from "../EyesTypes.sol";

interface IEyesToken {
    function burn(uint256 amount) external;
    function burnFrom(address account, uint256 amount) external;
}

interface IEyesLaunchToken {
    function launchId() external view returns (uint256);
    function creator() external view returns (address);
    function phase() external view returns (EyesTypes.LaunchPhase);
    function eyesWindowStart() external view returns (uint64);
    function eyesWindowEnd() external view returns (uint64);
    function liquidityLocked() external view returns (bool);

    function openEyesWindow() external;
    function endEyesWindow() external;
    function markLiquidityLocked() external;
    function setUniswapPair(address pair) external;
    function uniswapPair() external view returns (address);
}

interface IEyesLaunchFactory {
    event LaunchCreated(
        uint256 indexed launchId,
        address indexed token,
        address indexed creator,
        uint64 eyesWindowStart,
        uint64 eyesWindowEnd
    );

    event LiquidityLockCommitted(
        uint256 indexed launchId, address indexed token, address pair, uint256 lpAmount
    );

    function eyesToken() external view returns (address);
    function feeCollector() external view returns (address);
    function launchCount() external view returns (uint256);
    function getLaunch(uint256 launchId) external view returns (EyesTypes.LaunchInfo memory);

    function createLaunch(EyesTypes.LaunchConfig calldata config)
        external
        returns (address token, uint256 launchId);
}

interface IEyesFeeCollector {
    event FeesReceived(
        uint256 indexed launchId,
        address indexed payer,
        uint256 amount,
        uint256 creatorShare,
        uint256 burnShare,
        uint256 protocolShare
    );

    event BuyAndBurnQueued(uint256 amount, string note);

    function eyesToken() external view returns (address);
    function factory() external view returns (address);

    function setLaunchFeeConfig(uint256 launchId, EyesTypes.FeeConfig calldata config) external;

    function distributeFees(uint256 launchId, address creator) external payable;

    function pullBurnProceeds() external returns (uint256 amount);

    function recordEyesBurned(uint256 amount) external;
}
