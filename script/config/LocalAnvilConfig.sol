// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

/// @title LocalAnvilConfig
/// @notice Constants for Foundry Anvil local testing (chain ID 31337).
library LocalAnvilConfig {
    uint256 internal constant CHAIN_ID = 31_337;

    /// @dev Anvil account #0 — prefunded 10,000 ETH by default
    address internal constant DEPLOYER = 0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266;

    /// @dev Anvil account #1 — useful as presale contributor in wallet tests
    address internal constant CONTRIBUTOR = 0x70997970C51812dc3A010C7d01b50e0d17dc79C8;
}
