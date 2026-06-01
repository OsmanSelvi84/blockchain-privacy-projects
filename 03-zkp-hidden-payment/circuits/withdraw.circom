pragma circom 2.0.0;

include "../node_modules/circomlib/circuits/poseidon.circom";

template HashLeftRight() {
    signal input left;
    signal input right;
    signal output hash;

    component h = Poseidon(2);
    h.inputs[0] <== left;
    h.inputs[1] <== right;
    hash <== h.out;
}
template DualMux() {
    signal input in[2];
    signal input s; // this says which in should go left and which right (0 => left, 1 => right)
    signal output out[2];

    s * (1 - s) === 0;
    out[0] <== (in[1] - in[0]) * s + in[0];
    out[1] <== (in[0] - in[1]) * s + in[1];
}
template MerkleProof(levels) {
    signal input leaf;
    signal input root;
    signal input pathElements[levels]; // sibling at each level
    signal input pathIndices[levels]; // siblings' position

    component selectors[levels];
    component hashers[levels];

    for (var i = 0; i < levels; i++) {
        selectors[i] = DualMux();
        selectors[i].in[0] <== i == 0 ? leaf : hashers[i - 1].hash;
        selectors[i].in[1] <== pathElements[i];
        selectors[i].s     <== pathIndices[i];

        hashers[i] = HashLeftRight();
        hashers[i].left  <== selectors[i].out[0];
        hashers[i].right <== selectors[i].out[1];
    }

    root === hashers[levels - 1].hash;
}

template Withdraw(levels) {
    // Public inputs
    signal input root;
    signal input nullifier;
    signal input recipient;

    // Private inputs
    signal input secret;
    signal input randomness;
    signal input pathElements[levels]; // siblings at each level
    signal input pathIndices[levels]; // siblings position (0 = left, 1 = right)

    // I'm gonna generate nullifier
    component nh = Poseidon(1);
    nh.inputs[0] <== secret;
    nh.out === nullifier;

    // I'm gonna generate commitment
    component ch = Poseidon(2);
    ch.inputs[0] <== secret;
    ch.inputs[1] <== randomness;

    // Merkle Tree Proof
    component tree = MerkleProof(levels);
    tree.leaf <== ch.out;
    tree.root <== root;
    for (var i = 0; i < levels; i++) {
        tree.pathElements[i] <== pathElements[i];
        tree.pathIndices[i]  <== pathIndices[i];
    }

    // combine the recipient with the proof
    signal recipientSquare;
    recipientSquare <== recipient * recipient;
}

component main {public [root, nullifier, recipient]} = Withdraw(20);
