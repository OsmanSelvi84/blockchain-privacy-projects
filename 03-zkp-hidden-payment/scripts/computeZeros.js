import { buildPoseidon } from "circomlibjs";
import { fileURLToPath } from "url";

export const ZERO_VALUE = BigInt(
    "21663839004416932945382355908790599225266501822907911457504978515578255421292"
);

export const computeZeros = async (poseidon, depth = 20, initialValue = ZERO_VALUE) => {
    const F = poseidon.F;
    const zeros = [initialValue];

    for (let i = 1; i <= depth; i++) {
        const next = poseidon([zeros[i - 1], zeros[i - 1]]);
        zeros.push(BigInt(F.toString(next)));
    }

    return zeros;
};

async function main() {
    const poseidon = await buildPoseidon();
    const zeros = await computeZeros(poseidon, 20);

    console.log("bytes32[20] memory zeros:");
    zeros.forEach((z, i) => console.log(`  // level ${i}\n  bytes32(0x${z.toString(16).padStart(64, "0")}),`));

    console.log("\nZERO_VALUE (level 0):");
    console.log(`0x${zeros[0].toString(16).padStart(64, "0")}`);
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
    main();
}
