// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Script, console2} from "forge-std/Script.sol";
import {stdJson} from "forge-std/StdJson.sol";
import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";

import {EyesBuyBurnExecutor} from "../src/treasury/EyesBuyBurnExecutor.sol";
import {IUniswapV2Factory} from "../src/dex/interfaces/IUniswapV2.sol";
import {IUniswapV2Router02} from "../src/dex/interfaces/IUniswapV2.sol";
import {MockUniswapV2Router} from "../test/mocks/MockUniswapV2Router.sol";

import {BaseSepoliaConfig} from "./config/BaseSepoliaConfig.sol";
import {BaseMainnetConfig} from "./config/BaseMainnetConfig.sol";
import {EthereumMainnetConfig} from "./config/EthereumMainnetConfig.sol";
import {LocalAnvilConfig} from "./config/LocalAnvilConfig.sol";

/// @title EyesScriptBase
/// @notice Shared helpers, pre-flight checks, and deployment I/O for Eyes Open scripts.
abstract contract EyesScriptBase is Script {
    using stdJson for string;

    function _deploymentPath() internal view returns (string memory) {
        try vm.envString("EYES_DEPLOYMENT_PATH") returns (string memory path) {
            return path;
        } catch {
            return "deployments/base-sepolia.json";
        }
    }

    function _envSnippetPath() internal view returns (string memory) {
        try vm.envString("EYES_ENV_SNIPPET_PATH") returns (string memory path) {
            return path;
        } catch {
            return "deployments/base-sepolia.env";
        }
    }

    function _isLocalAnvil() internal view returns (bool) {
        return block.chainid == LocalAnvilConfig.CHAIN_ID;
    }

    function _enforceSupportedChain() internal view {
        if (block.chainid == BaseSepoliaConfig.CHAIN_ID) {
            _requireChain(BaseSepoliaConfig.CHAIN_ID);
            return;
        }
        if (block.chainid == BaseMainnetConfig.CHAIN_ID) {
            _requireChain(BaseMainnetConfig.CHAIN_ID);
            return;
        }
        if (block.chainid == EthereumMainnetConfig.CHAIN_ID) {
            _requireChain(EthereumMainnetConfig.CHAIN_ID);
            return;
        }
        if (_isLocalAnvil()) return;
        revert PreflightFailed(
            string.concat("Unsupported chain id ", vm.toString(block.chainid))
        );
    }

    error PreflightFailed(string reason);

    function _dexRouter() internal view returns (address) {
        if (block.chainid == EthereumMainnetConfig.CHAIN_ID) {
            return _envAddressOr("UNISWAP_V2_ROUTER", EthereumMainnetConfig.UNISWAP_V2_ROUTER);
        }
        if (block.chainid == BaseMainnetConfig.CHAIN_ID) {
            return _envAddressOr("UNISWAP_V2_ROUTER", BaseMainnetConfig.UNISWAP_V2_ROUTER);
        }
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

    /// @dev Token-only deploy — no DEX router required (no LP seed).
    function _preflightBroadcastTokenOnly(string memory step, uint256 minBalanceWei) internal view {
        console2.log("[preflight]", step);
        console2.log("  chainId", block.chainid);
        console2.log("  broadcaster", msg.sender);
        console2.log("  balanceWei", msg.sender.balance);
        if (msg.sender.balance < minBalanceWei) {
            revert PreflightFailed(
                string.concat(
                    "Broadcaster balance too low (need ",
                    vm.toString(minBalanceWei / 1 gwei),
                    " gwei minimum). Fund wallet on Base mainnet."
                )
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
            string memory fundHint = _isLocalAnvil()
                ? "Start Anvil with prefunded accounts (see scripts/start-anvil.ps1)"
                : "Fund wallet or use local Anvil test path (docs/LOCAL_ANVIL_TEST.md)";
            revert PreflightFailed(
                string.concat(
                    "Broadcaster balance too low (need ",
                    vm.toString(minBalanceWei / 1 gwei),
                    " gwei minimum). ",
                    fundHint
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
        string memory path = _deploymentPath();
        if (!vm.exists(path)) {
            revert PreflightFailed(
                string.concat("Missing ", path, " - run DeployEyes first")
            );
        }
    }

    function _readDeployment(string memory jsonKey) internal view returns (address) {
        _requireDeploymentFile();
        string memory json = vm.readFile(_deploymentPath());
        return json.readAddress(string.concat(".", jsonKey));
    }

    function _requireContract(address addr, string memory label) internal view {
        if (addr.code.length == 0) {
            revert PreflightFailed(
                string.concat(
                    label,
                    " has no bytecode at ",
                    vm.toString(addr),
                    ". Anvil chain was reset or deploy is stale. Run: .\\scripts\\deploy-anvil.ps1 -Step refresh"
                )
            );
        }
    }

    /// @dev Ensures deployments/anvil.json addresses still exist on-chain (Anvil restarts wipe state).
    function _preflightAnvilDeployment() internal view {
        _requireDeploymentFile();
        if (!_isLocalAnvil()) return;

        _requireContract(_readDeployment("factory"), "factory");
        _requireContract(_readDeployment("feeCollector"), "feeCollector");
        _requireContract(_readDeployment("buyBurnExecutor"), "buyBurnExecutor");
        _requireContract(_readDeployment("liquidityLocker"), "liquidityLocker");
        _requireContract(_readDeployment("eyesToken"), "eyesToken");
        _requireContract(_readDeployment("dexRouter"), "dexRouter");
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
        string memory json = vm.serializeBool(objectKey, "tokenOnly", false);
        json = vm.serializeUint(objectKey, "chainId", block.chainid);
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
        vm.writeJson(json, _deploymentPath());

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
        vm.writeFile(_envSnippetPath(), snippet);
    }

    /// @dev Token-only mainnet deploy — no factory/router/LP addresses.
    function _writeTokenOnlyDeploymentJson(address eyesToken, address treasury) internal {
        string memory objectKey = "deployment";
        string memory json = vm.serializeUint(objectKey, "chainId", block.chainid);
        json = vm.serializeBool(objectKey, "tokenOnly", true);
        json = vm.serializeAddress(objectKey, "eyesToken", eyesToken);
        json = vm.serializeAddress(objectKey, "treasury", treasury);
        json = vm.serializeAddress(objectKey, "deployer", msg.sender);
        vm.writeJson(json, _deploymentPath());

        string memory snippet = string.concat(
            "# Generated by DeployEyesTokenOnly.s.sol (no LP - presale send only)\n",
            "EYES_TOKEN=", vm.toString(eyesToken), "\n",
            "NEXT_PUBLIC_EYES_TOKEN_ADDRESS=", vm.toString(eyesToken), "\n",
            "EYES_TOKEN_ADDRESS=", vm.toString(eyesToken), "\n",
            "EYES_TREASURY=", vm.toString(treasury), "\n"
        );
        vm.writeFile(_envSnippetPath(), snippet);
    }

    function _logDeploymentHeader(string memory title) internal pure {
        console2.log("");
        console2.log("========================================");
        console2.log(title);
        console2.log("========================================");
    }

    /// @dev Anvil-only: wire mock router for $EYES buy & burn (pair + floats + setEyesToken).
    /// Uses the executor's immutable dexRouter/eyesToken so setup matches the swap path.
    function _prepareAnvilBuyBurn(address buyBurnExecutor) internal {
        if (!_isLocalAnvil()) return;

        EyesBuyBurnExecutor executor = EyesBuyBurnExecutor(payable(buyBurnExecutor));
        address dexRouter = address(executor.dexRouter());
        address eyesToken = address(executor.eyesToken());

        address envRouter = _dexRouter();
        if (envRouter != dexRouter) {
            console2.log("WARN envRouter != executorRouter");
            console2.log("  envRouter", envRouter);
            console2.log("  executorRouter", dexRouter);
            console2.log("  hint: rerun -Step deploy after -Step dex");
        }

        MockUniswapV2Router router = MockUniswapV2Router(payable(dexRouter));
        router.setEyesToken(eyesToken);
        executor.setMinProceedsEth(1);

        address weth = router.WETH();
        address factory = router.factory();
        uint256 lpEyes = _envUintOr("EYES_LP_TOKEN_AMOUNT", 1_000_000 ether);
        uint256 lpEth = _envUintOr("EYES_LP_ETH_AMOUNT", 0.01 ether);
        uint256 routerFloat = _envUintOr("LOCAL_DEX_EYES_FLOAT", 10_000_000 ether);
        uint256 pairFloat = _envUintOr("LOCAL_PAIR_EYES_FLOAT", 5_000_000 ether);

        address pair = IUniswapV2Factory(factory).getPair(eyesToken, weth);
        if (pair == address(0)) {
            IERC20(eyesToken).approve(dexRouter, lpEyes);
            IUniswapV2Router02(dexRouter).addLiquidityETH{value: lpEth}(
                eyesToken, lpEyes, lpEyes, lpEth, msg.sender, block.timestamp + 30 minutes
            );
            pair = IUniswapV2Factory(factory).getPair(eyesToken, weth);
        }

        if (pair != address(0)) {
            uint256 pairBal = IERC20(eyesToken).balanceOf(pair);
            if (pairBal < pairFloat) {
                IERC20(eyesToken).transfer(pair, pairFloat - pairBal);
            }
        }

        uint256 routerBal = IERC20(eyesToken).balanceOf(dexRouter);
        if (routerBal < routerFloat) {
            IERC20(eyesToken).transfer(dexRouter, routerFloat - routerBal);
        }

        console2.log("anvilExecutorRouter", dexRouter);
        console2.log("anvilBuyBurnPair", pair);
        console2.log("anvilRouterEyes", IERC20(eyesToken).balanceOf(dexRouter));
    }
}
