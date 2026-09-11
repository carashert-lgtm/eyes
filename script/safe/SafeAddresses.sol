// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

/// @notice Canonical Gnosis Safe addresses on Base (safe-deployments v1.4.1 / v1.3.0).
library SafeAddresses {
    address internal constant PROXY_FACTORY = 0x4e1DCf7AD4e460CfD30791CCC4F9c8a4f820ec67;

    /// @dev Safe v1.4.1 singleton (canonical on Base 8453).
    address internal constant SINGLETON = 0x41675C099F32341bf84BFc5382aF534df5C7461a;

    /// @dev Safe v1.4.1 L2 singleton (used on Base and other L2s).
    address internal constant SINGLETON_L2 = 0x29fcB43b46531BcA003ddC8FCB67FFE91900C762;

    /// @dev Safe v1.3.0 singleton.
    address internal constant SINGLETON_V130 = 0xd9db270C8b6e3fdFC9d9aD3FB6d3E4F12e6f0c73;
    address internal constant FALLBACK_V141 = 0xfd0732Dc9E303f09fCEf3a7388Ad10A83459Ec99;

    /// @dev Legacy fallback handler (some older UI flows).
    address internal constant FALLBACK_LEGACY = 0xF48F2B842963393f9D1142Ee1b0E64F6A0e27930;
}
