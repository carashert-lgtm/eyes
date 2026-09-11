// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Script, console2} from "forge-std/Script.sol";
import {SafeAddresses} from "./safe/SafeAddresses.sol";
import {SafeDeployLib} from "./safe/SafeDeployLib.sol";

/// @dev Print predicted Safe addresses for common setups (debug).
contract PreviewSafeAddresses is Script {
    function run() external view {
        address deployer = vm.envAddress("SAFE_OWNER_DEPLOYER");
        address treasury = vm.envAddress("SAFE_OWNER_TREASURY");

        address[] memory owners = new address[](2);
        owners[0] = deployer;
        owners[1] = treasury;

        for (uint256 salt = 0; salt < 5; salt++) {
            bytes memory init = SafeDeployLib.encodeSetup(owners, 1, SafeAddresses.FALLBACK_V141);
            address p = SafeDeployLib.predictAddress(SafeAddresses.SINGLETON, init, salt);
            console2.log("v1.4.1 1/2 fb141 salt", salt, p);
        }
        for (uint256 salt = 0; salt < 5; salt++) {
            bytes memory init = SafeDeployLib.encodeSetup(owners, 2, SafeAddresses.FALLBACK_V141);
            address p = SafeDeployLib.predictAddress(SafeAddresses.SINGLETON, init, salt);
            console2.log("v1.4.1 2/2 fb141 salt", salt, p);
        }
        for (uint256 salt = 0; salt < 5; salt++) {
            bytes memory init = SafeDeployLib.encodeSetup(owners, 1, address(0));
            address p = SafeDeployLib.predictAddress(SafeAddresses.SINGLETON, init, salt);
            console2.log("v1.4.1 1/2 no-fb salt", salt, p);
        }
    }
}
