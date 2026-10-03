import json, sys
a = json.load(open(sys.argv[1], encoding="utf-8")); b = json.load(open(sys.argv[2], encoding="utf-8"))
ignore_prefixes = tuple(sys.argv[3:])
bad = []
for k in sorted(set(a) | set(b)):
    if k.startswith(ignore_prefixes): continue
    if a.get(k) != b.get(k):
        bad.append(k)
print("compared", len([k for k in a if not k.startswith(ignore_prefixes)]), "entries; differences:", len(bad))
for k in bad[:8]:
    print(" DIFF", k)
    x, y = str(a.get(k)), str(b.get(k))
    i = next((i for i in range(min(len(x), len(y))) if x[i] != y[i]), min(len(x), len(y)))
    print("   before:", repr(x[max(0, i-60): i+80])); print("   after: ", repr(y[max(0, i-60): i+80]))
