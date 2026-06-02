import { network } from "hardhat";

async function main() {
    const secret = "my-secret-password";

    const hash = ethers.keccak256(
        ethers.toUtf8Bytes(secret)
    );

    const factory = await ethers.getContractFactory(
        "AnonymousAttestation"
    );

    const contract = await factory.deploy(hash);

    await contract.waitForDeployment();

    console.log(
        "Contract deployed at:",
        await contract.getAddress()
    );
}

main().catch((error) => {
    console.error(error);
    process.exitCode = 1;
});