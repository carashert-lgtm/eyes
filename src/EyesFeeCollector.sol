// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";
import {ReentrancyGuard} from "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

import {EyesTypes} from "./EyesTypes.sol";
import {IEyesToken} from "./interfaces/IEyesLaunchpad.sol";
import {IEyesFeeCollector} from "./interfaces/IEyesLaunchpad.sol";

/// @title EyesFeeCollector
/// @notice Receives trading fees from EyesFeeRouter and splits them per launch config.
///
/// Fee split (per launch, must sum to 10_000 BPS of the fee received):
/// - creatorBps  -> 50% default — paid immediately to the launch creator in ETH
/// - burnBps     -> 50% default — queued for EyesBuyBurnExecutor (swap to $EYES + burn)
/// - protocolBps -> 0% default — optional future use; kept for config flexibility
/// @dev OWNER (testnet): deployer EOA. MAINNET: transfer to multisig; restrict `setFeeRouter` behind timelock.
contract EyesFeeCollector is Ownable, ReentrancyGuard, IEyesFeeCollector {
    address public immutable eyesToken;
    address public factory;
    address public buyBurnExecutor;

    mapping(uint256 => EyesTypes.FeeConfig) public launchFeeConfig;
    mapping(address => bool) public authorizedFeeRouters;

    uint256 public accumulatedBurnProceeds;
    uint256 public totalCreatorFeesPaid;
    uint256 public totalBurnFeesQueued;
    uint256 public totalEyesBurnedViaQueue;

    error OnlyFactory();
    error OnlyFeeRouter();
    error OnlyBuyBurnExecutor();
    error ZeroAmount();
    error InvalidFeeConfig();
    error FactoryAlreadySet();
    error ExecutorAlreadySet();
    error InsufficientProceeds();

    modifier onlyFactory() {
        if (msg.sender != factory) revert OnlyFactory();
        _;
    }

    modifier onlyFeeRouter() {
        if (!authorizedFeeRouters[msg.sender]) revert OnlyFeeRouter();
        _;
    }

    modifier onlyBuyBurnExecutor() {
        if (msg.sender != buyBurnExecutor) revert OnlyBuyBurnExecutor();
        _;
    }

    constructor(address eyesToken_, address factory_) Ownable(msg.sender) {
        if (eyesToken_ == address(0)) revert InvalidFeeConfig();
        eyesToken = eyesToken_;
        if (factory_ != address(0)) {
            factory = factory_;
        }
    }

    function setFactory(address factory_) external onlyOwner {
        if (factory != address(0)) revert FactoryAlreadySet();
        if (factory_ == address(0)) revert InvalidFeeConfig();
        factory = factory_;
    }

    function setBuyBurnExecutor(address executor_) external onlyOwner {
        if (buyBurnExecutor != address(0)) revert ExecutorAlreadySet();
        if (executor_ == address(0)) revert InvalidFeeConfig();
        buyBurnExecutor = executor_;
    }

    function setFeeRouter(address router, bool allowed) external onlyOwner {
        authorizedFeeRouters[router] = allowed;
    }

    /// @inheritdoc IEyesFeeCollector
    function setLaunchFeeConfig(uint256 launchId, EyesTypes.FeeConfig calldata config)
        external
        onlyFactory
    {
        if (config.creatorBps + config.burnBps + config.protocolBps != uint16(EyesTypes.BPS)) {
            revert InvalidFeeConfig();
        }
        launchFeeConfig[launchId] = config;
    }

    /// @inheritdoc IEyesFeeCollector
    /// @dev Callable only by authorized EyesFeeRouter contracts.
    function distributeFees(uint256 launchId, address creator)
        external
        payable
        nonReentrant
        onlyFeeRouter
    {
        if (msg.value == 0) revert ZeroAmount();

        EyesTypes.FeeConfig memory config = launchFeeConfig[launchId];
        require(config.creatorBps + config.burnBps + config.protocolBps == uint16(EyesTypes.BPS), "Fees: unset");

        uint256 creatorShare = (msg.value * config.creatorBps) / EyesTypes.BPS;
        uint256 burnShare = (msg.value * config.burnBps) / EyesTypes.BPS;
        uint256 protocolShare = msg.value - creatorShare - burnShare;

        if (creatorShare > 0) {
            (bool sent,) = creator.call{value: creatorShare}("");
            require(sent, "Fees: creator transfer failed");
            totalCreatorFeesPaid += creatorShare;
        }

        if (burnShare > 0) {
            accumulatedBurnProceeds += burnShare;
            totalBurnFeesQueued += burnShare;
            emit BuyAndBurnQueued(burnShare, "Queued for EyesBuyBurnExecutor");
        }

        emit FeesReceived(launchId, msg.sender, msg.value, creatorShare, burnShare, protocolShare);
    }

    /// @notice Pull all queued burn proceeds for swapping into $EYES. Called by EyesBuyBurnExecutor.
    function pullBurnProceeds() external onlyBuyBurnExecutor returns (uint256 amount) {
        amount = accumulatedBurnProceeds;
        if (amount == 0) revert ZeroAmount();
        accumulatedBurnProceeds = 0;
        (bool sent,) = msg.sender.call{value: amount}("");
        require(sent, "Fees: pull failed");
    }

    /// @notice Record $EYES burned after executor completes a buy-and-burn cycle.
    function recordEyesBurned(uint256 amount) external onlyBuyBurnExecutor {
        totalEyesBurnedViaQueue += amount;
    }

    /// @notice Operator view: current burn queue and lifetime stats.
    function burnQueueStats()
        external
        view
        returns (
            uint256 pendingEth,
            uint256 totalQueued,
            uint256 totalCreatorPaid,
            uint256 totalEyesBurned
        )
    {
        pendingEth = accumulatedBurnProceeds;
        totalQueued = totalBurnFeesQueued;
        totalCreatorPaid = totalCreatorFeesPaid;
        totalEyesBurned = totalEyesBurnedViaQueue;
    }
}
