// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

/// @title EthereumMainnetConfig
/// @notice Canonical Ethereum mainnet constants for Eyes Open fair launch stack.
library EthereumMainnetConfig {
    uint256 internal constant CHAIN_ID = 1;

    /// @dev Uniswap V2 on Ethereum mainnet.
    address internal constant UNISWAP_V2_FACTORY = 0x5C69bEe701ef814a2B6a3EDD4B1652CB9cc5aA6f;
    address internal constant UNISWAP_V2_ROUTER = 0x7a250d5630B4cF539739dF2C5dAcb4c659F2488D;
    address internal constant WETH = 0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2;
}
