// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Test} from "forge-std/Test.sol";
import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";

import {EyesToken} from "../src/EyesToken.sol";
import {EyesFeeCollector} from "../src/EyesFeeCollector.sol";
import {EyesLaunchFactory} from "../src/EyesLaunchFactory.sol";
import {EyesLaunchToken} from "../src/EyesLaunchToken.sol";
import {EyesLiquidityLocker} from "../src/liquidity/EyesLiquidityLocker.sol";
import {EyesLiquiditySeeder} from "../src/liquidity/EyesLiquiditySeeder.sol";
import {EyesFeeRouter} from "../src/trading/EyesFeeRouter.sol";
import {EyesBuyBurnExecutor} from "../src/treasury/EyesBuyBurnExecutor.sol";
import {EyesTypes} from "../src/EyesTypes.sol";

import {MockWETH} from "./mocks/MockWETH.sol";
import {MockUniswapV2Factory} from "./mocks/MockUniswapV2.sol";
import {MockUniswapV2Router} from "./mocks/MockUniswapV2Router.sol";

contract EyesStep2Test is Test {
    EyesToken internal eyes;
    EyesFeeCollector internal collector;
    EyesLaunchFactory internal factory;
    EyesLiquidityLocker internal locker;
    EyesLiquiditySeeder internal seeder;
    EyesFeeRouter internal feeRouter;
    EyesBuyBurnExecutor internal executor;

    MockWETH internal weth;
    MockUniswapV2Factory internal dexFactory;
    MockUniswapV2Router internal dexRouter;

    address internal treasury;
    address internal creator;
    address internal trader;

    function setUp() public {
        treasury = makeAddr("treasury");
        creator = makeAddr("creator");
        trader = makeAddr("trader");

        weth = new MockWETH();
        dexFactory = new MockUniswapV2Factory();
        dexRouter = new MockUniswapV2Router(address(dexFactory), address(weth));

        eyes = new EyesToken(treasury);
        collector = new EyesFeeCollector(address(eyes), address(0));
        factory = new EyesLaunchFactory(address(eyes), address(collector));
        collector.setFactory(address(factory));

        locker = new EyesLiquidityLocker();
        seeder = new EyesLiquiditySeeder(address(factory), address(locker), address(dexRouter));
        locker.setSeeder(address(seeder));
        factory.setLiquiditySeeder(address(seeder));

        feeRouter = new EyesFeeRouter(address(factory), address(collector), address(dexRouter));
        collector.setFeeRouter(address(feeRouter), true);
        factory.setFeeRouter(address(feeRouter));

        executor = new EyesBuyBurnExecutor(address(collector), address(eyes), address(dexRouter));
        collector.setBuyBurnExecutor(address(executor));
        dexRouter.setEyesToken(address(eyes));
    }

    function _createLaunch() internal returns (address token, uint256 launchId) {
        (token, launchId) = factory.createLaunch(
            EyesTypes.LaunchConfig({
                name: "Fair Launch",
                symbol: "FAIR",
                creator: creator,
                tokenSupply: 0,
                eyesWindowDuration: 600,
                creatorFeeBps: 0,
                burnFeeBps: 0
            })
        );
    }

    function test_LiquidityLocker_PermanentlyCustodiesLp() public {
        (address token, uint256 launchId) = _createLaunch();

        uint256 tokenAmount = 500_000_000 ether;
        uint256 ethAmount = 10 ether;

        vm.deal(creator, ethAmount);
        vm.prank(creator);
        (address pair, uint256 lpAmount) =
            factory.seedLiquidity{value: ethAmount}(launchId, tokenAmount, tokenAmount, ethAmount);

        assertTrue(pair != address(0));
        assertEq(lpAmount, tokenAmount + ethAmount);
        assertEq(IERC20(pair).balanceOf(address(locker)), lpAmount);
        assertEq(locker.lockedBalance(launchId), lpAmount);

        EyesTypes.LaunchInfo memory info = factory.getLaunch(launchId);
        assertTrue(info.liquidityLocked);
        assertEq(info.pair, pair);
        assertTrue(EyesLaunchToken(token).approvedBuySources(pair));

        // Buys from pair -> trader must succeed during Eyes Window.
        address buyer = makeAddr("buyer");
        vm.prank(pair);
        EyesLaunchToken(token).transfer(buyer, 100 ether);
        assertEq(EyesLaunchToken(token).balanceOf(buyer), 100 ether);
    }

    function test_FeeRouter_SendsFeesToCollectorOnBuy() public {
        (address token, uint256 launchId) = _createLaunch();

        vm.deal(creator, 20 ether);
        vm.prank(creator);
        factory.seedLiquidity{value: 10 ether}(launchId, 500_000_000 ether, 1, 1);

        uint256 swapEth = 1 ether;
        uint256 fee = (swapEth * EyesTypes.DEFAULT_TOTAL_FEE_BPS) / EyesTypes.BPS;
        uint256 creatorBalBefore = creator.balance;

        vm.deal(trader, swapEth);
        vm.prank(trader);
        feeRouter.swapExactETHForLaunchTokens{value: swapEth}(token, 1, trader, block.timestamp + 1 hours);

        assertEq(creator.balance - creatorBalBefore, (fee * 5000) / EyesTypes.BPS);
        assertEq(collector.accumulatedBurnProceeds(), (fee * 5000) / EyesTypes.BPS);
    }

    function test_BuyBurnExecutor_SwapsAndBurnsEyes() public {
        (address token, uint256 launchId) = _createLaunch();

        vm.deal(creator, 20 ether);
        vm.prank(creator);
        factory.seedLiquidity{value: 10 ether}(launchId, 500_000_000 ether, 1, 1);

        vm.deal(trader, 2 ether);
        vm.prank(trader);
        feeRouter.swapExactETHForLaunchTokens{value: 1 ether}(token, 1, trader, block.timestamp + 1 hours);

        vm.prank(treasury);
        IERC20(address(eyes)).transfer(address(dexRouter), 10_000_000 ether);

        uint256 supplyBefore = eyes.totalSupply();
        uint256 burnQueued = collector.accumulatedBurnProceeds();
        assertGt(burnQueued, 0);

        executor.executeBuyAndBurn(1);
        assertLt(eyes.totalSupply(), supplyBefore);
        assertEq(collector.accumulatedBurnProceeds(), 0);
        assertGt(executor.totalEyesBurned(), 0);
    }
}
