// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/**
 * @title ConsentManager
 * @notice eHealth Dynamic Consent - Hasta odakli, geri cekilebilir, zaman/tip/amac bazli onay sistemi.
 * @dev GDPR "right to withdraw" prensibini blockchain uzerinde uygular.
 *      Tum onay degisiklikleri event olarak yayinlandigi icin tamamlanmis bir audit trail saglar.
 *
 * Tasarim notlari:
 * - Hasta ve arastirmaci ayrı kayit fonksiyonlarına sahip (registerPatient / registerResearcher)
 * - Onaylar uc parametreli anahtarda saklaniyor: hasta -> arastirmaci -> (veriTipi+amac)
 * - Sure (expiry) blockchain zaman damgasi (block.timestamp) ile dogrulaniyor
 * - Custom error'lar gas-verimliligi icin string require yerine tercih edildi (0.8.4+)
 */
contract ConsentManager {

    // ============================================================
    //                         TIPLER
    // ============================================================

    /// @notice Saglik verisi tipleri - her tip icin ayri onay verilebilir
    enum DataType {
        BloodTest,      // 0 - Kan tahlili
        Xray,           // 1 - Rontgen
        Genetic,        // 2 - Genetik test
        MRI,            // 3 - MR taramasi
        Prescription    // 4 - Recete bilgisi
    }

    /// @notice Onay verilen amaclar - ayni veri farkli amaclarla farkli onayli olabilir
    enum Purpose {
        Treatment,      // 0 - Tedavi
        Research,       // 1 - Bilimsel arastirma
        Insurance,      // 2 - Sigorta degerlendirmesi
        Statistical     // 3 - Anonim istatistiksel calisma
    }

    /// @notice Tek bir onay kaydinin tum verisi
    struct Consent {
        bool active;            // Aktif mi (revoke edilmedi mi)
        uint256 grantedAt;      // Verilis zaman damgasi
        uint256 expiry;         // Bitis zaman damgasi (0 = sinirsiz)
        Purpose purpose;        // Hangi amac icin
        uint256 revokedAt;      // Geri cekildiyse ne zaman (0 = geri cekilmedi)
    }

    /// @notice Hasta profili - sadece kayit durumu ve zaman
    struct Patient {
        bool registered;
        uint256 registeredAt;
    }

    /// @notice Arastirmaci profili - kim oldugu serce belli olmali (denetim icin)
    struct Researcher {
        bool registered;
        string name;
        string institution;
        uint256 registeredAt;
    }

    // ============================================================
    //                         STORAGE
    // ============================================================

    /// @notice Hasta adresi -> Patient profili
    mapping(address => Patient) public patients;

    /// @notice Arastirmaci adresi -> Researcher profili
    mapping(address => Researcher) public researchers;

    /// @notice 3 seviyeli mapping: hasta -> arastirmaci -> (veriTipi+amac hash) -> Consent
    /// @dev veri tipi + amac kombinasyonunu tek bir bytes32 anahtarla birlestiriyoruz
    mapping(address => mapping(address => mapping(bytes32 => Consent))) private consents;

    /// @notice Bir hastanin gecmiste verdigi toplam onay sayisi (istatistik/audit icin)
    mapping(address => uint256) public consentCount;

    // ============================================================
    //              EVENTLER (GDPR AUDIT TRAIL)
    // ============================================================

    event PatientRegistered(
        address indexed patient,
        uint256 timestamp
    );

    event ResearcherRegistered(
        address indexed researcher,
        string name,
        string institution,
        uint256 timestamp
    );

    event ConsentGranted(
        address indexed patient,
        address indexed researcher,
        DataType indexed dataType,
        Purpose purpose,
        uint256 expiry,
        uint256 timestamp
    );

    event ConsentRevoked(
        address indexed patient,
        address indexed researcher,
        DataType indexed dataType,
        Purpose purpose,
        uint256 timestamp
    );

    // ============================================================
    //         CUSTOM ERRORS (gas verimli, 0.8.4+)
    // ============================================================

    error PatientNotRegistered();
    error PatientAlreadyRegistered();
    error ResearcherNotRegistered();
    error ResearcherAlreadyRegistered();
    error EmptyString();
    error InvalidDuration();
    error ConsentDoesNotExist();
    error ConsentAlreadyRevoked();

    // ============================================================
    //                       MODIFIERLAR
    // ============================================================

    modifier onlyRegisteredPatient() {
        if (!patients[msg.sender].registered) revert PatientNotRegistered();
        _;
    }

    // ============================================================
    //                    KAYIT FONKSIYONLARI
    // ============================================================

    /**
     * @notice Hasta sistemi kullanmaya baslamak icin kendini kaydeder.
     * @dev msg.sender hasta adresi olarak alinir. Mukerrer kayit reddedilir.
     */
    function registerPatient() external {
        if (patients[msg.sender].registered) revert PatientAlreadyRegistered();

        patients[msg.sender] = Patient({
            registered: true,
            registeredAt: block.timestamp
        });

        emit PatientRegistered(msg.sender, block.timestamp);
    }

    /**
     * @notice Arastirmaci/kurum kendini kaydeder.
     * @param name Arastirmacinin gosterilecek adi (bos olamaz)
     * @param institution Kurumun adi (bos olamaz)
     */
    function registerResearcher(
        string calldata name,
        string calldata institution
    ) external {
        if (researchers[msg.sender].registered) revert ResearcherAlreadyRegistered();
        if (bytes(name).length == 0) revert EmptyString();
        if (bytes(institution).length == 0) revert EmptyString();

        researchers[msg.sender] = Researcher({
            registered: true,
            name: name,
            institution: institution,
            registeredAt: block.timestamp
        });

        emit ResearcherRegistered(msg.sender, name, institution, block.timestamp);
    }

    // ============================================================
    //                   ONAY FONKSIYONLARI
    // ============================================================

    /**
     * @notice Hasta, bir arastirmaciya belirli veri tipi/amac icin sureli onay verir.
     * @param researcher Onay verilecek arastirmaci adresi (kayitli olmali)
     * @param dataType Hangi tip veri (BloodTest, Xray, vs.)
     * @param purpose Hangi amac (Treatment, Research, vs.)
     * @param durationInDays Onayin kac gun gecerli olacagi. 0 = sinirsiz, max 3650 (10 yil)
     *
     * @dev Ayni hasta-arastirmaci-tip-amac kombinasyonuna yeni onay verirse
     *      eskinin uzerine yazilir (bilincli tasarim: hasta sureyi uzatmak isteyebilir).
     */
    function grantConsent(
        address researcher,
        DataType dataType,
        Purpose purpose,
        uint256 durationInDays
    ) external onlyRegisteredPatient {
        if (!researchers[researcher].registered) revert ResearcherNotRegistered();
        if (durationInDays > 3650) revert InvalidDuration();

        bytes32 key = _consentKey(dataType, purpose);
        uint256 expiryTime = durationInDays == 0
            ? 0
            : block.timestamp + (durationInDays * 1 days);

        consents[msg.sender][researcher][key] = Consent({
            active: true,
            grantedAt: block.timestamp,
            expiry: expiryTime,
            purpose: purpose,
            revokedAt: 0
        });

        consentCount[msg.sender]++;

        emit ConsentGranted(
            msg.sender,
            researcher,
            dataType,
            purpose,
            expiryTime,
            block.timestamp
        );
    }

    /**
     * @notice Hasta verdigi onayi geri ceker.
     * @dev "Dynamic consent"in ozu - GDPR'in "right to withdraw" hakki.
     *      Onay tamamen silinmiyor, sadece pasif hale getiriliyor; revokedAt damgalanir.
     *      Bu sayede audit trail korunmus olur.
     */
    function revokeConsent(
        address researcher,
        DataType dataType,
        Purpose purpose
    ) external onlyRegisteredPatient {
        bytes32 key = _consentKey(dataType, purpose);
        Consent storage c = consents[msg.sender][researcher][key];

        if (c.grantedAt == 0) revert ConsentDoesNotExist();
        if (!c.active) revert ConsentAlreadyRevoked();

        c.active = false;
        c.revokedAt = block.timestamp;

        emit ConsentRevoked(
            msg.sender,
            researcher,
            dataType,
            purpose,
            block.timestamp
        );
    }

    // ============================================================
    //                  SORGULAMA FONKSIYONLARI
    // ============================================================

    /**
     * @notice Arastirmaci, hasta verisine erismeden once cagirir.
     * @return true ise erisim verilebilir, false ise erisim YOK.
     * @dev Su uc kosulu kontrol eder:
     *      1) Onay aktif mi (revoke edilmemis mi)
     *      2) Sure dolmus mu (expiry varsa)
     *      3) Hicbir onay kaydi yoksa, varsayilan olarak false
     */
    function checkConsent(
        address patient,
        address researcher,
        DataType dataType,
        Purpose purpose
    ) external view returns (bool) {
        bytes32 key = _consentKey(dataType, purpose);
        Consent memory c = consents[patient][researcher][key];

        if (!c.active) return false;
        if (c.expiry != 0 && block.timestamp > c.expiry) return false;

        return true;
    }

    /**
     * @notice Bir onayin tum detaylarini dondurur (audit/UI icin).
     * @dev Onay hic verilmemisse Consent struct'inin sifir degerleri doner.
     */
    function getConsent(
        address patient,
        address researcher,
        DataType dataType,
        Purpose purpose
    ) external view returns (Consent memory) {
        bytes32 key = _consentKey(dataType, purpose);
        return consents[patient][researcher][key];
    }

    /// @notice Hasta profilini dondurur
    function getPatient(address patient) external view returns (Patient memory) {
        return patients[patient];
    }

    /// @notice Arastirmaci profilini dondurur
    function getResearcher(address researcher) external view returns (Researcher memory) {
        return researchers[researcher];
    }

    // ============================================================
    //                  ICSEL YARDIMCI FONKSIYONLAR
    // ============================================================

    /**
     * @dev DataType + Purpose ikilisini tek bir bytes32 anahtara cevirir.
     *      Bu sayede 3 seviyeli mapping ile (hasta -> arastirmaci -> anahtar) yapinin
     *      tamami O(1) erisilebilir hale gelir.
     */
    function _consentKey(DataType dataType, Purpose purpose)
        private
        pure
        returns (bytes32)
    {
        return keccak256(abi.encodePacked(dataType, purpose));
    }
}
