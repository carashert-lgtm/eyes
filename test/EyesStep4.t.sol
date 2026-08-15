// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Test} from "forge-std/Test.sol";

import {EyesLaunchFactory} from "../src/EyesLaunchFactory.sol";
import {EyesBuyBurnExecutor} from "../src/treasury/EyesBuyBurnExecutor.sol";
import {IEyesKeeper} from "../src/interfaces/IEyesKeeper.sol";
import {EyesTypes} from "../src/EyesTypes.sol";

import {EyesStep2Test} from "./EyesStep2.t.sol";

contract EyesStep4Test is EyesStep2Test {
    function test_LaunchPolicy_DisableLaunches() public {
        factory.setLaunchesEnabled(false);

        vm.expectRevert(EyesLaunchFactory.LaunchesDisabled.selector);
        factory.createLaunch(
            EyesTypes.LaunchConfig({
                name: "Blocked",
                symbol: "BLK",
                creator: creator,
                tokenSupply: 0,
                eyesWindowDuration: 600,
                creatorFeeBps: 0,
                burnFeeBps: 0
            })
        );
    }

    function test_LaunchPolicy_Whitelist() public {
        factory.setLauncherWhitelistEnabled(true);
        factory.setLauncherApproved(creator, true);

        vm.prank(creator);
        (, uint256 launchId) = factory.createLaunch(
            EyesTypes.LaunchConfig({
                name: "Allowed",
                symbol: "OK",
                creator: creator,
                tokenSupply: 0,
                eyesWindowDuration: 600,
                creatorFeeBps: 0,
                burnFeeBps: 0
            })
        );
        assertEq(launchId, 1);

        address stranger = makeAddr("stranger");
        vm.prank(stranger);
        vm.expectRevert(EyesLaunchFactory.LauncherNotApproved.selector);
        factory.createLaunch(
            EyesTypes.LaunchConfig({
                name: "Nope",
                symbol: "NO",
                creator: stranger,
                tokenSupply: 0,
                eyesWindowDuration: 600,
                creatorFeeBps: 0,
                burnFeeBps: 0
            })
        );
    }

    function test_Keeper_AutoBuyAndBurn() public {
        _createLaunch();

        vm.deal(address(feeRouter), 0.5 ether);
        vm.prank(address(feeRouter));
        collector.distributeFees{value: 0.5 ether}(1, creator);

        vm.prank(treasury);
        eyes.transfer(address(dexRouter), 5_000_000 ether);

        IEyesKeeper.BurnQueueStatus memory before = executor.burnQueueStatus();
        assertTrue(before.ready);

        uint256 supplyBefore = eyes.totalSupply();
        executor.executeBuyAndBurnAuto();
        assertLt(eyes.totalSupply(), supplyBefore);
        assertEq(collector.accumulatedBurnProceeds(), 0);
    }

    function test_Keeper_SkipsBelowThreshold() public {
        _createLaunch();
        executor.setMinProceedsEth(1 ether);

        vm.deal(address(feeRouter), 0.1 ether);
        vm.prank(address(feeRouter));
        collector.distributeFees{value: 0.1 ether}(1, creator);

        vm.expectRevert(EyesBuyBurnExecutor.BelowMinProceeds.selector);
        executor.executeBuyAndBurnAuto();
    }
}
