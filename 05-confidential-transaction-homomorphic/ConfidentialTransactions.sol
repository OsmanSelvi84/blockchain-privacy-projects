// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

/**
 * Confidential Transactions - Pedersen Commitment
 * İşlem miktarlarını gizleyerek doğrulama yapan kontrat
 */
contract ConfidentialTransactions {

    // Her commitment'ı saklayan struct
    struct Commitment {
        uint256 commitValue;  // C = g^amount * h^blinding (mod p) sonucu
        address owner;        // kimin commitment'ı
        bool revealed;        // açıklandı mı?
    }

    // Herkese açık sabit parametreler (Pedersen için)
    uint256 public constant G = 2;    // generator g
    uint256 public constant H = 3;    // blinding generator h  
    uint256 public constant P = 2**31 - 1; // büyük asal sayı (mod için)

    // commitmentları id ile sakla
    mapping(uint256 => Commitment) public commitments;
    uint256 public commitmentCount;

    // Event'ler - işlem olduğunda dışarıya bildirim
    event CommitmentCreated(uint256 id, address owner, uint256 commitValue);
    event CommitmentRevealed(uint256 id, uint256 amount, uint256 blinding);
    event TransferVerified(uint256 fromId, uint256 toId, bool valid);

    // --- FONKSİYONLAR ---

    /**
     * Commit: Miktarı gizleyerek commitment oluştur
     * amount: gizlemek istediğin miktar
     * blinding: rastgele gizlilik sayısı
     */
    function commit(uint256 amount, uint256 blinding) public returns (uint256) {
        // C = (G^amount * H^blinding) mod P
        uint256 gPow = modExp(G, amount, P);
        uint256 hPow = modExp(H, blinding, P);
        uint256 commitValue = mulmod(gPow, hPow, P);

        uint256 id = commitmentCount++;
        commitments[id] = Commitment(commitValue, msg.sender, false);

        emit CommitmentCreated(id, msg.sender, commitValue);
        return id;
    }

    /**
     * Reveal: Commitment'ı aç ve doğrula
     * id: hangi commitment
     * amount: gerçek miktar
     * blinding: kullandığın gizlilik sayısı
     */
    function reveal(uint256 id, uint256 amount, uint256 blinding) public returns (bool) {
        Commitment storage c = commitments[id];
        require(c.owner == msg.sender, "Sadece sahibi acabilir");
        require(!c.revealed, "Zaten acildi");

        // Aynı hesabı yap, eşleşiyor mu bak
        uint256 gPow = modExp(G, amount, P);
        uint256 hPow = modExp(H, blinding, P);
        uint256 check = mulmod(gPow, hPow, P);

        if (check == c.commitValue) {
            c.revealed = true;
            emit CommitmentRevealed(id, amount, blinding);
            return true;
        }
        return false;
    }

    /**
     * Homomorphic toplama doğrulama:
     * C1 * C2 == C3 ise → amount1 + amount2 == amount3 demektir
     * Miktarları açıklamadan toplama doğrulama!
     */
    function verifyTransfer(uint256 fromId, uint256 toId, uint256 changeId) public returns (bool) {
        uint256 c1 = commitments[fromId].commitValue;
        uint256 c2 = commitments[toId].commitValue;
        uint256 c3 = commitments[changeId].commitValue;

        // Homomorphic özellik: C1 * C2 mod P == C3 mu?
        bool valid = mulmod(c1, c2, P) == c3;

        emit TransferVerified(fromId, toId, valid);
        return valid;
    }

    /**
     * Yardımcı fonksiyon: (base^exp) mod modulus
     * Solidity'de büyük sayı üssü almak için gerekli
     */
    function modExp(uint256 base, uint256 exp, uint256 mod) internal pure returns (uint256) {
        uint256 result = 1;
        base = base % mod;
        while (exp > 0) {
            if (exp % 2 == 1) {
                result = mulmod(result, base, mod);
            }
            exp = exp / 2;
            base = mulmod(base, base, mod);
        }
        return result;
    }
}