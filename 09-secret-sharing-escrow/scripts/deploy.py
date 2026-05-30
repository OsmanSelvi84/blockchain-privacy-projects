from web3 import Web3
import json
import os

#Connecting to hardhat
w3 = Web3(Web3.HTTPProvider("http://127.0.0.1:8545"))

if not w3.is_connected():
    print("No connection")
else:
    print("Connected")


#Loading the contract (json format) from artifacts
path = os.path.join(os.path.dirname(__file__), '..', 'artifacts', 'contracts', 'secret_sharing_escrow.sol', 'SecretSharingEscrow.json')

with open(path) as file:
    contractJson = json.load(file)

abi = contractJson["abi"]
bytecode = contractJson["bytecode"]

print("Contract loaded")


#Deploy the contract 
deployer = w3.eth.accounts[0] #first account

contract = w3.eth.contract(abi=abi, bytecode=bytecode)

n = int(input("Enter the number of shares: "))
k =int(input("Enter the threshold (1 <= k <= n ): "))

if(k < 1 or k > n):
    raise Exception("Shamir Secret Sharing rules violated")

tx_hash = contract.constructor(k, n).transact({"from": deployer})
tx_receipt = w3.eth.wait_for_transaction_receipt(tx_hash)
contractAddress = tx_receipt["contractAddress"]

print(f"Contract deployed successfully: {contractAddress}")


#Save the contract address in a file to read it later in the demo.py file
with open("contract_address.txt", "w") as f:
    f.write(str(contractAddress))
print("Contract Address was saved")