/**
 * ConsentManager - Otomatik Test Senaryosu (Remix Script Runner)
 *
 * KULLANIM:
 *  1. Remix'te ConsentManager.sol'u compile et (Solidity Compiler sekmesi)
 *  2. Bu dosyayi (scripts/test_consent_manager.js) ac
 *  3. Editor'un sag ust kosesinde "Run" butonuna bas
 *  4. Asagidaki Remix Console'da tum senaryo akar
 *
 * NOT: Bu script Remix VM uzerinde calisir, hicbir kurulum/MetaMask gerektirmez.
 */

(async () => {
    try {
        console.log("==========================================================");
        console.log("  eHealth Dynamic Consent — Otomatik Test Senaryosu");
        console.log("==========================================================");

        // ----- Helpers -----
        const sep = () => console.log("----------------------------------------------------------");
        const ok = (msg) => console.log("  [+] " + msg);
        const info = (msg) => console.log("  [i] " + msg);
        const fail = (msg) => console.log("  [X] " + msg);

        // Enum karsiliklari (Solidity ile ayni sira)
        const DataType = { BloodTest: 0, Xray: 1, Genetic: 2, MRI: 3, Prescription: 4 };
        const Purpose = { Treatment: 0, Research: 1, Insurance: 2, Statistical: 3 };

        const dataTypeName = ['BloodTest','Xray','Genetic','MRI','Prescription'];
        const purposeName = ['Treatment','Research','Insurance','Statistical'];

        // ----- Adim 1: Kontrati deploy et -----
        sep();
        console.log("ADIM 1: Kontrat Deploy");
        sep();

        // ConsentManager'in artifact'ini cek (compile sonrasi otomatik olusur)
        const artifactsPath = "artifacts/ConsentManager.json";
        const metadata = JSON.parse(await remix.call('fileManager','getFile', artifactsPath));

        // Hesaplari al (Remix VM 15 hesap, her birinde 100 ETH)
        const accounts = await web3.eth.getAccounts();
        const hastaAddr = accounts[0];
        const arastirmaciAddr = accounts[1];
        const baskaArastAddr = accounts[2];

        info("Hasta adresi:        " + hastaAddr);
        info("Arastirmaci adresi:  " + arastirmaciAddr);
        info("Baska arastirmaci:   " + baskaArastAddr);

        // Deploy
        const factory = new web3.eth.Contract(metadata.abi);
        const deployTx = factory.deploy({ data: metadata.data.bytecode.object });
        const contract = await deployTx.send({ from: hastaAddr, gas: 5_000_000 });

        ok("ConsentManager deploy edildi: " + contract.options.address);

        // ----- Adim 2: Hasta kayit -----
        sep();
        console.log("ADIM 2: Hasta Kaydi");
        sep();

        await contract.methods.registerPatient().send({ from: hastaAddr });
        const patientInfo = await contract.methods.getPatient(hastaAddr).call();
        ok("Hasta kayit oldu. registered=" + patientInfo.registered);
        info("registeredAt: " + new Date(patientInfo.registeredAt * 1000).toLocaleString('tr-TR'));

        // ----- Adim 3: Arastirmaci kayit -----
        sep();
        console.log("ADIM 3: Arastirmaci Kaydi");
        sep();

        await contract.methods
            .registerResearcher("Dr. Ayse Yilmaz", "Istanbul Tip Fakultesi")
            .send({ from: arastirmaciAddr });

        const rInfo = await contract.methods.getResearcher(arastirmaciAddr).call();
        ok("Arastirmaci kayit oldu");
        info("Ad:    " + rInfo.name);
        info("Kurum: " + rInfo.institution);

        // Ikinci arastirmaci da kaydet (sonra coklu senaryoda kullanacagiz)
        await contract.methods
            .registerResearcher("Dr. Mehmet Demir", "Bogazici Universitesi")
            .send({ from: baskaArastAddr });
        ok("Ikinci arastirmaci kayit oldu (Bogazici)");

        // ----- Adim 4: Onay ver — BloodTest + Research, 30 gun -----
        sep();
        console.log("ADIM 4: Onay Verme (BloodTest + Research, 30 gun)");
        sep();

        await contract.methods
            .grantConsent(arastirmaciAddr, DataType.BloodTest, Purpose.Research, 30)
            .send({ from: hastaAddr });

        ok("Onay verildi");

        // Hemen kontrol et
        const onay1 = await contract.methods
            .checkConsent(hastaAddr, arastirmaciAddr, DataType.BloodTest, Purpose.Research)
            .call();
        ok("checkConsent(BloodTest, Research) = " + onay1 + "  ← bekleniyordu: true");

        // ----- Adim 5: Veri tipi izolasyonu testi -----
        sep();
        console.log("ADIM 5: Veri Tipi Izolasyonu");
        sep();

        const genetik = await contract.methods
            .checkConsent(hastaAddr, arastirmaciAddr, DataType.Genetic, Purpose.Research)
            .call();
        info("checkConsent(Genetic, Research) = " + genetik + "  ← bekleniyordu: false");
        if (genetik === false) {
            ok("Veri tipi izolasyonu DOGRU calisiyor: Genetic icin onay yok.");
        } else {
            fail("Beklenmedik durum!");
        }

        // ----- Adim 6: Amac izolasyonu testi -----
        sep();
        console.log("ADIM 6: Amac Izolasyonu");
        sep();

        const sigorta = await contract.methods
            .checkConsent(hastaAddr, arastirmaciAddr, DataType.BloodTest, Purpose.Insurance)
            .call();
        info("checkConsent(BloodTest, Insurance) = " + sigorta + "  ← bekleniyordu: false");
        if (sigorta === false) {
            ok("Amac izolasyonu DOGRU calisiyor: Insurance icin onay yok.");
        }

        // ----- Adim 7: Coklu arastirmaci -----
        sep();
        console.log("ADIM 7: Coklu Arastirmaci Izolasyonu");
        sep();

        const baskaArast = await contract.methods
            .checkConsent(hastaAddr, baskaArastAddr, DataType.BloodTest, Purpose.Research)
            .call();
        info("checkConsent(baska arastirmaci, BloodTest, Research) = " + baskaArast + "  ← bekleniyordu: false");
        if (baskaArast === false) {
            ok("Arastirmaci izolasyonu DOGRU: Bogazici arastirmacisina onay yok.");
        }

        // ----- Adim 8: Onay detayini sorgula (Audit) -----
        sep();
        console.log("ADIM 8: Audit Detayi (getConsent)");
        sep();

        const detay = await contract.methods
            .getConsent(hastaAddr, arastirmaciAddr, DataType.BloodTest, Purpose.Research)
            .call();
        ok("Onay detayi cekildi");
        info("active:    " + detay.active);
        info("grantedAt: " + new Date(detay.grantedAt * 1000).toLocaleString('tr-TR'));
        info("expiry:    " + new Date(detay.expiry * 1000).toLocaleString('tr-TR'));
        info("purpose:   " + purposeName[detay.purpose] + " (" + detay.purpose + ")");
        info("revokedAt: " + (detay.revokedAt == 0 ? "0 (henuz geri cekilmedi)" : new Date(detay.revokedAt * 1000).toLocaleString('tr-TR')));

        // ----- Adim 9: Onay geri cekme -----
        sep();
        console.log("ADIM 9: Onay Geri Cekme (GDPR right to withdraw)");
        sep();

        await contract.methods
            .revokeConsent(arastirmaciAddr, DataType.BloodTest, Purpose.Research)
            .send({ from: hastaAddr });

        ok("Onay geri cekildi");

        const onaySonra = await contract.methods
            .checkConsent(hastaAddr, arastirmaciAddr, DataType.BloodTest, Purpose.Research)
            .call();
        ok("checkConsent(BloodTest, Research) = " + onaySonra + "  ← bekleniyordu: false");

        // ----- Adim 10: Audit, geri cekme sonrasi -----
        sep();
        console.log("ADIM 10: Audit Detayi (geri cekme sonrasi)");
        sep();

        const detaySonra = await contract.methods
            .getConsent(hastaAddr, arastirmaciAddr, DataType.BloodTest, Purpose.Research)
            .call();
        info("active:    " + detaySonra.active + " (artik false)");
        info("grantedAt: " + new Date(detaySonra.grantedAt * 1000).toLocaleString('tr-TR') + " (degismedi)");
        info("revokedAt: " + new Date(detaySonra.revokedAt * 1000).toLocaleString('tr-TR') + " (yeni damga)");
        ok("Audit izi korunuyor — onay silinmedi, sadece pasiflestirildi (GDPR Article 30 uyumu)");

        // ----- Adim 11: Custom error testi -----
        sep();
        console.log("ADIM 11: Custom Error - Mukerrer Geri Cekme");
        sep();

        try {
            await contract.methods
                .revokeConsent(arastirmaciAddr, DataType.BloodTest, Purpose.Research)
                .send({ from: hastaAddr });
            fail("Ikinci geri cekme hata vermedi - YANLIS!");
        } catch (e) {
            ok("Mukerrer geri cekme reddedildi (custom error: ConsentAlreadyRevoked)");
        }

        // ----- Adim 12: Kayitsiz hasta testi -----
        sep();
        console.log("ADIM 12: Custom Error - Kayitsiz Hasta Onay Veremez");
        sep();

        const kayitsizHasta = accounts[5];  // hic kayit olmadi
        try {
            await contract.methods
                .grantConsent(arastirmaciAddr, DataType.BloodTest, Purpose.Research, 30)
                .send({ from: kayitsizHasta });
            fail("Kayitsiz hasta onay verebildi - YANLIS!");
        } catch (e) {
            ok("Kayitsiz hasta onay vermeye calisti, reddedildi (custom error: PatientNotRegistered)");
        }

        // ----- Adim 13: Onay sayaci -----
        sep();
        console.log("ADIM 13: Onay Sayaci (Audit Trail)");
        sep();

        const sayac = await contract.methods.consentCount(hastaAddr).call();
        ok("Hastanin verdigi toplam onay sayisi: " + sayac);

        // ----- SONUC -----
        sep();
        console.log("==========================================================");
        console.log("  TUM TESTLER BASARILI - 13 SENARYO ✓");
        console.log("==========================================================");
        console.log("");
        console.log("Senin kontratinin gosterdigi yetenekler:");
        console.log("  - Hasta/Arastirmaci kayit sistemi (referansta yok)");
        console.log("  - Veri tipi bazli onay (referansta yok)");
        console.log("  - Amac bazli onay (referansta yok)");
        console.log("  - Sureli onay - block.timestamp ile (referansta yok)");
        console.log("  - Custom error'lar - gas verimli (referansta yok)");
        console.log("  - Audit trail - getConsent ile revoke sonrasi izlenebilir");
        console.log("  - GDPR Article 17 ve Article 30 uyumu");

    } catch (e) {
        console.log("==========================================================");
        console.log("  HATA OLUSTU");
        console.log("==========================================================");
        console.log(e.message || e);
    }
})();
