// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {ERC20} from "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";

import {EyesTypes} from "./EyesTypes.sol";
import {IEyesLaunchToken} from "./interfaces/IEyesLaunchpad.sol";

/// @title EyesLaunchToken
/// @notice ERC-20 created for each fair launch on the Eyes Open pad.
///
/// Core rules (per launch token):
/// - Supply minted once to the factory (later routed to LP + Eyes Window inventory).
/// - Eyes Window: timed gated buy period before open trading.
///   During the window, only buys from approved addresses (router/pair) and DEX sells to the pair are allowed.
///   Wallet-to-wallet transfers are blocked.
/// - After the window, token enters Trading phase (normal transfers).
/// - 100% liquidity lock is committed at the factory level (pair lock contract = future step).
contract EyesLaunchToken is ERC20, Ownable, IEyesLaunchToken {
    uint256 public immutable launchId;
    address public immutable creator;

    EyesTypes.LaunchPhase public phase;
    uint64 public eyesWindowStart;
    uint64 public eyesWindowEnd;
    bool public liquidityLocked;
    address public uniswapPair;

    /// @dev Addresses allowed to send tokens during Eyes Window (e.g. LP pair, launch vault).
    mapping(address => bool) public approvedBuySources;

    error OnlyFactory();
    error InvalidPhase();
    error EyesWindowClosed();
    error TransferBlockedDuringWindow();

    modifier onlyFactory() {
        if (msg.sender != owner()) revert OnlyFactory();
        _;
    }

    constructor(
        uint256 launchId_,
        string memory name_,
        string memory symbol_,
        uint256 supply,
        address creator_,
        address factoryOwner
    ) ERC20(name_, symbol_) Ownable(factoryOwner) {
        require(creator_ != address(0), "LaunchToken: zero creator");
        launchId = launchId_;
        creator = creator_;
        phase = EyesTypes.LaunchPhase.Pending;
        _mint(factoryOwner, supply);
    }

    /// @inheritdoc IEyesLaunchToken
    function openEyesWindow() external onlyFactory {
        if (phase != EyesTypes.LaunchPhase.Pending) revert InvalidPhase();
        phase = EyesTypes.LaunchPhase.EyesWindow;
    }

    /// @inheritdoc IEyesLaunchToken
    function endEyesWindow() external onlyFactory {
        if (phase != EyesTypes.LaunchPhase.EyesWindow) revert InvalidPhase();
        phase = EyesTypes.LaunchPhase.Trading;
    }

    /// @notice Register the Uniswap pair so DEX sells are allowed during the Eyes Window.
    function setUniswapPair(address pair) external onlyFactory {
        uniswapPair = pair;
    }

    /// @inheritdoc IEyesLaunchToken
    function markLiquidityLocked() external onlyFactory {
        liquidityLocked = true;
    }

    /// @notice Register an address allowed to distribute tokens during the Eyes Window.
    function setApprovedBuySource(address source, bool allowed) external onlyFactory {
        approvedBuySources[source] = allowed;
    }

    /// @notice Configure the Eyes Window schedule. Callable once before opening.
    function configureEyesWindow(uint64 start, uint64 end) external onlyFactory {
        require(end > start, "LaunchToken: invalid window");
        eyesWindowStart = start;
        eyesWindowEnd = end;
    }

    /// @dev Enforces gated buy period. Wallet-to-wallet transfers are blocked; DEX buys/sells are allowed.
    function _update(address from, address to, uint256 value) internal override {
        if (phase == EyesTypes.LaunchPhase.EyesWindow && block.timestamp > eyesWindowEnd) {
            phase = EyesTypes.LaunchPhase.Trading;
        }
        if (phase == EyesTypes.LaunchPhase.EyesWindow) {
            _enforceEyesWindowTransfer(from, to);
        }
        super._update(from, to, value);
    }

    function _enforceEyesWindowTransfer(address from, address to) internal view {
        if (block.timestamp < eyesWindowStart) {
            revert EyesWindowClosed();
        }

        // Mint / burn paths are always allowed.
        if (from == address(0) || to == address(0)) return;

        // Factory inventory moves (LP seeding, operational setup).
        if (from == owner()) return;

        // Buys during the Eyes Window: approved pair/router/vault -> buyer wallet.
        if (approvedBuySources[from]) return;

        // DEX sells during the Eyes Window: wallet -> Uniswap pair.
        if (uniswapPair != address(0) && to == uniswapPair) return;

        // Block wallet-to-wallet and other off-pad transfers.
        revert TransferBlockedDuringWindow();
    }
}
