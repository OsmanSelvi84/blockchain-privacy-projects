# Reference Implementation

The reference used for comparison is
[jondubois/simple-lamport](https://github.com/jondubois/simple-lamport), a
JavaScript Lamport one-time-signature library.

## Setup

    cd reference
    git clone https://github.com/jondubois/simple-lamport.git
    cd simple-lamport
    npm install

## Why this reference

Both this project's Solidity implementation and simple-lamport follow the standard
Lamport one-time-signature scheme over SHA-256 with N=256 bits, so their outputs
are functionally equivalent for the same inputs.
