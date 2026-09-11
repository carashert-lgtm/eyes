// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Script, console2} from "forge-std/Script.sol";
import {SafeAddresses} from "./safe/SafeAddresses.sol";
import {SafeDeployLib} from "./safe/SafeDeployLib.sol";

/// @notice Brute-force Safe CREATE2 params (extended).
contract FindCounterfactualSafe is Script {
    address[] internal fallbackHandlers;
    address[] internal singletons;

    function run() external {
        fallbackHandlers = new address[](3);
        fallbackHandlers[0] = address(0);
        fallbackHandlers[1] = SafeAddresses.FALLBACK_V141;
        fallbackHandlers[2] = SafeAddresses.FALLBACK_LEGACY;

        singletons = new address[](3);
        singletons[0] = SafeAddresses.SINGLETON_L2;
        singletons[1] = SafeAddresses.SINGLETON;
        singletons[2] = SafeAddresses.SINGLETON_V130;

        address target = vm.envAddress("COUNTERFACTUAL_SAFE");
        address deployer = vm.envAddress("SAFE_OWNER_DEPLOYER");
        address treasury = vm.envAddress("SAFE_OWNER_TREASURY");

        console2.log("Target", target);

        address[] memory one = _arr1(deployer);
        address[] memory two = _arr2(deployer, treasury);

        for (uint256 s = 0; s < singletons.length; s++) {
            if (_scan("deployer-only", target, one, singletons[s], 200)) return;
            if (_scan("deployer+treasury", target, two, singletons[s], 200)) return;
        }

        console2.log("NO MATCH");
    }

    function _arr1(address a) internal pure returns (address[] memory o) {
        o = new address[](1);
        o[0] = a;
    }

    function _arr2(address a, address b) internal pure returns (address[] memory o) {
        o = new address[](2);
        o[0] = a;
        o[1] = b;
    }

    function _scan(
        string memory label,
        address target,
        address[] memory owners,
        address singleton,
        uint256 maxSalt
    ) internal view returns (bool) {
        for (uint256 salt = 0; salt < maxSalt; salt++) {
            uint256 maxT = owners.length;
            for (uint256 threshold = 1; threshold <= maxT; threshold++) {
                for (uint256 f = 0; f < fallbackHandlers.length; f++) {
                    bytes memory init =
                        SafeDeployLib.encodeSetup(owners, threshold, fallbackHandlers[f]);
                    if (SafeDeployLib.predictAddress(singleton, init, salt) == target) {
                        console2.log("MATCH", label);
                        console2.log("  saltNonce", salt);
                        console2.log("  threshold", threshold);
                        console2.log("  fallbackHandler", fallbackHandlers[f]);
                        console2.log("  singleton", singleton);
                        return true;
                    }
                }
            }
        }
        return false;
    }
}
