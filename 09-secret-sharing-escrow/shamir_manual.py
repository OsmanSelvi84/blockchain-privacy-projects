# shamir_manual.py
# Shamir's Secret Sharing - Manual Implementation (No Library)
# Uses polynomial arithmetic over a finite field (prime p)

import random

# Large prime number for finite field arithmetic
PRIME = 208351617316091241234326746312124448251235562226470491514186331217050270460481

def _eval_polynomial(coefficients, x, prime):
    """Evaluate polynomial at point x using Horner's method."""
    result = 0
    for coeff in reversed(coefficients):
        result = (result * x + coeff) % prime
    return result

def _generate_shares(secret, n, k, prime):
    """Split secret into n shares with threshold k."""
    # Generate random coefficients for polynomial
    # coefficients[0] = secret (the y-intercept)
    coefficients = [secret] + [random.randint(1, prime - 1) for _ in range(k - 1)]
    
    # Generate n points on the polynomial
    shares = []
    for i in range(1, n + 1):
        x = i
        y = _eval_polynomial(coefficients, x, prime)
        shares.append((x, y))
    
    return shares

def _lagrange_interpolation(shares, prime):
    """Reconstruct secret using Lagrange Interpolation."""
    secret = 0
    k = len(shares)
    
    for i in range(k):
        xi, yi = shares[i]
        numerator = 1
        denominator = 1
        
        for j in range(k):
            if i == j:
                continue
            xj, yj = shares[j]
            numerator = (numerator * (-xj)) % prime
            denominator = (denominator * (xi - xj)) % prime
        
        # Modular inverse of denominator
        lagrange_coeff = (numerator * pow(denominator, prime - 2, prime)) % prime
        secret = (secret + yi * lagrange_coeff) % prime
    
    return secret

def string_to_int(s):
    """Convert string to integer."""
    return int(s.encode('utf-8').hex(), 16)

def int_to_string(n):
    """Convert integer back to string."""
    hex_str = hex(n)[2:]
    if len(hex_str) % 2:
        hex_str = '0' + hex_str
    return bytes.fromhex(hex_str).decode('utf-8')

def main():
    print("=" * 60)
    print(" SHAMIR'S SECRET SHARING — Manual Implementation")
    print(" No library used. Pure polynomial math over finite field.")
    print("=" * 60)

    # Get input
    secret_str = input("\nEnter a secret: ")
    n = int(input("Enter the number of shares (n): "))
    k = int(input("Enter the threshold (1 <= k <= n): "))

    if k > n:
        print("Error: threshold cannot be greater than number of shares!")
        return
    if k < 2:
        print("Error: threshold must be at least 2!")
        return

    # Convert secret to integer
    secret_int = string_to_int(secret_str)

    # Split secret
    print(f"\nSplitting secret into {n} shares with threshold {k}...")
    shares = _generate_shares(secret_int, n, k, PRIME)

    print("\nShares generated:")
    for i, (x, y) in enumerate(shares):
        print(f"  [Share {i+1}] Trustee {i+1}: ({x}, {str(y)[:20]}...)")

    # Scenario A — below threshold
    print(f"\n--- SCENARIO A: {k-1} shares (below threshold) ---")
    insufficient = shares[:k-1]
    recovered_int = _lagrange_interpolation(insufficient, PRIME)
    try:
        recovered_str = int_to_string(recovered_int)
        if recovered_str == secret_str:
            print("Result: UNEXPECTED SUCCESS — error!")
        else:
            print(f"Result: FAILED (expected)")
            print(f"Reason: Lagrange produces garbage with insufficient shares.")
    except:
        print("Result: FAILED (expected) — garbage output")

    # Scenario B — exactly threshold
    print(f"\n--- SCENARIO B: {k} shares (meets threshold) ---")
    sufficient = shares[:k]
    recovered_int = _lagrange_interpolation(sufficient, PRIME)
    try:
        recovered_str = int_to_string(recovered_int)
        if recovered_str == secret_str:
            print(f"Result: SUCCESS")
            print(f"Reconstructed secret: {recovered_str}")
        else:
            print("Result: MISMATCH")
    except:
        print("Result: ERROR — could not decode")

    print("\n" + "=" * 60)
    print(" Privacy concept: Distributed Trust Model")
    print(" No library used — pure Shamir math implementation")
    print("=" * 60)

if __name__ == "__main__":
    main()