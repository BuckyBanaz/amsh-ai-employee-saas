"""List inline prose (plain and f-strings) in a module with line, enclosing function and the call it sits in.
usage: python list_prose.py backend/ai/engine/agent/toolbox.py [min_len]"""
import ast
import sys

path = sys.argv[1]
min_len = int(sys.argv[2]) if len(sys.argv) > 2 else 30
src = open(path, encoding="utf-8-sig").read()
tree = ast.parse(src)
parents = {c: p for p in ast.walk(tree) for c in ast.iter_child_nodes(p)}


def enclosing_func(node):
    while node in parents:
        node = parents[node]
        if isinstance(node, (ast.FunctionDef, ast.AsyncFunctionDef)):
            return node.name
    return "<module>"


def call_name(node):
    while node in parents:
        node = parents[node]
        if isinstance(node, ast.Call):
            f = node.func
            return getattr(f, "id", getattr(f, "attr", "?"))
        if isinstance(node, (ast.FunctionDef, ast.Module)):
            break
    return ""


seen = set()
for node in ast.walk(tree):
    if isinstance(node, ast.JoinedStr):
        seen.update(id(v) for v in node.values)
for node in sorted((n for n in ast.walk(tree) if isinstance(n, (ast.Constant, ast.JoinedStr))), key=lambda n: (n.lineno, n.col_offset)):
    if id(node) in seen:
        continue
    if isinstance(node, ast.Constant):
        if not (isinstance(node.value, str) and len(node.value) >= min_len and " " in node.value):
            continue
        # skip docstrings
        if isinstance(parents.get(node), ast.Expr):
            continue
        text, kind = node.value, "str"
    else:
        text = ast.get_source_segment(src, node) or ""
        if len(text) < min_len or " " not in text:
            continue
        kind = "f-str"
    print(f"{node.lineno:4d} {kind:5s} {enclosing_func(node):28s} {call_name(node):10s} {text[:110]!r}")
