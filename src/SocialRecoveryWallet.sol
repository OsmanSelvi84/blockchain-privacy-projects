// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

contract SocialRecoveryWallet {

    address public owner;

    uint256 public constant TOTAL_GUARDIANS = 3;
    uint256 public constant MIN_APPROVALS = 2;

    // guardian adresleri hash'lenerek saklanır, kimlikler gizli tutulur
    bytes32[3] public guardian_hashes;
    mapping(bytes32 => bool) public isguardian;
    mapping(bytes32 => bool) public voted;

    bool public recovery_cond;
    address public candidate_owner;
    uint256 public vote_count;

    event recovery_started(address by, address candidate);
    event vote_cast(address by, uint256 total_votes);
    event recovery_cancelled();
    event owner_updated(address old_owner, address new_owner);
    event money_sent(address receiver, uint256 amount);

    modifier only_owner() {
        require(msg.sender == owner, "Erisim reddedildi");
        _;
    }

    modifier only_guardian() {
        bytes32 h = keccak256(abi.encodePacked(msg.sender));
        require(isguardian[h], "Guardian degilsiniz");
        _;
    }

    constructor(address[3] memory _guardians) {
        owner = msg.sender;

        for (uint256 i = 0; i < TOTAL_GUARDIANS; i++) {
            require(_guardians[i] != address(0), "Gecersiz adres");
            require(_guardians[i] != owner, "Owner guardian olamaz");

            bytes32 h = keccak256(abi.encodePacked(_guardians[i]));
            require(!isguardian[h], "Ayni guardian iki kez eklenemez");

            guardian_hashes[i] = h;
            isguardian[h] = true;
        }
    }

    // owner cüzdandan para gönderir
    function send_money(
        address receiver,
        uint256 amount,
        bytes calldata data
    ) external only_owner returns (bytes memory) {
        require(receiver != address(0), "Gecersiz hedef");

        (bool success, bytes memory result) = receiver.call{value: amount}(data);
        require(success, "Islem basarisiz");

        emit money_sent(receiver, amount);
        return result;
    }

    // guardian recovery başlatır
    function start_recovery(address _candidate) external only_guardian {
        require(!recovery_cond, "Recovery zaten aktif");
        require(_candidate != address(0), "Gecersiz aday");
        require(_candidate != owner, "Bu kisi zaten owner");

        bytes32 h = keccak256(abi.encodePacked(msg.sender));
        require(!voted[h], "Zaten oy kullandiniz");

        recovery_cond = true;
        candidate_owner = _candidate;
        vote_count = 1;
        voted[h] = true;

        emit recovery_started(msg.sender, _candidate);
    }

    // diğer guardianlar oylama yapar, 2 oy dolunca owner değişir
    function cast_vote() external only_guardian {
        require(recovery_cond, "Aktif recovery yok");

        bytes32 h = keccak256(abi.encodePacked(msg.sender));
        require(!voted[h], "Zaten oy kullandiniz");

        voted[h] = true;
        vote_count++;

        emit vote_cast(msg.sender, vote_count);

        if (vote_count >= MIN_APPROVALS) {
            address old_owner = owner;
            owner = candidate_owner;
            _clear_recovery();
            emit owner_updated(old_owner, owner);
        }
    }

    // owner hala erişebiliyorsa recovery iptal eder
    function cancel_recovery() external only_owner {
        require(recovery_cond, "Aktif recovery yok");
        _clear_recovery();
        emit recovery_cancelled();
    }

    function _clear_recovery() internal {
        recovery_cond = false;
        candidate_owner = address(0);
        vote_count = 0;

        for (uint256 i = 0; i < TOTAL_GUARDIANS; i++) {
            voted[guardian_hashes[i]] = false;
        }
    }

    receive() external payable {}
}
