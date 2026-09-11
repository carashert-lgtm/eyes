// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";

import {MockWETH} from "./MockWETH.sol";
import {MockUniswapV2Factory, MockUniswapV2Pair} from "./MockUniswapV2.sol";

/// @dev Lightweight Uniswap V2 router mock for Eyes Open integration tests.
contract MockUniswapV2Router {
    address public immutable factory;
    address public immutable weth;
    uint256 public eyesSwapRate = 1_000 ether; // 1 ETH -> 1000 EYES (test default)

    constructor(address factory_, address weth_) {
        factory = factory_;
        weth = weth_;
    }

    function WETH() external view returns (address) {
        return weth;
    }

    function setEyesSwapRate(uint256 rate) external {
        eyesSwapRate = rate;
    }

    function getAmountsOut(uint256 amountIn, address[] calldata path)
        external
        view
        returns (uint256[] memory amounts)
    {
        amounts = new uint256[](path.length);
        amounts[0] = amountIn;
        if (path.length > 1 && path[1] == _eyesToken() && _eyesToken() != address(0)) {
            amounts[1] = (amountIn * eyesSwapRate) / 1 ether;
        } else if (path.length > 1) {
            amounts[1] = amountIn * 100;
        }
    }

    function addLiquidityETH(
        address token,
        uint256 amountTokenDesired,
        uint256,
        uint256,
        address to,
        uint256
    ) external payable returns (uint256 amountToken, uint256 amountETH, uint256 liquidity) {
        address pair = MockUniswapV2Factory(factory).getPair(token, weth);
        if (pair == address(0)) {
            pair = MockUniswapV2Factory(factory).createPair(token, weth);
        }

        IERC20(token).transferFrom(msg.sender, pair, amountTokenDesired);
        MockWETH(payable(weth)).deposit{value: msg.value}();
        IERC20(weth).transfer(pair, msg.value);

        liquidity = MockUniswapV2Pair(pair).mint(to);
        amountToken = amountTokenDesired;
        amountETH = msg.value;
    }

    function swapExactETHForTokensSupportingFeeOnTransferTokens(
        uint256 amountOutMin,
        address[] calldata path,
        address to,
        uint256
    ) external payable {
        require(path[0] == weth, "MockRouter: bad path");
        require(msg.value > 0, "MockRouter: no value");

        uint256 amountOut;
        address pair = MockUniswapV2Factory(factory).getPair(path[0], path[1]);

        if (path[1] == _eyesToken() && _eyesToken() != address(0)) {
            amountOut = (msg.value * eyesSwapRate) / 1 ether;
            if (pair != address(0) && IERC20(path[1]).balanceOf(pair) >= amountOut) {
                MockUniswapV2Pair(pair).pushToken(path[1], to, amountOut);
            } else {
                require(IERC20(path[1]).transfer(to, amountOut), "MockRouter: eyes out");
            }
        } else {
            require(pair != address(0), "MockRouter: no pair");
            amountOut = msg.value * 100;
            MockUniswapV2Pair(pair).pushToken(path[1], to, amountOut);
        }
        require(amountOut >= amountOutMin, "MockRouter: slippage");
    }

    function swapExactTokensForETHSupportingFeeOnTransferTokens(
        uint256 amountIn,
        uint256 amountOutMin,
        address[] calldata path,
        address to,
        uint256
    ) external {
        require(path[path.length - 1] == weth, "MockRouter: bad path");
        IERC20(path[0]).transferFrom(msg.sender, address(this), amountIn);
        uint256 ethOut = amountIn / 100;
        require(ethOut >= amountOutMin, "MockRouter: slippage");
        (bool sent,) = to.call{value: ethOut}("");
        require(sent, "MockRouter: eth out");
    }

    address internal _eyes;
    function setEyesToken(address eyesToken_) external { _eyes = eyesToken_; }
    function _eyesToken() internal view returns (address) { return _eyes; }

    receive() external payable {}
}
