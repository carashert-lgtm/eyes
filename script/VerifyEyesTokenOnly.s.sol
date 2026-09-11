// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {EyesTypes} from "../src/EyesTypes.sol";
import {EyesScriptBase} from "./EyesScriptBase.sol";
import {BaseMainnetConfig} from "./config/BaseMainnetConfig.sol";
import {console2} from "forge-std/console2.sol";

/// @title VerifyEyesTokenOnly
/// @notice Read-only checks after token-only mainnet deploy.
contract VerifyEyesTokenOnly is EyesScriptBase {
    function run() external view {
        _requireChain(BaseMainnetConfig.CHAIN_ID);
        _requireDeploymentFile();

        address eyesToken = _readDeployment("eyesToken");
        address treasury = _readDeployment("treasury");
        _requireContract(eyesToken, "eyesToken");

        IERC20 token = IERC20(eyesToken);
        uint256 supply = token.totalSupply();
        uint256 treasuryBal = token.balanceOf(treasury);

        console2.log("eyesToken", eyesToken);
        console2.log("treasury", treasury);
        console2.log("totalSupply", supply);
        console2.log("treasuryBalance", treasuryBal);
        console2.log("expectedSupply", EyesTypes.EYES_TOTAL_SUPPLY);

        require(supply == EyesTypes.EYES_TOTAL_SUPPLY, "supply mismatch");
        require(treasuryBal == EyesTypes.EYES_TOTAL_SUPPLY, "treasury must hold full supply");
        console2.log("PASS token-only deployment verified");
    }
}
