"""
In this file, i will be asking for a secret, amount of shares and the threshold from a user
to test the written implementation in shamir.py
"""

from shamir import splitting, reconstructing


secret:str = input("Enter a secret: ")
n = int(input("Enter the number of shares: "))
k =int(input("Enter the threshold (1 <= k <= n ): "))

if(k < 1 or k > n):
    raise Exception("Shamir Secret Sharing rules violated")
else:
    print("\nSplitting ....")
    shares = splitting(secret, k, n)
    print(f"Shares: {shares}")
    print(f"\nReconstructing based on {k} threshold...")
    secret = reconstructing(shares, k)
    print(f"Reconstructed secret: {secret}")