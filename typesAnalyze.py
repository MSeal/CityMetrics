TYPES_FILE = "types.txt"

if __name__ == "__main__":
    types = set()
    with open(TYPES_FILE, "rb") as tfile:
        types = set([t.strip() for t in tfile.read().split(",")])

    city = set()
    for t in types:
        if "city" in t:
            print t
