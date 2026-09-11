// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {EyesToken} from "../src/EyesToken.sol";
import {EyesScriptBase} from "./EyesScriptBase.sol";
import {BaseMainnetConfig} from "./config/BaseMainnetConfig.sol";
import {console2} from "forge-std/console2.sol";

/// @title DeployEyesTokenOnly
/// @notice Deploy $EYES on Base mainnet without LP seeding — presale distributor can send, no DEX listing yet.
/// @dev Set EYES_TREASURY to presale wallet (e.g. 0x3dFf…c4b5). Do NOT run SeedEyesLiquidity until public launch.
contract DeployEyesTokenOnly is EyesScriptBase {
    function run() external returns (address eyesToken) {
        _requireChain(BaseMainnetConfig.CHAIN_ID);
        _preflightBroadcastTokenOnly("deploy-eyes-token-only", 0.001 ether);

        address treasury = _treasury();
        require(treasury != address(0), "EYES: zero treasury");

        console2.log("");
        console2.log("========================================");
        console2.log("Eyes Open - $EYES token only (no LP)");
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
        console2.log("Env snippet", _envSnippetPath());
        console2.log("");
        console2.log("Next: verify on BaseScan, set EYES_TOKEN_ADDRESS on Railway, run !presalesend");
        console2.log("Do NOT seed Uniswap LP until public trading launch.");
    }
}
