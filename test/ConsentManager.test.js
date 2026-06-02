const { expect } = require("chai");
const { ethers } = require("hardhat");
const { time } = require("@nomicfoundation/hardhat-network-helpers");

describe("ConsentManager", function () {
    // Solidity enum'larinin sayisal karsiliklari (siralama enum'da tanimlandigi gibi)
    const DataType = {
        BloodTest: 0,
        Xray: 1,
        Genetic: 2,
        MRI: 3,
        Prescription: 4,
    };

    const Purpose = {
        Treatment: 0,
        Research: 1,
        Insurance: 2,
        Statistical: 3,
    };

    // Her test oncesi yeni bir kontrat deploy eden fixture
    async function deployFixture() {
        const [owner, patient1, patient2, researcher1, researcher2, other] =
            await ethers.getSigners();

        const ConsentManager = await ethers.getContractFactory("ConsentManager");
        const consentManager = await ConsentManager.deploy();
        await consentManager.waitForDeployment();

        return {
            consentManager,
            owner,
            patient1,
            patient2,
            researcher1,
            researcher2,
            other,
        };
    }

    // Hasta ve arastirmaci kayitli bir baslangic durumu icin yardimci
    async function deployAndRegister() {
        const fixture = await deployFixture();
        await fixture.consentManager.connect(fixture.patient1).registerPatient();
        await fixture.consentManager
            .connect(fixture.researcher1)
            .registerResearcher("Dr. Ayse Yilmaz", "Istanbul Tip Fakultesi");
        return fixture;
    }

    // ============================================================
    //                    KAYIT SISTEMI TESTLERI
    // ============================================================

    describe("Kayit sistemi", function () {
        it("Hasta basariyla kayit olabilir", async function () {
            const { consentManager, patient1 } = await deployFixture();

            await expect(consentManager.connect(patient1).registerPatient())
                .to.emit(consentManager, "PatientRegistered");

            const patient = await consentManager.getPatient(patient1.address);
            expect(patient.registered).to.equal(true);
            expect(patient.registeredAt).to.be.greaterThan(0);
        });

        it("Ayni hasta iki kez kayit olamaz", async function () {
            const { consentManager, patient1 } = await deployFixture();
            await consentManager.connect(patient1).registerPatient();

            await expect(
                consentManager.connect(patient1).registerPatient()
            ).to.be.revertedWithCustomError(consentManager, "PatientAlreadyRegistered");
        });

        it("Arastirmaci ad ve kurum ile kayit olabilir", async function () {
            const { consentManager, researcher1 } = await deployFixture();

            await expect(
                consentManager
                    .connect(researcher1)
                    .registerResearcher("Dr. Mehmet Demir", "ODTU")
            ).to.emit(consentManager, "ResearcherRegistered");

            const r = await consentManager.getResearcher(researcher1.address);
            expect(r.name).to.equal("Dr. Mehmet Demir");
            expect(r.institution).to.equal("ODTU");
            expect(r.registered).to.equal(true);
        });

        it("Bos isimle arastirmaci kayit olamaz", async function () {
            const { consentManager, researcher1 } = await deployFixture();

            await expect(
                consentManager.connect(researcher1).registerResearcher("", "Kurum")
            ).to.be.revertedWithCustomError(consentManager, "EmptyString");
        });

        it("Bos kurum ile arastirmaci kayit olamaz", async function () {
            const { consentManager, researcher1 } = await deployFixture();

            await expect(
                consentManager.connect(researcher1).registerResearcher("Dr. X", "")
            ).to.be.revertedWithCustomError(consentManager, "EmptyString");
        });
    });

    // ============================================================
    //                ONAY VERME VE GERI CEKME TESTLERI
    // ============================================================

    describe("Onay verme ve geri cekme", function () {
        it("Kayitli hasta, kayitli arastirmaciya onay verebilir", async function () {
            const { consentManager, patient1, researcher1 } = await deployAndRegister();

            await expect(
                consentManager
                    .connect(patient1)
                    .grantConsent(researcher1.address, DataType.BloodTest, Purpose.Research, 30)
            ).to.emit(consentManager, "ConsentGranted");

            const hasConsent = await consentManager.checkConsent(
                patient1.address,
                researcher1.address,
                DataType.BloodTest,
                Purpose.Research
            );
            expect(hasConsent).to.equal(true);
        });

        it("Kayitsiz hasta onay veremez", async function () {
            const { consentManager, patient2, researcher1 } = await deployAndRegister();
            // patient2 kayit olmadi

            await expect(
                consentManager
                    .connect(patient2)
                    .grantConsent(researcher1.address, DataType.BloodTest, Purpose.Research, 30)
            ).to.be.revertedWithCustomError(consentManager, "PatientNotRegistered");
        });

        it("Kayitsiz arastirmaciya onay verilemez", async function () {
            const { consentManager, patient1, researcher2 } = await deployAndRegister();
            // researcher2 kayit olmadi

            await expect(
                consentManager
                    .connect(patient1)
                    .grantConsent(researcher2.address, DataType.BloodTest, Purpose.Research, 30)
            ).to.be.revertedWithCustomError(consentManager, "ResearcherNotRegistered");
        });

        it("Hasta verdigi onayi geri cekebilir, checkConsent false dondurur", async function () {
            const { consentManager, patient1, researcher1 } = await deployAndRegister();

            await consentManager
                .connect(patient1)
                .grantConsent(researcher1.address, DataType.BloodTest, Purpose.Research, 30);

            await expect(
                consentManager
                    .connect(patient1)
                    .revokeConsent(researcher1.address, DataType.BloodTest, Purpose.Research)
            ).to.emit(consentManager, "ConsentRevoked");

            const hasConsent = await consentManager.checkConsent(
                patient1.address,
                researcher1.address,
                DataType.BloodTest,
                Purpose.Research
            );
            expect(hasConsent).to.equal(false);
        });

        it("Sure dolunca onay otomatik gecersiz olur", async function () {
            const { consentManager, patient1, researcher1 } = await deployAndRegister();

            await consentManager
                .connect(patient1)
                .grantConsent(researcher1.address, DataType.BloodTest, Purpose.Research, 7);

            // Once gecerli
            expect(
                await consentManager.checkConsent(
                    patient1.address,
                    researcher1.address,
                    DataType.BloodTest,
                    Purpose.Research
                )
            ).to.equal(true);

            // 8 gun ileri sar
            await time.increase(8 * 24 * 60 * 60);

            // Artik gecersiz
            expect(
                await consentManager.checkConsent(
                    patient1.address,
                    researcher1.address,
                    DataType.BloodTest,
                    Purpose.Research
                )
            ).to.equal(false);
        });

        it("Farkli veri tipleri birbirinden bagimsiz onaylanabilir", async function () {
            const { consentManager, patient1, researcher1 } = await deployAndRegister();

            // Sadece kan tahline onay ver
            await consentManager
                .connect(patient1)
                .grantConsent(researcher1.address, DataType.BloodTest, Purpose.Research, 30);

            expect(
                await consentManager.checkConsent(
                    patient1.address,
                    researcher1.address,
                    DataType.BloodTest,
                    Purpose.Research
                )
            ).to.equal(true);

            // Genetik veri icin onay yok -> false
            expect(
                await consentManager.checkConsent(
                    patient1.address,
                    researcher1.address,
                    DataType.Genetic,
                    Purpose.Research
                )
            ).to.equal(false);
        });

        it("Ayni veri tipi farkli amaclarda bagimsiz onaylanabilir", async function () {
            const { consentManager, patient1, researcher1 } = await deployAndRegister();

            // Sadece tedavi icin kan tahli onayi
            await consentManager
                .connect(patient1)
                .grantConsent(researcher1.address, DataType.BloodTest, Purpose.Treatment, 0);

            // Tedavi: var
            expect(
                await consentManager.checkConsent(
                    patient1.address,
                    researcher1.address,
                    DataType.BloodTest,
                    Purpose.Treatment
                )
            ).to.equal(true);

            // Arastirma: yok
            expect(
                await consentManager.checkConsent(
                    patient1.address,
                    researcher1.address,
                    DataType.BloodTest,
                    Purpose.Research
                )
            ).to.equal(false);
        });

        it("Sinirsiz sureli (durationInDays=0) onay verilebilir, yillarca gecerli kalir", async function () {
            const { consentManager, patient1, researcher1 } = await deployAndRegister();

            await consentManager
                .connect(patient1)
                .grantConsent(researcher1.address, DataType.Prescription, Purpose.Treatment, 0);

            // 100 yil ileri sar
            await time.increase(100 * 365 * 24 * 60 * 60);

            expect(
                await consentManager.checkConsent(
                    patient1.address,
                    researcher1.address,
                    DataType.Prescription,
                    Purpose.Treatment
                )
            ).to.equal(true);
        });

        it("Hic verilmemis onay geri cekilemez", async function () {
            const { consentManager, patient1, researcher1 } = await deployAndRegister();

            await expect(
                consentManager
                    .connect(patient1)
                    .revokeConsent(researcher1.address, DataType.BloodTest, Purpose.Research)
            ).to.be.revertedWithCustomError(consentManager, "ConsentDoesNotExist");
        });

        it("Iki kez geri cekme ikinci seferinde hata verir", async function () {
            const { consentManager, patient1, researcher1 } = await deployAndRegister();

            await consentManager
                .connect(patient1)
                .grantConsent(researcher1.address, DataType.BloodTest, Purpose.Research, 30);

            await consentManager
                .connect(patient1)
                .revokeConsent(researcher1.address, DataType.BloodTest, Purpose.Research);

            await expect(
                consentManager
                    .connect(patient1)
                    .revokeConsent(researcher1.address, DataType.BloodTest, Purpose.Research)
            ).to.be.revertedWithCustomError(consentManager, "ConsentAlreadyRevoked");
        });

        it("Max sure asilirsa hata verir (>3650 gun)", async function () {
            const { consentManager, patient1, researcher1 } = await deployAndRegister();

            await expect(
                consentManager
                    .connect(patient1)
                    .grantConsent(researcher1.address, DataType.BloodTest, Purpose.Research, 3651)
            ).to.be.revertedWithCustomError(consentManager, "InvalidDuration");
        });
    });

    // ============================================================
    //                  AUDIT TRAIL TESTLERI (GDPR)
    // ============================================================

    describe("Audit trail (GDPR uyumu)", function () {
        it("Onay sayaci dogru artar", async function () {
            const { consentManager, patient1, researcher1, researcher2 } =
                await deployFixture();

            await consentManager.connect(patient1).registerPatient();
            await consentManager
                .connect(researcher1)
                .registerResearcher("Dr. A", "Lab1");
            await consentManager
                .connect(researcher2)
                .registerResearcher("Dr. B", "Lab2");

            expect(await consentManager.consentCount(patient1.address)).to.equal(0);

            await consentManager
                .connect(patient1)
                .grantConsent(researcher1.address, DataType.BloodTest, Purpose.Research, 30);
            expect(await consentManager.consentCount(patient1.address)).to.equal(1);

            await consentManager
                .connect(patient1)
                .grantConsent(researcher2.address, DataType.Xray, Purpose.Treatment, 60);
            expect(await consentManager.consentCount(patient1.address)).to.equal(2);
        });

        it("getConsent revoke sonrasi dogru bilgi dondurur", async function () {
            const { consentManager, patient1, researcher1 } = await deployAndRegister();

            await consentManager
                .connect(patient1)
                .grantConsent(researcher1.address, DataType.MRI, Purpose.Treatment, 30);

            await consentManager
                .connect(patient1)
                .revokeConsent(researcher1.address, DataType.MRI, Purpose.Treatment);

            const c = await consentManager.getConsent(
                patient1.address,
                researcher1.address,
                DataType.MRI,
                Purpose.Treatment
            );

            expect(c.active).to.equal(false);
            expect(c.grantedAt).to.be.greaterThan(0);
            expect(c.revokedAt).to.be.greaterThan(0);
            expect(c.revokedAt).to.be.greaterThanOrEqual(c.grantedAt);
        });
    });
});
