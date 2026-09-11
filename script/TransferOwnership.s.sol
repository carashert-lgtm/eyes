// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";

import {EyesToken} from "../src/EyesToken.sol";
import {EyesFeeCollector} from "../src/EyesFeeCollector.sol";
import {EyesLaunchFactory} from "../src/EyesLaunchFactory.sol";
import {EyesFeeRouter} from "../src/trading/EyesFeeRouter.sol";

import {EyesScriptBase} from "./EyesScriptBase.sol";
import {BaseSepoliaConfig} from "./config/BaseSepoliaConfig.sol";
import {BaseMainnetConfig} from "./config/BaseMainnetConfig.sol";
import {console2} from "forge-std/console2.sol";

/// @title TransferOwnership
/// @notice Moves Ownable admin rights from deployer EOA to a multisig (e.g. Gnosis Safe).
///
/// Required env:
///   NEW_OWNER=0x...   (multisig address)
///
/// Loads contract addresses from .env or deployments/base-sepolia.json.
/// @dev Run once before mainnet. Verify NEW_OWNER on a Safe preview before broadcasting.
contract TransferOwnership is EyesScriptBase {
    function run() external {
        if (block.chainid == BaseSepoliaConfig.CHAIN_ID) {
            _requireChain(BaseSepoliaConfig.CHAIN_ID);
        } else if (block.chainid == BaseMainnetConfig.CHAIN_ID) {
            _requireChain(BaseMainnetConfig.CHAIN_ID);
        }

        address newOwner = _envAddress("NEW_OWNER");
        if (newOwner == address(0)) revert PreflightFailed("Set NEW_OWNER to your multisig address");
        if (newOwner == msg.sender) revert PreflightFailed("NEW_OWNER must differ from current broadcaster");

        address eyesToken = _resolveAddress("EYES_TOKEN", "eyesToken");
        address feeCollector = _resolveAddress("EYES_FEE_COLLECTOR", "feeCollector");
        address factory = _resolveAddress("EYES_FACTORY", "factory");
        address feeRouter = _resolveAddress("EYES_FEE_ROUTER", "feeRouter");

        _logDeploymentHeader("Eyes Open - Transfer Ownership");
        console2.log("newOwner", newOwner);

        vm.startBroadcast();

        _transferIfOwner(EyesToken(eyesToken), newOwner);
        _transferIfOwner(EyesFeeCollector(payable(feeCollector)), newOwner);
        _transferIfOwner(EyesLaunchFactory(factory), newOwner);
        _transferIfOwner(EyesFeeRouter(payable(feeRouter)), newOwner);

        vm.stopBroadcast();

        console2.log("Ownership transferred on Ownable contracts.");
        console2.log("EyesLiquidityLocker has no owner (immutable by design).");
        console2.log("EyesBuyBurnExecutor admin params are controlled by feeCollector owner.");
    }

    function _transferIfOwner(Ownable contract_, address newOwner) internal {
        if (contract_.owner() == msg.sender) {
            contract_.transferOwnership(newOwner);
            console2.log("transferred", address(contract_));
        } else {
            console2.log("skipped (not owner)", address(contract_));
        }
    }
}
