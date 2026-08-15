// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Script, console2} from "forge-std/Script.sol";
import {stdJson} from "forge-std/StdJson.sol";

import {BaseSepoliaConfig} from "./config/BaseSepoliaConfig.sol";

/// @title EyesScriptBase
/// @notice Shared helpers, pre-flight checks, and deployment I/O for Eyes Open scripts.
abstract contract EyesScriptBase is Script {
    using stdJson for string;

    string internal constant DEPLOYMENT_PATH = "deployments/base-sepolia.json";
    string internal constant ENV_SNIPPET_PATH = "deployments/base-sepolia.env";

    error PreflightFailed(string reason);

    function _dexRouter() internal view returns (address) {
        return _envAddressOr("UNISWAP_V2_ROUTER", BaseSepoliaConfig.UNISWAP_V2_ROUTER);
    }

    function _treasury() internal view returns (address) {
        return _envAddressOr("EYES_TREASURY", msg.sender);
    }

    function _envAddress(string memory key) internal view returns (address) {
        return vm.envAddress(key);
    }

    function _envAddressOr(string memory key, address fallback_) internal view returns (address) {
        try vm.envAddress(key) returns (address value) {
            return value;
        } catch {
            return fallback_;
        }
    }

    function _envUintOr(string memory key, uint256 fallback_) internal view returns (uint256) {
        try vm.envUint(key) returns (uint256 value) {
            return value;
        } catch {
            return fallback_;
        }
    }

    function _requireChain(uint256 expectedChainId) internal view {
        if (block.chainid != expectedChainId) {
            revert PreflightFailed(
                string.concat("Wrong chain. Expected ", vm.toString(expectedChainId))
            );
        }
    }

    /// @dev Validates RPC connectivity, chain, router bytecode, and broadcaster balance.
    function _preflightBroadcast(string memory step, uint256 minBalanceWei) internal view {
        console2.log("[preflight]", step);
        console2.log("  chainId", block.chainid);
        console2.log("  broadcaster", msg.sender);
        console2.log("  balanceWei", msg.sender.balance);

        if (msg.sender.balance < minBalanceWei) {
            revert PreflightFailed(
                string.concat(
                    "Broadcaster balance too low (need ",
                    vm.toString(minBalanceWei / 1 gwei),
                    " gwei minimum). Fund wallet: https://www.alchemy.com/faucets/base-sepolia"
                )
            );
        }

        address router = _dexRouter();
        if (router.code.length == 0) {
            revert PreflightFailed(
                "DEX router has no bytecode on this chain. Check UNISWAP_V2_ROUTER and RPC network"
            );
        }
        console2.log("  dexRouter", router);
    }

    function _requireDeploymentFile() internal view {
        if (!vm.exists(DEPLOYMENT_PATH)) {
            revert PreflightFailed(
                string.concat("Missing ", DEPLOYMENT_PATH, " - run DeployEyes first")
            );
        }
    }

    function _readDeployment(string memory jsonKey) internal view returns (address) {
        _requireDeploymentFile();
        string memory json = vm.readFile(DEPLOYMENT_PATH);
        return json.readAddress(string.concat(".", jsonKey));
    }

    /// @dev Prefer .env override, then deployment JSON.
    function _resolveAddress(string memory envKey, string memory jsonKey) internal view returns (address) {
        address fromEnv = _envAddressOr(envKey, address(0));
        if (fromEnv != address(0)) return fromEnv;
        return _readDeployment(jsonKey);
    }

    function _writeDeploymentJson(
        address eyesToken,
        address feeCollector,
        address factory,
        address locker,
        address seeder,
        address feeRouter,
        address buyBurnExecutor,
        address dexRouter,
        address weth
    ) internal {
        string memory objectKey = "deployment";
        string memory json = vm.serializeUint(objectKey, "chainId", block.chainid);
        json = vm.serializeAddress(objectKey, "eyesToken", eyesToken);
        json = vm.serializeAddress(objectKey, "feeCollector", feeCollector);
        json = vm.serializeAddress(objectKey, "factory", factory);
        json = vm.serializeAddress(objectKey, "liquidityLocker", locker);
        json = vm.serializeAddress(objectKey, "liquiditySeeder", seeder);
        json = vm.serializeAddress(objectKey, "feeRouter", feeRouter);
        json = vm.serializeAddress(objectKey, "buyBurnExecutor", buyBurnExecutor);
        json = vm.serializeAddress(objectKey, "dexRouter", dexRouter);
        json = vm.serializeAddress(objectKey, "weth", weth);
        json = vm.serializeAddress(objectKey, "treasury", _treasury());
        json = vm.serializeAddress(objectKey, "deployer", msg.sender);
        vm.writeJson(json, DEPLOYMENT_PATH);

        _writeEnvSnippet(
            eyesToken, feeCollector, factory, locker, seeder, feeRouter, buyBurnExecutor
        );
    }

    function _writeEnvSnippet(
        address eyesToken,
        address feeCollector,
        address factory,
        address locker,
        address seeder,
        address feeRouter,
        address buyBurnExecutor
    ) internal {
        string memory snippet = string.concat(
            "# Generated by DeployEyes.s.sol\n",
            "EYES_TOKEN=", vm.toString(eyesToken), "\n",
            "EYES_FEE_COLLECTOR=", vm.toString(feeCollector), "\n",
            "EYES_FACTORY=", vm.toString(factory), "\n",
            "EYES_LIQUIDITY_LOCKER=", vm.toString(locker), "\n",
            "EYES_LIQUIDITY_SEEDER=", vm.toString(seeder), "\n",
            "EYES_FEE_ROUTER=", vm.toString(feeRouter), "\n",
            "EYES_BUY_BURN_EXECUTOR=", vm.toString(buyBurnExecutor), "\n"
        );
        vm.writeFile(ENV_SNIPPET_PATH, snippet);
    }

    function _logDeploymentHeader(string memory title) internal pure {
        console2.log("");
        console2.log("========================================");
        console2.log(title);
        console2.log("========================================");
    }
}
