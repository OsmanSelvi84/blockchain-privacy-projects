from ring_app import AnonymousRingMessaging


GREEN = "\033[92m"
RED = "\033[91m"
BLUE = "\033[94m"
YELLOW = "\033[93m"
RESET = "\033[0m"


app = AnonymousRingMessaging()


while True:
    print(f"\n{BLUE}=== Ring Signature Anonymous Messaging ==={RESET}")
    print("1. Send anonymous message")
    print("2. Verify signature")
    print("3. Show ring information")
    print("4. Exit")

    choice = input(f"\n{YELLOW}Choose an option:{RESET} ")

    if choice == "1":
        message = input("\nEnter your anonymous message: ")

        metadata = app.sign_message(message)

        print(f"\n{GREEN}Ring signature created successfully.{RESET}")
        print("Signature saved as signature.pem")
        print("Metadata saved as signature_metadata.json")
        print("Signer identity is not stored.")

        print("\nMessage Hash:")
        print(metadata["message_hash"])

    elif choice == "2":
        is_valid, metadata = app.verify_message()

        print(f"\n{BLUE}=== Verification Result ==={RESET}")

        if is_valid:
            print(f"{GREEN}Valid ring signature.{RESET}")
            print("The message was signed by one of the ring members.")
            print("Exact signer identity remains anonymous.")

            print("\nRing Size:")
            print(metadata["ring_size"])

            print("\nMessage Hash:")
            print(metadata["message_hash"])
        else:
            print(f"{RED}Invalid ring signature or no signature found.{RESET}")

    elif choice == "3":
        print(f"\n{BLUE}=== Ring Information ==={RESET}")
        print("Ring members are represented by public keys.")
        print("Private signer identity is not shown.")
        print("Current ring size: 2")

    elif choice == "4":
        print(f"\n{YELLOW}Exiting program...{RESET}")
        break

    else:
        print(f"\n{RED}Invalid option. Please try again.{RESET}")
