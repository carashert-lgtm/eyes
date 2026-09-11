// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {EyesToken} from "../src/EyesToken.sol";
import {EyesScriptBase} from "./EyesScriptBase.sol";
import {EthereumMainnetConfig} from "./config/EthereumMainnetConfig.sol";
import {console2} from "forge-std/console2.sol";

/// @title DeployEyesTokenEthereum
/// @notice Deploy $EYES on Ethereum mainnet for the launch fee stack (buy/burn + collector wiring).
/// @dev Launch registration fees still settle on Base. Mint full supply to treasury — bridge strategy TBD.
contract DeployEyesTokenEthereum is EyesScriptBase {
    function run() external returns (address eyesToken) {
        _requireChain(EthereumMainnetConfig.CHAIN_ID);
        _preflightBroadcastTokenOnly("deploy-eyes-token-ethereum", 0.01 ether);

        address treasury = _treasury();
        require(treasury != address(0), "EYES: zero treasury");

        console2.log("");
        console2.log("========================================");
        console2.log("Eyes Open - $EYES on Ethereum (stack wiring)");
        console2.log("========================================");
        console2.log("treasury", treasury);
        console2.log("chainId", block.chainid);

        vm.startBroadcast();
        EyesToken eyes = new EyesToken(treasury);
        vm.stopBroadcast();

        eyesToken = address(eyes);
        _writeTokenOnlyDeploymentJson(eyesToken, treasury);

        console2.log("eyesToken", eyesToken);
        console2.log("Saved", _deploymentPath());
        console2.log("Next: set EYES_TOKEN in .env, run deploy-ethereum-mainnet.ps1 -Step stack");
    }
}
