// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {ERC20} from "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import {ERC20Burnable} from "@openzeppelin/contracts/token/ERC20/extensions/ERC20Burnable.sol";
import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";

import {EyesTypes} from "./EyesTypes.sol";
import {IEyesToken} from "./interfaces/IEyesLaunchpad.sol";

/// @title EyesToken
/// @author Eyes Open ($EYES)
/// @notice Platform token for the Eyes Open fair-launch pad.
///
/// Core rules (platform token):
/// - Fixed supply: 1,000,000,000 $EYES (minted once at deployment).
/// - Trading fees from launched tokens will buy & burn $EYES (handled by EyesFeeCollector).
/// - No further minting after deployment.
/// @dev OWNER (testnet): deployer/treasury EOA. MAINNET: transfer to multisig if admin hooks are added.
contract EyesToken is ERC20, ERC20Burnable, Ownable, IEyesToken {
    /// @notice Deploy $EYES and mint the full supply to `treasury`.
    /// @param treasury Receives the entire 1B supply (team/treasury/liquidity allocation TBD).
    constructor(address treasury) ERC20("Eyes Open", "EYES") Ownable(msg.sender) {
        require(treasury != address(0), "EYES: zero treasury");
        _mint(treasury, EyesTypes.EYES_TOTAL_SUPPLY);
    }

    /// @inheritdoc IEyesToken
    /// @dev Public burn entrypoint for buy-and-burn flows and manual burns.
    function burn(uint256 amount) public override(ERC20Burnable, IEyesToken) {
        super.burn(amount);
    }

    /// @inheritdoc IEyesToken
    function burnFrom(address account, uint256 amount)
        public
        override(ERC20Burnable, IEyesToken)
    {
        super.burnFrom(account, amount);
    }
}
