// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Script, console2} from "forge-std/Script.sol";
import {SafeAddresses} from "./safe/SafeAddresses.sol";
import {SafeDeployLib} from "./safe/SafeDeployLib.sol";

/// @dev Find CREATE2 params for an already-deployed Safe (sanity check).
contract FindDeployedSafeParams is Script {
    function run() external view {
        address target = vm.envAddress("DEPLOYED_SAFE");
        address deployer = vm.envAddress("SAFE_OWNER_DEPLOYER");

        address[] memory one = new address[](1);
        one[0] = deployer;

        address[3] memory singletons = [
            SafeAddresses.SINGLETON_L2,
            SafeAddresses.SINGLETON,
            SafeAddresses.SINGLETON_V130
        ];
        address[3] memory fallbacks = [
            address(0),
            SafeAddresses.FALLBACK_V141,
            SafeAddresses.FALLBACK_LEGACY
        ];

        console2.log("Find params for deployed Safe", target);

        for (uint256 si = 0; si < 3; si++) {
            for (uint256 salt = 0; salt < 200; salt++) {
                for (uint256 f = 0; f < 3; f++) {
                    bytes memory init = SafeDeployLib.encodeSetup(one, 1, fallbacks[f]);
                    if (SafeDeployLib.predictAddress(singletons[si], init, salt) == target) {
                        console2.log("MATCH deployed Safe");
                        console2.log("  salt", salt);
                        console2.log("  fallback", fallbacks[f]);
                        console2.log("  singleton", singletons[si]);
                        return;
                    }
                }
            }
        }
        console2.log("no match for deployer-only 1/1");
    }
}
