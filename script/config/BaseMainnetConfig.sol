// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

/// @title BaseMainnetConfig
/// @notice Canonical Base mainnet constants for Eyes Open deployments.
/// @dev Uniswap V2 on Base — used by full stack deploy later, not token-only presale send.
library BaseMainnetConfig {
    uint256 internal constant CHAIN_ID = 8453;

    address internal constant UNISWAP_V2_FACTORY = 0x8909Dc15e40173Ff669934A397563daaB219625E;
    address internal constant UNISWAP_V2_ROUTER = 0x4752ba5DBc23f44D87826276BF6Fd6b1C372aD24;
}
