"""
In this file, i will be asking for a secret, amount of shares and the threshold from a user
to test the written implementation in shamir.py (My original implementation)
and compare its result with a picked reference on github 
reference link: (https://github.com/shea256/secret-sharing) 
"""

from shamir import splitting, reconstructing
from secretsharing import PlaintextToHexSecretSharer

secret:str = input("Enter a secret: ")
n = int(input("Enter the number of shares: "))
k =int(input("Enter the threshold (1 <= k <= n ): "))

if(k < 1 or k > n):
    raise Exception("Shamir Secret Sharing rules violated")

# Mine
my_shares = splitting(secret, k, n)
my_result = reconstructing(my_shares[:k], k) # type: ignore
print("\nMine ->")
print("Shares:", my_shares)
print("Reconstructed:", my_result)

# Reference
ref_shares = PlaintextToHexSecretSharer.split_secret(secret, k, n)
ref_result = PlaintextToHexSecretSharer.recover_secret(ref_shares[:k])
print("\nReference ->")
print("Shares:", ref_shares)
print("Reconstructed:", ref_result)

print("\n\nComparison -->")
print("My result: :", my_result)
print("Reference result:", ref_result)
