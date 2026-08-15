// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {ReentrancyGuard} from "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";

import {IUniswapV2Router02} from "../dex/interfaces/IUniswapV2.sol";
import {EyesTypes} from "../EyesTypes.sol";
import {IEyesLaunchFactory} from "../interfaces/IEyesLaunchpad.sol";
import {IEyesFeeCollector} from "../interfaces/IEyesLaunchpad.sol";

/// @title EyesFeeRouter
/// @notice Uniswap V2-style swap wrapper that skims launch trading fees into EyesFeeCollector.
///
/// ## Fee flow
/// 1. User swaps through this router (not the raw DEX router).
/// 2. Router takes `DEFAULT_TOTAL_FEE_BPS` (1%) of the input as the launch trading fee.
/// 3. Fee is forwarded to `EyesFeeCollector.distributeFees`, which splits the fee:
///    - 50% creator share (immediate ETH payout)
///    - 50% burn share (queued for EyesBuyBurnExecutor)
/// 4. Remaining swap input is executed on the underlying Uniswap V2 router.
/// @dev OWNER (testnet): deployer EOA. MAINNET: transfer to multisig.
contract EyesFeeRouter is Ownable, ReentrancyGuard {
    error ZeroAddress();
    error UnknownLaunchToken();
    error InvalidPath();
    error InvalidAmount();
    error OnlyFactory();

    IEyesLaunchFactory public immutable launchFactory;
    IEyesFeeCollector public immutable feeCollector;
    IUniswapV2Router02 public immutable dexRouter;
    address public immutable weth;

    mapping(address => uint256) public tokenLaunchId;

    constructor(
        address launchFactory_,
        address feeCollector_,
        address dexRouter_
    ) Ownable(msg.sender) {
        if (launchFactory_ == address(0) || feeCollector_ == address(0) || dexRouter_ == address(0)) {
            revert ZeroAddress();
        }
        launchFactory = IEyesLaunchFactory(launchFactory_);
        feeCollector = IEyesFeeCollector(feeCollector_);
        dexRouter = IUniswapV2Router02(dexRouter_);
        weth = dexRouter.WETH();
    }

    /// @notice Register a launched token so swaps can resolve its launchId and creator.
    function registerLaunchToken(uint256 launchId, address launchToken) external {
        if (msg.sender != address(launchFactory) && msg.sender != owner()) revert ZeroAddress();
        if (launchToken == address(0)) revert ZeroAddress();
        tokenLaunchId[launchToken] = launchId;
    }

    /// @notice Swap exact ETH for launch tokens with the Eyes trading fee applied on input.
    function swapExactETHForLaunchTokens(
        address launchToken,
        uint256 amountOutMin,
        address to,
        uint256 deadline
    ) external payable nonReentrant returns (uint256 amountOut) {
        if (msg.value == 0) revert InvalidAmount();
        uint256 launchId = _requireLaunchId(launchToken);

        address[] memory path = new address[](2);
        path[0] = weth;
        path[1] = launchToken;

        uint256 feeAmount = (msg.value * EyesTypes.DEFAULT_TOTAL_FEE_BPS) / EyesTypes.BPS;
        uint256 swapAmount = msg.value - feeAmount;

        if (feeAmount > 0) {
            address creator = launchFactory.getLaunch(launchId).creator;
            feeCollector.distributeFees{value: feeAmount}(launchId, creator);
        }

        uint256 balanceBefore = _balanceOf(launchToken, to);
        dexRouter.swapExactETHForTokensSupportingFeeOnTransferTokens{value: swapAmount}(
            amountOutMin, path, to, deadline
        );
        amountOut = _balanceOf(launchToken, to) - balanceBefore;
    }

    /// @notice Swap exact launch tokens for ETH with the Eyes trading fee applied on output.
    function swapExactLaunchTokensForETH(
        address launchToken,
        uint256 amountIn,
        uint256 amountOutMin,
        address to,
        uint256 deadline
    ) external nonReentrant returns (uint256 amountOut) {
        if (amountIn == 0) revert InvalidAmount();
        uint256 launchId = _requireLaunchId(launchToken);

        address[] memory path = new address[](2);
        path[0] = launchToken;
        path[1] = weth;

        _transferFrom(launchToken, msg.sender, address(this), amountIn);
        _approve(launchToken, address(dexRouter), amountIn);

        uint256 ethBefore = to.balance;
        dexRouter.swapExactTokensForETHSupportingFeeOnTransferTokens(
            amountIn, amountOutMin, path, address(this), deadline
        );
        uint256 ethOut = address(this).balance;

        uint256 feeAmount = (ethOut * EyesTypes.DEFAULT_TOTAL_FEE_BPS) / EyesTypes.BPS;
        uint256 userAmount = ethOut - feeAmount;

        if (feeAmount > 0) {
            address creator = launchFactory.getLaunch(launchId).creator;
            feeCollector.distributeFees{value: feeAmount}(launchId, creator);
        }

        (bool sent,) = to.call{value: userAmount}("");
        require(sent, "FeeRouter: ETH transfer failed");
        amountOut = to.balance - ethBefore;

        // Refund dust if any remains on router (should be zero).
        if (address(this).balance > 0) {
            (sent,) = to.call{value: address(this).balance}("");
            require(sent, "FeeRouter: dust refund failed");
        }
    }

    receive() external payable {}

    function _requireLaunchId(address launchToken) internal view returns (uint256 launchId) {
        launchId = tokenLaunchId[launchToken];
        if (launchId == 0) revert UnknownLaunchToken();
    }

    function _balanceOf(address token, address account) internal view returns (uint256) {
        (bool ok, bytes memory data) =
            token.staticcall(abi.encodeWithSignature("balanceOf(address)", account));
        require(ok && data.length >= 32, "FeeRouter: balanceOf failed");
        return abi.decode(data, (uint256));
    }

    function _transferFrom(address token, address from, address to, uint256 amount) internal {
        (bool ok, bytes memory data) = token.call(
            abi.encodeWithSignature("transferFrom(address,address,uint256)", from, to, amount)
        );
        require(ok && (data.length == 0 || abi.decode(data, (bool))), "FeeRouter: transferFrom failed");
    }

    function _approve(address token, address spender, uint256 amount) internal {
        (bool ok, bytes memory data) =
            token.call(abi.encodeWithSignature("approve(address,uint256)", spender, amount));
        require(ok && (data.length == 0 || abi.decode(data, (bool))), "FeeRouter: approve failed");
    }
}
