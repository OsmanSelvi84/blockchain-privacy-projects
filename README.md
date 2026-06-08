# Blockchain Privacy Projects: Untraceable Voting & Anonymous Messaging

**Student:** Eylül Uygur 210304040
**Course:** COMP4052 Introduction to Blockchain and Distributed Ledger Technology
**Branch:** 04-ring-signature-anonymous-messaging

---

## 📌 1. Project Vision (What is this?)
Normal blockchains are very transparent. Everyone can see who send the transaction and who vote for who. This is a big problem for privacy. 

In this project, I solve this problem. I write a smart contract for **Untraceable Voting** and **Anonymous Messaging** on the Ethereum Virtual Machine (EVM). I use the Linkable Spontaneous Anonymous Group (LSAG) ring signature algorithm. When a user vote or send a message, the system know the user is in the authorized group, but nobody can know *who* exactly the user is. I am doing this project completely alone.

---

## 💻 2. Technical Details & Engineering (How I did it?)
I write the math engine (`secp256k1`) directly in Solidity. I do not use easy libraries, I build the cryptography from scratch. I use Hardhat and TypeScript for testing the system.

My main engineering solutions in this project:
* **Fixing EVM Limits:** EVM has a "Stack Too Deep" error when there are too many variables. I solve this by dividing my big math formulas into `l` (left) and `r` (right) helper functions.
* **Gas Optimization:** Normal X and Y coordinate math is very expensive on Ethereum. I use 3D Jacobian Coordinates to make the math cheaper, then I convert it back to 2D.
* **Double Spend Protection:** I add a "Key Image" feature. This stop bad users from voting 100 times. If someone try to use the same signature again, my smart contract blocks it.

---

## ⚙️ 3. Project Setup Instructions (How to run?)
To test my project on your computer, please follow these steps carefully in your terminal. Because my branch name and the folder name are the same, I use a special `-b` command to download it correctly.

### Step 1: Download the Project
First, clone the repository directly from my branch and go into the folder:

```bash
git clone -b 04-ring-signature-anonymous-messaging https://github.com/OsmanSelvi84/blockchain-privacy-projects.git
cd blockchain-privacy-projects

```

### Step 2: Open in VS Code

Open the project folder in Visual Studio Code:

```bash
code .

```

### Step 3: Install Packages

After VS Code opens, open a new terminal inside VS Code (Terminal -> New Terminal) and run this command:

```bash
npm install

```

> **🛠️ Ubuntu/Linux Troubleshooting (NVM / Node):**
> If you get an `npm: command not found` error on Ubuntu, your NVM might be sleeping. Wake it up with these commands before `npm install`:
> ```bash
> export NVM_DIR="$HOME/.nvm"
> [ -s "$NVM_DIR/nvm.sh" ] && \. "$NVM_DIR/nvm.sh"
> nvm use 24
> 
> ```
> 
> 

---

## 🧪 4. Testing & Security Evaluation

I write very strong security tests. These tests check if my contract blocks fake keys and bad array lengths.

To run my security simulation, use this command:

```bash
npx hardhat test

```

### 🎯 Expected Output:

When you run the test, you will see my system defending itself successfully:

```text
  AnonymousMessaging System Simulation
    1. Deployment Phase
      ✔ Should deploy the contract successfully to the blockchain
    2. Security & Cryptography Phase (Part A & B Evaluation)
      ✔ Should BLOCK hackers trying to bypass the Ring Signature with fake data
      ✔ Should BLOCK inputs with mismatched array lengths
    3. Part A - Instructor Evaluation (5 Inputs Test)

      --- INSTRUCTOR EVALUATION STARTED ---
      [ Input 1 ] Result: REJECTED - Invalid Signature Detected (System Secure)
      [ Input 2 ] Result: REJECTED - Invalid Signature Detected (System Secure)
      [ Input 3 ] Result: REJECTED - Invalid Signature Detected (System Secure)
      [ Input 4 ] Result: REJECTED - Invalid Signature Detected (System Secure)
      [ Input 5 ] Result: REJECTED - Invalid Signature Detected (System Secure)
      --- INSTRUCTOR EVALUATION COMPLETED ---

      ✔ Should evaluate 5 different inputs provided by the instructor

  4 passing (2s)

```

```
```
