// SPDX-License-Identifier: MIT
pragma solidity ^0.8.29;

import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {SafeERC20} from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";

/**
 * @title ArcadeMusdFloat
 * @notice On-chain float that holds the MUSD users pay in exchange for
 * WritersArcade credits.
 *
 * Top-ups are plain `MUSD.transfer(vault, amount)` calls; the backend verifies
 * the Transfer event (recipient + calldata + sender binding) and grants
 * credits idempotently by tx hash, exactly as it did when the treasury was an
 * EOA. What changes is where the money rests: the prepaid-credit float sits in
 * a contract — publicly auditable on the explorer — instead of a wallet.
 *
 * The owner can `sweepMusd` to the platform treasury, or into Mezo's MUSD
 * savings vault once yield routing ships (float yield funds free plays).
 */
contract ArcadeMusdFloat is Ownable {
    using SafeERC20 for IERC20;

    /// @notice The MUSD token this float holds.
    IERC20 public immutable musd;

    event Swept(address indexed to, uint256 amount);
    event TokenRescued(address indexed token, address indexed to, uint256 amount);

    constructor(address _musd, address initialOwner) Ownable(initialOwner) {
        require(_musd != address(0), "ArcadeMusdFloat: zero MUSD");
        musd = IERC20(_musd);
    }

    /// @notice MUSD currently held as the credit-economy float.
    function floatBalance() external view returns (uint256) {
        return musd.balanceOf(address(this));
    }

    /// @notice Move MUSD out of the float (treasury, or the MUSD savings vault).
    function sweepMusd(address to, uint256 amount) external onlyOwner {
        require(to != address(0), "ArcadeMusdFloat: zero to");
        musd.safeTransfer(to, amount);
        emit Swept(to, amount);
    }

    /// @notice Rescue any non-MUSD token sent here by mistake.
    function rescueToken(IERC20 token, address to, uint256 amount) external onlyOwner {
        require(address(token) != address(musd), "ArcadeMusdFloat: use sweepMusd");
        token.safeTransfer(to, amount);
        emit TokenRescued(address(token), to, amount);
    }
}
