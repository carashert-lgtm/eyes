// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {IUniswapV2Router02} from "../dex/interfaces/IUniswapV2.sol";
import {IEyesToken} from "../interfaces/IEyesLaunchpad.sol";
import {IEyesKeeper} from "../interfaces/IEyesKeeper.sol";
import {EyesFeeCollector} from "../EyesFeeCollector.sol";

/// @title EyesBuyBurnExecutor
/// @notice Swaps queued launch trading fees into $EYES and burns them.
/// @dev OWNER (testnet): deployer EOA. MAINNET: transfer to multisig or automated keeper with caps.
contract EyesBuyBurnExecutor is IEyesKeeper {
    error ZeroAddress();
    error NothingToBurn();
    error SlippageExceeded();
    error BelowMinProceeds();

    EyesFeeCollector public immutable feeCollector;
    IEyesToken public immutable eyesToken;
    IUniswapV2Router02 public immutable dexRouter;
    address public immutable weth;

    /// @notice Minimum queued ETH before `executeBuyAndBurnIfReady` / `executeBuyAndBurnAuto` will run.
    uint256 public minProceedsEth;

    /// @notice Slippage guard used by `executeBuyAndBurnAuto` (basis points).
    uint16 public maxSlippageBps = 300;

    uint256 public totalEyesBurned;

    event BuyAndBurnExecuted(uint256 ethSpent, uint256 eyesBurned, uint256 eyesSupplyAfter);
    event MinProceedsUpdated(uint256 oldMin, uint256 newMin);
    event MaxSlippageUpdated(uint16 oldBps, uint16 newBps);

    constructor(address feeCollector_, address eyesToken_, address dexRouter_) {
        if (feeCollector_ == address(0) || eyesToken_ == address(0) || dexRouter_ == address(0)) {
            revert ZeroAddress();
        }
        feeCollector = EyesFeeCollector(payable(feeCollector_));
        eyesToken = IEyesToken(eyesToken_);
        dexRouter = IUniswapV2Router02(dexRouter_);
        weth = dexRouter.WETH();
        minProceedsEth = 0.0001 ether;
    }

    /// @inheritdoc IEyesKeeper
    function burnQueueStatus() external view returns (BurnQueueStatus memory status) {
        status.pendingEth = feeCollector.accumulatedBurnProceeds();
        status.minProceedsEth = minProceedsEth;
        status.ready = status.pendingEth >= minProceedsEth && status.pendingEth > 0;
        status.totalEyesBurned = totalEyesBurned;
        status.eyesSupply = IERC20(address(eyesToken)).totalSupply();
    }

    /// @notice Pull queued ETH, buy $EYES, and burn the full purchased amount.
    function executeBuyAndBurn(uint256 minEyesOut) public returns (uint256 eyesBurned) {
        uint256 ethAmount = feeCollector.pullBurnProceeds();
        if (ethAmount == 0) revert NothingToBurn();

        address[] memory path = new address[](2);
        path[0] = weth;
        path[1] = address(eyesToken);

        uint256 eyesBefore = _balanceOf(address(eyesToken), address(this));

        dexRouter.swapExactETHForTokensSupportingFeeOnTransferTokens{value: ethAmount}(
            minEyesOut, path, address(this), block.timestamp + 15 minutes
        );

        eyesBurned = _balanceOf(address(eyesToken), address(this)) - eyesBefore;
        if (eyesBurned < minEyesOut) revert SlippageExceeded();

        eyesToken.burn(eyesBurned);
        totalEyesBurned += eyesBurned;
        feeCollector.recordEyesBurned(eyesBurned);

        emit BuyAndBurnExecuted(ethAmount, eyesBurned, IERC20(address(eyesToken)).totalSupply());
    }

    /// @inheritdoc IEyesKeeper
    function executeBuyAndBurnIfReady(uint256 minEyesOut) external returns (uint256 eyesBurned) {
        if (feeCollector.accumulatedBurnProceeds() < minProceedsEth) revert BelowMinProceeds();
        return executeBuyAndBurn(minEyesOut);
    }

    /// @inheritdoc IEyesKeeper
    function executeBuyAndBurnAuto() external returns (uint256 eyesBurned) {
        uint256 pending = feeCollector.accumulatedBurnProceeds();
        if (pending < minProceedsEth) revert BelowMinProceeds();

        uint256 quoted = _quoteEyesOut(pending);
        uint256 minOut = (quoted * (10_000 - maxSlippageBps)) / 10_000;
        return executeBuyAndBurn(minOut);
    }

    /// @notice Update minimum queued ETH required before keeper execution.
    function setMinProceedsEth(uint256 newMin) external {
        _requireFeeCollectorOwner();
        emit MinProceedsUpdated(minProceedsEth, newMin);
        minProceedsEth = newMin;
    }

    function setMaxSlippageBps(uint16 bps) external {
        _requireFeeCollectorOwner();
        require(bps <= 1_000, "Executor: slippage too high");
        emit MaxSlippageUpdated(maxSlippageBps, bps);
        maxSlippageBps = bps;
    }

    function _quoteEyesOut(uint256 ethIn) internal view returns (uint256) {
        address[] memory path = new address[](2);
        path[0] = weth;
        path[1] = address(eyesToken);
        uint256[] memory amounts = dexRouter.getAmountsOut(ethIn, path);
        return amounts[amounts.length - 1];
    }

    /// @dev Admin changes route through fee collector owner (same multisig in production).
    function _requireFeeCollectorOwner() internal view {
        (bool ok, bytes memory data) = address(feeCollector).staticcall(
            abi.encodeWithSignature("owner()")
        );
        require(ok && data.length >= 32, "Executor: owner lookup failed");
        require(msg.sender == abi.decode(data, (address)), "Executor: not admin");
    }

    function _balanceOf(address token, address account) internal view returns (uint256) {
        (bool ok, bytes memory data) =
            token.staticcall(abi.encodeWithSignature("balanceOf(address)", account));
        require(ok && data.length >= 32, "Executor: balanceOf failed");
        return abi.decode(data, (uint256));
    }

    receive() external payable {}
}
