// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Test} from "forge-std/Test.sol";

import {EyesToken} from "../src/EyesToken.sol";
import {EyesFeeCollector} from "../src/EyesFeeCollector.sol";
import {EyesLaunchFactory} from "../src/EyesLaunchFactory.sol";
import {EyesLaunchToken} from "../src/EyesLaunchToken.sol";
import {EyesTypes} from "../src/EyesTypes.sol";

contract EyesLaunchpadTest is Test {
    EyesToken internal eyes;
    EyesFeeCollector internal collector;
    EyesLaunchFactory internal factory;

    address internal treasury;
    address internal creator;

    function setUp() public {
        treasury = makeAddr("treasury");
        creator = makeAddr("creator");
        eyes = new EyesToken(treasury);
        collector = new EyesFeeCollector(address(eyes), address(0));
        factory = new EyesLaunchFactory(address(eyes), address(collector));
        collector.setFactory(address(factory));
    }

    function test_EyesToken_MintsOneBillionSupply() public view {
        assertEq(eyes.totalSupply(), EyesTypes.EYES_TOTAL_SUPPLY);
        assertEq(eyes.balanceOf(treasury), EyesTypes.EYES_TOTAL_SUPPLY);
        assertEq(eyes.symbol(), "EYES");
    }

    function test_Factory_CreatesLaunchWithEyesWindow() public {
        vm.warp(1_700_000_000);

        vm.prank(creator);
        (address token, uint256 launchId) = factory.createLaunch(
            EyesTypes.LaunchConfig({
                name: "Test Fair",
                symbol: "FAIR",
                creator: creator,
                tokenSupply: 0,
                eyesWindowDuration: 600,
                creatorFeeBps: 0,
                burnFeeBps: 0
            })
        );

        assertEq(launchId, 1);
        assertEq(factory.launchCount(), 1);

        EyesTypes.LaunchInfo memory info = factory.getLaunch(launchId);
        assertEq(info.token, token);
        assertEq(info.creator, creator);
        assertEq(uint8(info.phase), uint8(EyesTypes.LaunchPhase.EyesWindow));
        assertFalse(info.liquidityLocked);

        EyesLaunchToken launchToken = EyesLaunchToken(token);
        assertEq(launchToken.totalSupply(), EyesTypes.DEFAULT_LAUNCH_SUPPLY);
        assertEq(uint8(launchToken.phase()), uint8(EyesTypes.LaunchPhase.EyesWindow));
    }

    function test_FeeCollector_SplitsFees() public {
        vm.deal(address(this), 1 ether);

        EyesTypes.FeeConfig memory config = EyesTypes.FeeConfig({
            creatorBps: EyesTypes.DEFAULT_CREATOR_FEE_BPS,
            burnBps: EyesTypes.DEFAULT_BURN_FEE_BPS,
            protocolBps: EyesTypes.DEFAULT_PROTOCOL_FEE_BPS
        });

        vm.prank(address(factory));
        collector.setLaunchFeeConfig(1, config);

        collector.setFeeRouter(address(this), true);

        uint256 creatorBefore = creator.balance;
        collector.distributeFees{value: 1 ether}(1, creator);

        assertEq(creator.balance - creatorBefore, 0.5 ether);
        assertEq(collector.accumulatedBurnProceeds(), 0.5 ether);
    }
}
