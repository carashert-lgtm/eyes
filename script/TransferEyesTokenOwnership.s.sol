// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";
import {EyesToken} from "../src/EyesToken.sol";
import {EyesScriptBase} from "./EyesScriptBase.sol";
import {BaseMainnetConfig} from "./config/BaseMainnetConfig.sol";
import {console2} from "forge-std/console2.sol";

/// @title TransferEyesTokenOwnership
/// @notice Move EyesToken Ownable admin from deployer EOA to a Gnosis Safe (mainnet token-only deploy).
/// @dev Set NEW_OWNER to your Safe address. Treasury wallet (1B holder) is unchanged.
contract TransferEyesTokenOwnership is EyesScriptBase {
    function run() external {
        _requireChain(BaseMainnetConfig.CHAIN_ID);
        _requireDeploymentFile();

        address newOwner = _envAddress("NEW_OWNER");
        if (newOwner == address(0)) revert PreflightFailed("Set NEW_OWNER to your Gnosis Safe address");
        if (newOwner == msg.sender) revert PreflightFailed("NEW_OWNER must differ from broadcaster");

        address eyesToken = _readDeployment("eyesToken");
        _requireContract(eyesToken, "eyesToken");

        Ownable token = Ownable(eyesToken);
        address currentOwner = token.owner();

        console2.log("eyesToken", eyesToken);
        console2.log("currentOwner", currentOwner);
        console2.log("newOwner", newOwner);

        require(currentOwner == msg.sender, "broadcaster must be current owner");

        vm.startBroadcast();
        token.transferOwnership(newOwner);
        vm.stopBroadcast();

        console2.log("PASS ownership transferred to Safe");
    }
}
