// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "forge-std/Test.sol";
import "../src/SocialRecoveryWallet.sol";

contract WalletTest is Test {
    SocialRecoveryWallet wallet;

    address wallet_owner = address(0x1);
    address guardian_a = address(0x2);
    address guardian_b = address(0x3);
    address guardian_c = address(0x4);
    address next_owner = address(0x5);

    function setUp() public {
        address[3] memory liste = [guardian_a, guardian_b, guardian_c];
        vm.prank(wallet_owner);
        wallet = new SocialRecoveryWallet(liste);
    }

    function test_owner() public {
        assertEq(wallet.owner(), wallet_owner);
    }

    function test_start_recovery() public {
        vm.prank(guardian_a);
        wallet.start_recovery(next_owner);
        assertTrue(wallet.recovery_cond());
        assertEq(wallet.candidate_owner(), next_owner);
        assertEq(wallet.vote_count(), 1);
    }

    function test_change_owner() public {
        vm.prank(guardian_a);
        wallet.start_recovery(next_owner);
        vm.prank(guardian_b);
        wallet.cast_vote();
        assertEq(wallet.owner(), next_owner);
        assertFalse(wallet.recovery_cond());
    }

    function test_cancel_recovery() public {
        vm.prank(guardian_a);
        wallet.start_recovery(next_owner);
        vm.prank(wallet_owner);
        wallet.cancel_recovery();
        assertFalse(wallet.recovery_cond());
        assertEq(wallet.candidate_owner(), address(0));
        assertEq(wallet.vote_count(), 0);
    }

    function test_non_guardian() public {
        address random_user = address(0x9);
        vm.prank(random_user);
        vm.expectRevert(bytes("Guardian degilsiniz"));
        wallet.start_recovery(next_owner);
    }

    function test_double_vote() public {
        vm.prank(guardian_a);
        wallet.start_recovery(next_owner);
        vm.prank(guardian_a);
        vm.expectRevert(bytes("Zaten oy kullandiniz"));
        wallet.cast_vote();
    }
}
