// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

/// @title BaseSepoliaConfig
/// @notice Canonical Base Sepolia addresses for Eyes Open testnet deployments.
/// @dev Source: https://basehub.org/network/ecosystem-contracts/ (Uniswap V2 section)
library BaseSepoliaConfig {
    uint256 internal constant CHAIN_ID = 84532;

    address internal constant UNISWAP_V2_FACTORY = 0x7Ae58f10f7849cA6F5fB71b7f45CB416c9204b1e;
    address internal constant UNISWAP_V2_ROUTER = 0x1689E7B1F10000AE47eBfE339a4f69dECd19F602;

    /// @dev WETH is resolved at runtime via `IUniswapV2Router02(WETH).WETH()`.
    ///      Do not hardcode unless verified on-chain during deployment scripts.
}
