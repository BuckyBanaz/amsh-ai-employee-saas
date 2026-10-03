import ast
import pathlib
import re
import sys

ROOT = pathlib.Path(r"C:\Users\Parikshit\Desktop\saas\backend\ai")
SKIP = ("evals", "locales", "__pycache__")
LONG = 45  # characters: prose / prompt text, not identifiers


def is_doc(node, parent_map):
    parent = parent_map.get(node)
    return isinstance(parent, ast.Expr)


rows = []
for path in sorted(ROOT.rglob("*.py")):
    if any(part in SKIP for part in path.parts):
        continue
    src = path.read_text(encoding="utf-8-sig")
    try:
        tree = ast.parse(src)
    except SyntaxError:
        continue
    parents = {c: p for p in ast.walk(tree) for c in ast.iter_child_nodes(p)}
    text_chars = prose = regexes = non_latin = consts = 0
    for node in ast.walk(tree):
        if isinstance(node, ast.Constant) and isinstance(node.value, str) and not is_doc(node, parents):
            v = node.value
            if len(v) >= LONG and " " in v:
                prose += 1
                text_chars += len(v)
            if re.search(r"[\u0900-\u097F\u0600-\u06FF]", v):
                non_latin += 1
        if isinstance(node, ast.Call) and getattr(node.func, "attr", "") == "compile" and getattr(getattr(node.func, "value", None), "id", "") == "re":
            regexes += 1
        if isinstance(node, ast.Assign) and len(node.targets) == 1 and isinstance(node.targets[0], ast.Name):
            n = node.targets[0].id
            if n.isupper() and isinstance(node.value, ast.Constant) and isinstance(node.value.value, (int, float)):
                consts += 1
    if prose or regexes or non_latin or consts:
        rows.append((text_chars, str(path.relative_to(ROOT)), prose, regexes, non_latin, consts))

rows.sort(reverse=True)
print(f"{'file':52} {'prose':>5} {'chars':>6} {'regex':>5} {'nonLat':>6} {'numConst':>8}")
for chars, rel, prose, regexes, nl, consts in rows[:28]:
    print(f"{rel:52} {prose:5d} {chars:6d} {regexes:5d} {nl:6d} {consts:8d}")
print("TOTAL prose strings:", sum(r[2] for r in rows), "chars:", sum(r[0] for r in rows), "regexes:", sum(r[3] for r in rows), "numeric constants:", sum(r[5] for r in rows))
