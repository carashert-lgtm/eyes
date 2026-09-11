// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Script, console2} from "forge-std/Script.sol";
import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";
import {stdJson} from "forge-std/StdJson.sol";

import {SafeAddresses} from "./safe/SafeAddresses.sol";
import {SafeDeployLib} from "./safe/SafeDeployLib.sol";

interface ISafe {
    enum Operation {
        Call,
        DelegateCall
    }

    function nonce() external view returns (uint256);

    function getTransactionHash(
        address to,
        uint256 value,
        bytes calldata data,
        Operation operation,
        uint256 safeTxGas,
        uint256 baseGas,
        uint256 gasPrice,
        address gasToken,
        address payable refundReceiver,
        uint256 _nonce
    ) external view returns (bytes32);

    function execTransaction(
        address to,
        uint256 value,
        bytes calldata data,
        Operation operation,
        uint256 safeTxGas,
        uint256 baseGas,
        uint256 gasPrice,
        address gasToken,
        address payable refundReceiver,
        bytes memory signatures
    ) external payable returns (bool success);
}

/// @title RecoverSafeOwnership
/// @notice Deploy counterfactual Safe (if needed) then transfer Eyes admin to NEW_OWNER Safe.
/// Env:
///   COUNTERFACTUAL_SAFE — stuck owner (0x9C456…)
///   NEW_OWNER — working Safe (0xbe5B…)
///   SAFE_OWNER_DEPLOYER, SAFE_OWNER_TREASURY
///   SAFE_SALT_NONCE, SAFE_THRESHOLD, SAFE_USE_FALLBACK (0|1), SAFE_SINGLETON (optional)
///   DEPLOYER_PRIVATE_KEY — pays gas + signs Safe txs (must be a Safe owner; 1-of-N ok)
contract RecoverSafeOwnership is Script {
    using stdJson for string;

    function run() external {
        uint256 deployerKey = vm.envUint("DEPLOYER_PRIVATE_KEY");
        address counterfactual = vm.envAddress("COUNTERFACTUAL_SAFE");
        address newOwner = vm.envAddress("NEW_OWNER");

        address deployer = vm.envAddress("SAFE_OWNER_DEPLOYER");
        address treasury = vm.envAddress("SAFE_OWNER_TREASURY");
        uint256 saltNonce = vm.envUint("SAFE_SALT_NONCE");
        uint256 threshold = vm.envUint("SAFE_THRESHOLD");
        address singleton = SafeAddresses.SINGLETON;
        try vm.envAddress("SAFE_SINGLETON") returns (address s) {
            singleton = s;
        } catch {}

        bool useFallback = vm.envUint("SAFE_USE_FALLBACK") == 1;
        address fallbackHandler = address(0);
        if (useFallback) {
            try vm.envAddress("SAFE_FALLBACK_HANDLER") returns (address fh) {
                fallbackHandler = fh;
            } catch {
                fallbackHandler = SafeAddresses.FALLBACK_V141;
            }
        }

        address[] memory owners = new address[](2);
        owners[0] = deployer;
        owners[1] = treasury;
        bytes memory initializer = SafeDeployLib.encodeSetup(owners, threshold, fallbackHandler);

        address predicted = SafeDeployLib.predictAddress(singleton, initializer, saltNonce);
        require(predicted == counterfactual, "predicted Safe != COUNTERFACTUAL_SAFE");

        string memory json = vm.readFile("deployments/base-mainnet.json");
        address eyesToken = json.readAddress(".eyesToken");
        address factory = json.readAddress(".factory");
        address feeCollector = json.readAddress(".feeCollector");
        address feeRouter = json.readAddress(".feeRouter");

        vm.startBroadcast(deployerKey);

        address safe = counterfactual;
        uint256 codeSize;
        assembly {
            codeSize := extcodesize(counterfactual)
        }

        if (codeSize == 0) {
            console2.log("Deploying counterfactual Safe", counterfactual);
            safe = SafeDeployLib.deploy(singleton, initializer, saltNonce);
            require(safe == counterfactual, "deployed address mismatch");
        } else {
            console2.log("Safe already deployed", counterfactual);
        }

        ISafe safeContract = ISafe(safe);

        _safeTransferOwnership(safeContract, deployerKey, eyesToken, newOwner, "EyesToken");
        _safeTransferOwnership(safeContract, deployerKey, factory, newOwner, "Factory");
        _safeTransferOwnership(safeContract, deployerKey, feeCollector, newOwner, "FeeCollector");
        _safeTransferOwnership(safeContract, deployerKey, feeRouter, newOwner, "FeeRouter");

        vm.stopBroadcast();

        console2.log("Done. owner() on stack should now be", newOwner);
    }

    function _safeTransferOwnership(
        ISafe safe,
        uint256 signerKey,
        address ownable,
        address newOwner,
        string memory label
    ) internal {
        if (Ownable(ownable).owner() != address(safe)) {
            console2.log("skip (not owned by counterfactual Safe)", label);
            return;
        }
        if (Ownable(ownable).owner() == newOwner) {
            console2.log("skip (already new owner)", label);
            return;
        }

        bytes memory data = abi.encodeWithSelector(Ownable.transferOwnership.selector, newOwner);
        _execSafeCall(safe, signerKey, ownable, data);
        console2.log("transferred", label);
    }

    function _execSafeCall(ISafe safe, uint256 signerKey, address to, bytes memory data) internal {
        uint256 safeNonce = safe.nonce();
        bytes32 txHash = safe.getTransactionHash(
            to,
            0,
            data,
            ISafe.Operation.Call,
            0,
            0,
            0,
            address(0),
            payable(address(0)),
            safeNonce
        );

        (uint8 v, bytes32 r, bytes32 s) = vm.sign(signerKey, txHash);
        bytes memory signatures = abi.encodePacked(r, s, v + 4);

        bool ok = safe.execTransaction(
            to,
            0,
            data,
            ISafe.Operation.Call,
            0,
            0,
            0,
            address(0),
            payable(address(0)),
            signatures
        );
        require(ok, "Safe execTransaction failed");
    }
}
