from web3 import Web3
import os
import json
import sys

sys.path.append(os.path.join(os.path.dirname(__file__), '..'))
from shamir import splitting, reconstructing

#Connecting to hardhat
w3 = Web3(Web3.HTTPProvider("http://127.0.0.1:8545"))

if not w3.is_connected():
    print("No connection")
else:
    print("Connected")

#Getting contract address
contractAddressPath = os.path.join(os.path.dirname(__file__), "..", "contract_address.txt")
with open(contractAddressPath) as file:
    contractAddres = w3.to_checksum_address(file.read())
print(contractAddres)

#Getting the contract ABI from artifcats
path = os.path.join(os.path.dirname(__file__), '..', 'artifacts', 'contracts', 'secret_sharing_escrow.sol', 'SecretSharingEscrow.json')
with open(path) as file:
    contractFile = json.load(file)
abi = contractFile["abi"]

#Creaeting the contract instance using the address and the abi
contract = w3.eth.contract(address=contractAddres, abi= abi)


#Testing
secret:str = input("Enter a secret: ")
k = contract.functions.threshold().call()
n = contract.functions.shares().call()

print("\nSplitting....")
shares = splitting(secret=secret, k=k, n=n)
print(f"Shares: {shares}")

sender = w3.eth.accounts[0] # DEPLOYER
print("\nSaving shares to blockchain....")
for index, fx in shares: # type: ignore
    tx = contract.functions.saveShares(index, fx).transact({"from": sender})
    w3.eth.wait_for_transaction_receipt(tx)
    print(f"Share NO: {index} is saved..")

isReady = contract.functions.isReady().call()
print(f"Enough shares has been saved to reconstruct the secret later !!")

fetchedShares = []
for i in range(1, k + 1):
    fx = contract.functions.getShares(i).call()
    fetchedShares.append((i, fx))
    print(f"Share ({i}, {fx}) has been fetched")

print("\nReconstrucing....")
reconstructedSecret = reconstructing(shares=fetchedShares, k=k)
print(f"Result: {reconstructedSecret}")
