import argparse
import abe
from abe import attr, AND, OR, THRESHOLD


def _tokenize(text: str) -> list[str]:
    tokens, i = [], 0
    while i < len(text):
        c = text[i]
        if c.isspace():
            i += 1
        elif c in "(),":
            tokens.append(c)
            i += 1
        else:
            j = i
            while j < len(text) and not text[j].isspace() and text[j] not in "(),":
                j += 1
            tokens.append(text[i:j])
            i = j
    return tokens


class _Parser:
    def __init__(self, tokens: list[str]):
        self.toks = tokens
        self.pos = 0

    def peek(self):
        return self.toks[self.pos] if self.pos < len(self.toks) else None

    def eat(self, expected=None):
        tok = self.toks[self.pos]
        if expected and tok != expected:
            raise ValueError(f"Expected '{expected}', got '{tok}'")
        self.pos += 1
        return tok

    def parse(self):
        node = self.expr()
        if self.pos != len(self.toks):
            raise ValueError("Unexpected trailing tokens in policy")
        return node

    def expr(self):
        node = self.term()
        children = [node]
        while self.peek() == "OR":
            self.eat("OR")
            children.append(self.term())
        return children[0] if len(children) == 1 else OR(*children)

    def term(self):
        node = self.factor()
        children = [node]
        while self.peek() == "AND":
            self.eat("AND")
            children.append(self.factor())
        return children[0] if len(children) == 1 else AND(*children)

    def factor(self):
        tok = self.peek()
        if tok == "(":
            self.eat("(")
            node = self.expr()
            self.eat(")")
            return node
        if tok == "THRESHOLD":
            self.eat("THRESHOLD")
            self.eat("(")
            k = int(self.eat())
            children = []
            while self.peek() == ",":
                self.eat(",")
                children.append(self.expr())
            self.eat(")")
            return THRESHOLD(k, *children)
        return attr(self.eat())


def parse_policy(text: str) -> dict:
    return _Parser(_tokenize(text)).parse()


def attributes_in(policy: dict) -> set[str]:
    if "attribute" in policy:
        return {policy["attribute"]}
    found = set()
    for child in policy["children"]:
        found |= attributes_in(child)
    return found


def run_case(policy_str: str, user_attrs: list[str], message: str, verbose: bool = True):
    policy = parse_policy(policy_str)
    universe = sorted(attributes_in(policy) | set(user_attrs))

    authority = abe.ABEAuthority(universe)
    ciphertext = abe.encrypt(authority, policy, message.encode())
    user = authority.keygen(user_attrs)
    result = abe.decrypt(user, ciphertext)

    granted = result is not None
    if verbose:
        print(f"Policy        : {policy_str}")
        print(f"User holds    : {user_attrs}")
        print(f"Decision      : {'ACCESS GRANTED' if granted else 'ACCESS DENIED'}")
        print(f"Recovered text: {result.decode() if granted else '(cannot decrypt)'}")
    return granted, (result.decode() if granted else None)


def showcase():
    msg = "PATIENT FILE #4471 -- diagnosis confidential"
    cases = [
        ("doctor",                                   ["doctor"]),
        ("doctor",                                   ["nurse"]),
        ("doctor AND cardiology",                    ["doctor", "cardiology"]),
        ("doctor AND cardiology",                    ["doctor"]),
        ("doctor AND (cardiology OR admin)",         ["doctor", "admin"]),
        ("THRESHOLD(2, doctor, nurse, research)",    ["nurse", "research"]),
        ("THRESHOLD(2, doctor, nurse, research)",    ["nurse"]),
    ]
    for i, (pol, attrs) in enumerate(cases, 1):
        print(f"\n===== Scenario {i} " + "=" * 40)
        run_case(pol, attrs, msg)


def main():
    p = argparse.ArgumentParser(description="Attribute-Based Encryption demo (CP-ABE).")
    p.add_argument("--policy", help='e.g. "doctor AND (cardiology OR admin)"')
    p.add_argument("--attributes", help="comma-separated, e.g. doctor,cardiology")
    p.add_argument("--message", default="Secret message", help="text to protect")
    args = p.parse_args()

    if args.policy and args.attributes is not None:
        attrs = [a.strip() for a in args.attributes.split(",") if a.strip()]
        run_case(args.policy, attrs, args.message)
    else:
        showcase()


if __name__ == "__main__":
    main()
