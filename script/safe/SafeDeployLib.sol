// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {SafeAddresses} from "./SafeAddresses.sol";

interface ISafeProxyFactory {
    function createProxyWithNonce(
        address singleton,
        bytes memory initializer,
        uint256 saltNonce
    ) external returns (address proxy);

    function proxyCreationCode() external pure returns (bytes memory);
}

interface ISafeSetup {
    function setup(
        address[] calldata owners,
        uint256 threshold,
        address to,
        bytes calldata data,
        address fallbackHandler,
        address paymentToken,
        uint256 payment,
        address payable paymentReceiver
    ) external;
}

library SafeDeployLib {
    function sortOwners(address[] memory owners) internal pure returns (address[] memory) {
        uint256 n = owners.length;
        for (uint256 i = 0; i < n; i++) {
            for (uint256 j = i + 1; j < n; j++) {
                if (uint160(owners[i]) > uint160(owners[j])) {
                    (owners[i], owners[j]) = (owners[j], owners[i]);
                }
            }
        }
        return owners;
    }

    function encodeSetup(
        address[] memory owners,
        uint256 threshold,
        address fallbackHandler
    ) internal pure returns (bytes memory) {
        address[] memory sorted = sortOwners(owners);
        return abi.encodeWithSelector(
            ISafeSetup.setup.selector,
            sorted,
            threshold,
            address(0),
            bytes(""),
            fallbackHandler,
            address(0),
            0,
            payable(address(0))
        );
    }

    function predictAddress(
        address singleton,
        bytes memory initializer,
        uint256 saltNonce
    ) internal view returns (address) {
        ISafeProxyFactory factory = ISafeProxyFactory(SafeAddresses.PROXY_FACTORY);
        bytes memory deploymentData =
            abi.encodePacked(factory.proxyCreationCode(), uint256(uint160(singleton)));
        bytes32 salt = keccak256(abi.encodePacked(keccak256(initializer), saltNonce));
        bytes32 bytecodeHash = keccak256(deploymentData);
        return address(
            uint160(
                uint256(
                    keccak256(
                        abi.encodePacked(bytes1(0xff), SafeAddresses.PROXY_FACTORY, salt, bytecodeHash)
                    )
                )
            )
        );
    }

    function deploy(
        address singleton,
        bytes memory initializer,
        uint256 saltNonce
    ) internal returns (address safe) {
        safe = ISafeProxyFactory(SafeAddresses.PROXY_FACTORY)
            .createProxyWithNonce(singleton, initializer, saltNonce);
    }
}
