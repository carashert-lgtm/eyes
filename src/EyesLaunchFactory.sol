// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";
import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {SafeERC20} from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";

import {EyesTypes} from "./EyesTypes.sol";
import {EyesLaunchToken} from "./EyesLaunchToken.sol";
import {EyesLiquiditySeeder} from "./liquidity/EyesLiquiditySeeder.sol";
import {IEyesLaunchFactory} from "./interfaces/IEyesLaunchpad.sol";
import {IEyesFeeCollector} from "./interfaces/IEyesLaunchpad.sol";

/// @title EyesLaunchFactory
/// @notice Creates fair launches, seeds Uniswap V2 liquidity, and coordinates fee routing.
/// @dev OWNER (testnet): deployer EOA. MAINNET: transfer to Gnosis Safe multisig + timelock before launch.
contract EyesLaunchFactory is Ownable, IEyesLaunchFactory {
    using SafeERC20 for IERC20;

    address public immutable eyesToken;
    address public immutable feeCollector;

    address public liquiditySeeder;
    address public feeRouter;

    uint256 public launchCount;
    mapping(uint256 => EyesTypes.LaunchInfo) private _launches;

    error ZeroAddress();
    error InvalidFeeSplit();
    error InvalidWindow();
    error OnlySeeder();
    error UnknownLaunch();
    error SeederAlreadySet();
    error LiquidityAlreadyLocked();
    error LaunchesDisabled();
    error LauncherNotApproved();
    error EyesWindowClosed();
    error InvalidPhase();

    /// @dev Dead address for supply/LP disposal — recognized by DEX scanners and FOMO.
    address internal constant DEAD = 0x000000000000000000000000000000000000dEaD;

    /// @notice Global kill-switch for new launches. OWNER only.
    bool public launchesEnabled = true;
    /// @notice When true, only approved launchers (or owner) may call `createLaunch`.
    bool public launcherWhitelistEnabled = false;
    mapping(address => bool) public approvedLaunchers;

    event LaunchesEnabledUpdated(bool enabled);
    event LauncherWhitelistEnabledUpdated(bool enabled);
    event LauncherApprovalUpdated(address indexed launcher, bool approved);

    event LiquiditySeeded(
        uint256 indexed launchId,
        address indexed pair,
        uint256 lpAmount,
        uint256 tokenUsed,
        uint256 ethUsed
    );

    constructor(address eyesToken_, address feeCollector_) Ownable(msg.sender) {
        if (eyesToken_ == address(0) || feeCollector_ == address(0)) revert ZeroAddress();
        eyesToken = eyesToken_;
        feeCollector = feeCollector_;
    }

    function setLiquiditySeeder(address seeder_) external onlyOwner {
        if (liquiditySeeder != address(0)) revert SeederAlreadySet();
        if (seeder_ == address(0)) revert ZeroAddress();
        liquiditySeeder = seeder_;
    }

    function setFeeRouter(address feeRouter_) external onlyOwner {
        feeRouter = feeRouter_;
    }

    /// @notice Enable or disable all new fair launches (existing launches unaffected).
    function setLaunchesEnabled(bool enabled) external onlyOwner {
        launchesEnabled = enabled;
        emit LaunchesEnabledUpdated(enabled);
    }

    /// @notice Toggle launcher whitelist enforcement for `createLaunch`.
    function setLauncherWhitelistEnabled(bool enabled) external onlyOwner {
        launcherWhitelistEnabled = enabled;
        emit LauncherWhitelistEnabledUpdated(enabled);
    }

    /// @notice Approve or revoke an address allowed to create launches when whitelist is on.
    function setLauncherApproved(address launcher, bool approved) external onlyOwner {
        if (launcher == address(0)) revert ZeroAddress();
        approvedLaunchers[launcher] = approved;
        emit LauncherApprovalUpdated(launcher, approved);
    }

    /// @notice Batch approve launchers (operator helper).
    function setLaunchersApproved(address[] calldata launchers, bool approved) external onlyOwner {
        for (uint256 i = 0; i < launchers.length; i++) {
            if (launchers[i] == address(0)) revert ZeroAddress();
            approvedLaunchers[launchers[i]] = approved;
            emit LauncherApprovalUpdated(launchers[i], approved);
        }
    }

    /// @inheritdoc IEyesLaunchFactory
    function getLaunch(uint256 launchId) external view returns (EyesTypes.LaunchInfo memory) {
        return _launches[launchId];
    }

    /// @inheritdoc IEyesLaunchFactory
    function createLaunch(EyesTypes.LaunchConfig calldata config)
        external
        returns (address token, uint256 launchId)
    {
        if (!launchesEnabled) revert LaunchesDisabled();
        if (launcherWhitelistEnabled && !approvedLaunchers[msg.sender] && msg.sender != owner()) {
            revert LauncherNotApproved();
        }
        if (config.creator == address(0)) revert ZeroAddress();
        if (config.eyesWindowDuration == 0) revert InvalidWindow();

        uint16 creatorFeeBps = config.creatorFeeBps == 0
            ? EyesTypes.DEFAULT_CREATOR_FEE_BPS
            : config.creatorFeeBps;
        uint16 burnFeeBps = config.burnFeeBps == 0
            ? EyesTypes.DEFAULT_BURN_FEE_BPS
            : config.burnFeeBps;

        if (creatorFeeBps + burnFeeBps > EyesTypes.BPS) revert InvalidFeeSplit();

        launchId = ++launchCount;
        uint256 supply = config.tokenSupply == 0 ? EyesTypes.DEFAULT_LAUNCH_SUPPLY : config.tokenSupply;

        EyesLaunchToken launchToken = new EyesLaunchToken(
            launchId,
            config.name,
            config.symbol,
            supply,
            config.creator,
            address(this)
        );
        token = address(launchToken);

        uint64 start = uint64(block.timestamp);
        uint64 end = start + config.eyesWindowDuration;
        launchToken.configureEyesWindow(start, end);
        launchToken.openEyesWindow();

        _launches[launchId] = EyesTypes.LaunchInfo({
            token: token,
            creator: config.creator,
            pair: address(0),
            eyesWindowStart: start,
            eyesWindowEnd: end,
            phase: EyesTypes.LaunchPhase.EyesWindow,
            liquidityLocked: false
        });

        IEyesFeeCollector(feeCollector).setLaunchFeeConfig(
            launchId,
            EyesTypes.FeeConfig({
                creatorBps: creatorFeeBps,
                burnBps: burnFeeBps,
                protocolBps: uint16(EyesTypes.BPS - creatorFeeBps - burnFeeBps)
            })
        );

        emit LaunchCreated(launchId, token, config.creator, start, end);
    }

    /// @notice Seed Uniswap V2 liquidity and permanently lock 100% of LP tokens.
    function seedLiquidity(
        uint256 launchId,
        uint256 tokenAmount,
        uint256 tokenMin,
        uint256 ethMin
    ) external payable returns (address pair, uint256 lpAmount) {
        EyesTypes.LaunchInfo memory info = _launches[launchId];
        if (info.token == address(0)) revert UnknownLaunch();
        if (info.liquidityLocked) revert LiquidityAlreadyLocked();
        if (liquiditySeeder == address(0)) revert ZeroAddress();
        require(msg.sender == info.creator || msg.sender == owner(), "Factory: not authorized");

        EyesLaunchToken launchToken = EyesLaunchToken(info.token);
        launchToken.setApprovedBuySource(liquiditySeeder, true);

        IERC20(info.token).forceApprove(liquiditySeeder, tokenAmount);

        EyesLiquiditySeeder.SeedResult memory result = EyesLiquiditySeeder(liquiditySeeder)
            .seedAndLockLiquidity{value: msg.value}(launchId, tokenAmount, tokenMin, ethMin);

        emit LiquiditySeeded(
            launchId, result.pair, result.lpAmount, result.tokenUsed, result.ethUsed
        );

        return (result.pair, result.lpAmount);
    }

    /// @notice Called by EyesLiquiditySeeder after LP is permanently locked.
    function finalizeLiquiditySeed(uint256 launchId, address pair, uint256 lpAmount)
        external
    {
        if (msg.sender != liquiditySeeder) revert OnlySeeder();

        EyesTypes.LaunchInfo storage info = _launches[launchId];
        if (info.token == address(0)) revert UnknownLaunch();

        EyesLaunchToken launchToken = EyesLaunchToken(info.token);
        launchToken.setUniswapPair(pair);
        launchToken.markLiquidityLocked();
        launchToken.setApprovedBuySource(pair, true);
        if (feeRouter != address(0)) {
            launchToken.setApprovedBuySource(feeRouter, true);
        }

        info.pair = pair;
        info.liquidityLocked = true;

        // Burn unsold factory inventory so scanners do not flag insider concentration.
        uint256 remainder = launchToken.balanceOf(address(this));
        if (remainder > 0) {
            launchToken.transfer(DEAD, remainder);
        }

        emit LiquidityLockCommitted(launchId, info.token, pair, lpAmount);

        if (feeRouter != address(0)) {
            (bool ok,) = feeRouter.call(
                abi.encodeWithSignature("registerLaunchToken(uint256,address)", launchId, info.token)
            );
            require(ok, "Factory: fee router register failed");
        }
    }

    function closeEyesWindow(uint256 launchId) external onlyOwner {
        EyesTypes.LaunchInfo storage info = _launches[launchId];
        if (info.token == address(0)) revert UnknownLaunch();
        if (info.phase != EyesTypes.LaunchPhase.EyesWindow) revert InvalidPhase();

        EyesLaunchToken(info.token).endEyesWindow();
        info.phase = EyesTypes.LaunchPhase.Trading;
    }

    /// @notice Sync launch phase after the Eyes Window ends. Callable by anyone.
    function closeEyesWindowIfExpired(uint256 launchId) external {
        EyesTypes.LaunchInfo storage info = _launches[launchId];
        if (info.token == address(0)) revert UnknownLaunch();
        if (info.phase != EyesTypes.LaunchPhase.EyesWindow) return;
        if (block.timestamp <= info.eyesWindowEnd) revert EyesWindowClosed();

        EyesLaunchToken(info.token).endEyesWindow();
        info.phase = EyesTypes.LaunchPhase.Trading;
    }

    function setApprovedBuySource(uint256 launchId, address source, bool allowed) external onlyOwner {
        EyesTypes.LaunchInfo storage info = _launches[launchId];
        if (info.token == address(0)) revert UnknownLaunch();
        EyesLaunchToken(info.token).setApprovedBuySource(source, allowed);
    }
}
