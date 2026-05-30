from web3 import Web3 
import json
import os
import sys

sys.path.append(os.path.join(os.path.dirname(__file__), '..'))
from shamir import splitting, reconstructing

#Connecting to hardhat
w3 = Web3(Web3.HTTPProvider("http://127.0.0.1:8545"))

if not w3.is_connected():
    print("No connection")
else:
    print("Connected")


contractAddressPath = os.path.join(os.path.dirname(__file__), "..", "contract_address.txt")
with open(contractAddressPath) as file:
    contractAddres = w3.to_checksum_address(file.read())
print(contractAddres)

path = os.path.join(os.path.dirname(__file__), '..', 'artifacts', 'contracts', 'secret_sharing_escrow.sol', 'SecretSharingEscrow.json')
with open(path) as file:
    contractFile = json.load(file)
abi = contractFile["abi"]

contract = w3.eth.contract(address=contractAddres, abi= abi)

#Normal test
def test1():
    secret = "ousama"
    k = contract.functions.threshold().call()
    n = contract.functions.shares().call()
    shares = splitting(secret=secret, k=k, n=n)
    reconsctructedSecret = reconstructing(shares=shares, k=k)

    if(reconsctructedSecret == secret):
        print("test 1 PASSED, normal splitting and reconstructing")
    else:
        print("test 1 FAILED")

#Enough shares test
def test2():
    secret = "ousama"
    k = contract.functions.threshold().call()
    n = contract.functions.shares().call()
    shares = splitting(secret=secret, k=k, n=n)
    try:
        reconstructedSecret = reconstructing(shares=shares[:k-1], k=k-1) # type: ignore
        if reconstructedSecret != secret:
            print("test 2 PASSED, not enough shares gave wrong result")
        else:
            print("test 2 FAILED")
    except:
        print("test 2 PASSED, not enough shares caused an error")


#Duplication test
def test3():
    sender = w3.eth.accounts[0]
    try:
        tx = contract.functions.saveShares(1, 12345).transact({"from": sender})
        w3.eth.wait_for_transaction_receipt(tx)

        tx = contract.functions.saveShares(1, 12345).transact({"from": sender})
        w3.eth.wait_for_transaction_receipt(tx)
        print("test 3 FAILED, duplicate share was accepted")
    except:
        print("test 3 PASSED, duplicate share was rejected")

#invalid index test
def test4():
    sender = w3.eth.accounts[0]
    try:
        tx = contract.functions.saveShares(0, 12345).transact({"from": sender})
        w3.eth.wait_for_transaction_receipt(tx)
        print("test 4 FAILED, invalid indexed share was saved")
    except:
        print("test 4 PASSED, invalid indexed share was rejected")


#deletion test
def test5():
    #not the DEPLOYER (owner)
    sender = w3.eth.accounts[1] # type: ignore
    try:
        tx = contract.functions.deleteShares().transact({"from": sender})
        w3.eth.wait_for_transaction_receipt(tx)
        print("test 5 FAILED, unautherized node deleted the shares")
    except:
        print("test 5 PASSED, unautherized node couldnt delete the shares")


test1()
test2()
test3()
test4()
test5()