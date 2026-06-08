// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "forge-std/Test.sol";
import "../src/PostQuantumToken.sol";

contract PostQuantumTokenTest is Test {
    PostQuantumToken token;

    address ahmet = address(0x1111);
    address murat = address(0x2222);

    ///  Bundle of Lamport key material for a single key generation.
    struct Keys {
        bytes32[256] sk0;
        bytes32[256] sk1;
        bytes32[256] pk0;
        bytes32[256] pk1;
    }

    function setUp() public {
        token = new PostQuantumToken();
    }

    // --- Lamport helpers (test-only) ---

    function _genKeys(string memory seed) internal pure returns (Keys memory k) {
        for (uint256 i = 0; i < 256; i++) {
            k.sk0[i] = sha256(abi.encodePacked(seed, "/0/", i));
            k.sk1[i] = sha256(abi.encodePacked(seed, "/1/", i));
        }
        for (uint256 i = 0; i < 256; i++) {
            k.pk0[i] = sha256(abi.encodePacked(k.sk0[i]));
            k.pk1[i] = sha256(abi.encodePacked(k.sk1[i]));
        }
    }

    function _commit(Keys memory k) internal pure returns (bytes32) {
        return keccak256(abi.encodePacked(k.pk0, k.pk1));
    }

    function _sign(bytes32 msgHash, Keys memory k)
        internal
        pure
        returns (bytes32[256] memory sig)
    {
        uint256 h = uint256(msgHash);
        for (uint256 i = 0; i < 256; i++) {
            uint256 bit = (h >> i) & 1;
            sig[i] = bit == 0 ? k.sk0[i] : k.sk1[i];
        }
    }

    function _msgHash(
        address from,
        address to,
        uint256 amount,
        uint256 senderNonce,
        bytes32 nextCommit
    ) internal pure returns (bytes32) {
        return sha256(abi.encodePacked(from, to, amount, senderNonce, nextCommit));
    }

    // --- Tests ---

    function test_Register() public {
        Keys memory k = _genKeys("ahmet");
        bytes32 commit = _commit(k);

        vm.prank(ahmet);
        token.register(commit, 1000);

        assertEq(token.balanceOf(ahmet), 1000);
        assertEq(token.publicKeyCommitment(ahmet), commit);
        assertEq(token.nonce(ahmet), 0);
    }

    function test_TransferValid() public {
        Keys memory k = _genKeys("ahmet");
        Keys memory next = _genKeys("ahmet-next");
        vm.prank(ahmet);
        token.register(_commit(k), 1000);

        bytes32 nextCommit = _commit(next);
        bytes32 hash = _msgHash(ahmet, murat, 100, 0, nextCommit);
        bytes32[256] memory sig = _sign(hash, k);

        vm.prank(ahmet);
        token.transfer(murat, 100, nextCommit, k.pk0, k.pk1, sig);

        assertEq(token.balanceOf(ahmet), 900);
        assertEq(token.balanceOf(murat), 100);
        assertEq(token.publicKeyCommitment(ahmet), nextCommit);
        assertEq(token.nonce(ahmet), 1);
    }

    function test_TransferInvalidSignature() public {
        Keys memory k = _genKeys("ahmet");
        Keys memory next = _genKeys("ahmet-next");
        vm.prank(ahmet);
        token.register(_commit(k), 1000);

        bytes32 nextCommit = _commit(next);
        bytes32 hash = _msgHash(ahmet, murat, 100, 0, nextCommit);
        bytes32[256] memory sig = _sign(hash, k);
        sig[0] = bytes32(uint256(0xDEADBEEF)); // tamper

        vm.prank(ahmet);
        vm.expectRevert("Invalid Lamport signature");
        token.transfer(murat, 100, nextCommit, k.pk0, k.pk1, sig);
    }

    function test_TransferInsufficientBalance() public {
        Keys memory k = _genKeys("ahmet");
        Keys memory next = _genKeys("ahmet-next");
        vm.prank(ahmet);
        token.register(_commit(k), 50);

        bytes32 nextCommit = _commit(next);
        bytes32 hash = _msgHash(ahmet, murat, 100, 0, nextCommit);
        bytes32[256] memory sig = _sign(hash, k);

        vm.prank(ahmet);
        vm.expectRevert("Insufficient balance");
        token.transfer(murat, 100, nextCommit, k.pk0, k.pk1, sig);
    }

    function test_ReplayAfterRotationFails() public {
        Keys memory k = _genKeys("ahmet");
        Keys memory next = _genKeys("ahmet-next");
        vm.prank(ahmet);
        token.register(_commit(k), 1000);

        bytes32 nextCommit = _commit(next);
        bytes32 hash = _msgHash(ahmet, murat, 100, 0, nextCommit);
        bytes32[256] memory sig = _sign(hash, k);

        vm.prank(ahmet);
        token.transfer(murat, 100, nextCommit, k.pk0, k.pk1, sig);

        // Replay attempt with the (now-rotated) old key must fail.
        vm.prank(ahmet);
        vm.expectRevert("Public key mismatch");
        token.transfer(murat, 100, nextCommit, k.pk0, k.pk1, sig);
    }

    //   AMOUNT=250 TAMPER=0 forge test --match-test test_Custom -vvv
    // Inputs:
    //   SENDER_BALANCE - ahmet's starting balance (default 1000)
    //   AMOUNT         - amount ahmet sends to murat (default 100)
    //   TAMPER         - 1 = corrupt the signature, 0 = valid (default 0)
    function test_Custom() public {
        uint256 senderBalance = vm.envOr("SENDER_BALANCE", uint256(1000));
        uint256 amount = vm.envOr("AMOUNT", uint256(100));
        uint256 tamper = vm.envOr("TAMPER", uint256(0));

        Keys memory k = _genKeys("ahmet");
        Keys memory next = _genKeys("ahmet-next");

        vm.prank(ahmet);
        token.register(_commit(k), senderBalance);

        bytes32 nextCommit = _commit(next);
        bytes32 hash = _msgHash(ahmet, murat, amount, 0, nextCommit);
        bytes32[256] memory sig = _sign(hash, k);
        if (tamper == 1) {
            sig[0] = bytes32(uint256(0xDEADBEEF));
        }

        console.log("--- custom input ---");
        console.log("sender balance:", senderBalance);
        console.log("amount:", amount);
        console.log("tampered (1=yes):", tamper);

        vm.prank(ahmet);
        try token.transfer(murat, amount, nextCommit, k.pk0, k.pk1, sig) {
            console.log("RESULT: transfer SUCCEEDED");
            console.log("ahmet balance:", token.balanceOf(ahmet));
            console.log("murat balance:", token.balanceOf(murat));
        } catch Error(string memory reason) {
            console.log("RESULT: reverted ->", reason);
        } catch {
            console.log("RESULT: reverted (no reason string)");
        }
    }
}
