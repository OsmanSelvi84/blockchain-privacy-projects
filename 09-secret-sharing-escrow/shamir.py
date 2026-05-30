"""
    In this file, the Shamir Secret Sharing algorithm implementatino will lie.
    The mathmaitcal computiaion (splitting and reconstructing)
    will be implemented here.
    How does it work ? 
    For splitting:
    1- Take a secret (string)
    2- Convert it to int
    3- Split it
    For reconstructing:
    1- Take the shares
    2- Assemble them (reconstruct them based on the threshold needed)
    3- Convert the result back to the original secret
    
"""


import secrets
#Constant Prime Number (Mersenne Prime, best suits the SSS)
P = 2 ** 127 - 1

def string_to_int(secret: str):
    #encode the string to bytes
    secret_in_bytes = secret.encode()
    #convert bytes to int
    secret_in_integer = int.from_bytes(secret_in_bytes, "big")
    #return the result
    return secret_in_integer


def int_to_string(secret_int_format: int):
    #bytes length to convert to bytes (7 to round up the division result)
    secret_length = (secret_int_format.bit_length() + 7) // 8
    #convert int to bytes
    secret_in_bytes = secret_int_format.to_bytes(secret_length, "big")
    #decode bytes to string
    secret_in_string = secret_in_bytes.decode()
    #return the secret
    return secret_in_string


def fx(coefficients: list, x):
    fx_result = 0
    for power, coefficient in enumerate(coefficients):
        fx_result = (fx_result + coefficient * (x ** power) ) % P #all in the space of the prime number
    return fx_result



def splitting(secret: str, k: int, n: int):
    if(k > n or k < 1): return
    secret_int = string_to_int(secret) % P #result must be within P field "always" like a space
    coefficients = []
    #secret is the first index
    coefficients.append(secret_int)
    for i in range(k - 1):
        #random coefficients between 0 and Prime - 1, we +1 to exclude 0
        coefficients.append(secrets.randbelow(P - 1) + 1)
    shares = []
    
    for i in range(1, n + 1):
        fx_result = fx(coefficients= coefficients, x= i)
        shares.append((i, fx_result))
    
    return shares



def reconstructing(shares, k):
    total = 0
    for i in range(len(shares)):
        xi = shares[i][0]
        yi = shares[i][1]
        basis = 1
        for j in range(len(shares)):
            if i != j:
                xj = shares[j][0]
                yj = shares[j][1]
                numerator = 0 - xj 
                denominator = xi - xj
                basis = basis * numerator * pow(denominator, -1, P) % P
        total = (total + yi * basis) % P
    secret_in_string = int_to_string(total)
    return secret_in_string
