// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {ERC20} from "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";

/// @dev Minimal Uniswap V2 pair mock that mints LP ERC20 and tracks two assets.
contract MockUniswapV2Pair is ERC20 {
    address public token0;
    address public token1;
    uint112 public reserve0;
    uint112 public reserve1;

    constructor(address token0_, address token1_) ERC20("Mock LP", "MLP") {
        (token0, token1) = token0_ < token1_ ? (token0_, token1_) : (token1_, token0_);
    }

    function mint(address to) external returns (uint256 liquidity) {
        uint256 bal0 = IERC20(token0).balanceOf(address(this));
        uint256 bal1 = IERC20(token1).balanceOf(address(this));
        liquidity = bal0 + bal1;
        if (liquidity > 0) {
            _mint(to, liquidity);
            reserve0 = uint112(bal0);
            reserve1 = uint112(bal1);
        }
    }

    function getReserves() external view returns (uint112, uint112, uint32) {
        return (reserve0, reserve1, uint32(block.timestamp));
    }

    /// @dev Test helper: simulate a swap sending launch tokens out of the pair.
    function pushToken(address token, address to, uint256 amount) external {
        IERC20(token).transfer(to, amount);
    }
}

contract MockUniswapV2Factory {
    mapping(address => mapping(address => address)) public pairs;

    function createPair(address tokenA, address tokenB) external returns (address pair) {
        require(tokenA != tokenB, "MockFactory: identical");
        (address t0, address t1) = tokenA < tokenB ? (tokenA, tokenB) : (tokenB, tokenA);
        require(pairs[t0][t1] == address(0), "MockFactory: exists");
        pair = address(new MockUniswapV2Pair(t0, t1));
        pairs[t0][t1] = pair;
        pairs[t1][t0] = pair;
    }

    function getPair(address tokenA, address tokenB) external view returns (address pair) {
        (address t0, address t1) = tokenA < tokenB ? (tokenA, tokenB) : (tokenB, tokenA);
        pair = pairs[t0][t1];
    }
}
