// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {EyesLaunchFactory} from "../src/EyesLaunchFactory.sol";
import {EyesTypes} from "../src/EyesTypes.sol";
import {EyesScriptBase} from "./EyesScriptBase.sol";
import {console2} from "forge-std/console2.sol";

/// @title AnvilCreateLaunchSmoke
/// @notice Smoke test for createLaunch on local Anvil (used by coin QA).
contract AnvilCreateLaunchSmoke is EyesScriptBase {
    function run() external {
        _requireDeploymentFile();
        address factoryAddr = _resolveAddress("EYES_FACTORY", "factory");
        EyesLaunchFactory factory = EyesLaunchFactory(factoryAddr);

        uint256 before = factory.launchCount();
        vm.startBroadcast();
        (address token, uint256 launchId) = factory.createLaunch(
            EyesTypes.LaunchConfig({
                name: "Coin QA Launch",
                symbol: "CQA",
                creator: msg.sender,
                tokenSupply: 0,
                eyesWindowDuration: 3600,
                creatorFeeBps: 0,
                burnFeeBps: 0
            })
        );
        vm.stopBroadcast();

        console2.log("CHECK createLaunch", factory.launchCount() == before + 1 ? "PASS" : "FAIL");
        console2.log("launchId", launchId);
        console2.log("launchToken", token);
    }
}
