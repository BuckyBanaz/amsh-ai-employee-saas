"""Move inline prose (plain strings and f-strings) of one module into backend/ai/prompts/engine_notes.json under
"messages.<group>.<key>", replacing each by `_msg("<group>.<key>", name=expr, ...)`.

usage (repo root, PYTHONPATH=. PYTHONUTF8=1):
  python scratch/hardcode_refactor/externalize.py <module path> <group> [--min-len N] [--apply]
Without --apply it only prints the plan (key, template, args). Quotes/braces are escaped for str.format.
"""
import ast
import json
import re
import sys

path, group = sys.argv[1], sys.argv[2]
min_len = int(sys.argv[sys.argv.index("--min-len") + 1]) if "--min-len" in sys.argv else 30
apply_changes = "--apply" in sys.argv
NOTES = "backend/ai/prompts/engine_notes.json"

src = open(path, encoding="utf-8").read()
tree = ast.parse(src)
parents = {c: p for p in ast.walk(tree) for c in ast.iter_child_nodes(p)}
line_starts = [0]
for line in src.split("\n"):
    line_starts.append(line_starts[-1] + len(line.encode("utf-8")) + 1)
raw = src.encode("utf-8")


def offset(lineno, col):
    return line_starts[lineno - 1] + col  # col_offset is in UTF-8 bytes


def func_of(node):
    while node in parents:
        node = parents[node]
        if isinstance(node, (ast.FunctionDef, ast.AsyncFunctionDef)):
            return node.name
    return None


def call_of(node):
    while node in parents:
        node = parents[node]
        if isinstance(node, ast.Call):
            return node
        if isinstance(node, (ast.FunctionDef, ast.AsyncFunctionDef, ast.Module)):
            return None
    return None


def slug(text):
    words = re.findall(r"[a-z]+", text.lower())
    return "_".join(words[:4]) or "text"


def esc(text):
    return text.replace("{", "{{").replace("}", "}}")


def expr_name(expr, used):
    node = expr
    name = None
    if isinstance(node, ast.Call):
        f = node.func
        if isinstance(f, ast.Attribute) and f.attr == "get" and node.args and isinstance(node.args[0], ast.Constant):
            name = str(node.args[0].value)
        elif isinstance(f, ast.Attribute) and f.attr == "join":
            name = "items"
        else:
            name = getattr(f, "id", getattr(f, "attr", None))
    elif isinstance(node, ast.Name):
        name = node.id
    elif isinstance(node, ast.Attribute):
        name = node.attr
    elif isinstance(node, ast.IfExp):
        name = expr_name(node.body, used)
    name = re.sub(r"\W", "_", name or "value")
    base, i = name, 2
    while name in used:
        name, i = f"{base}{i}", i + 1
    used.add(name)
    return name


targets = []
inner = set()
for n in ast.walk(tree):
    if isinstance(n, ast.JoinedStr):
        inner.update(id(v) for v in ast.walk(n) if v is not n)
for n in ast.walk(tree):
    if id(n) in inner:
        continue
    if isinstance(n, ast.Constant) and isinstance(n.value, str):
        if isinstance(parents.get(n), ast.Expr) or len(n.value) < min_len or " " not in n.value:
            continue
        # skip strings that are already arguments of our _msg() helper or dict keys / format specs
        c = call_of(n)
        if c is not None and getattr(c.func, "id", "") == "_msg":
            continue
        targets.append(n)
    elif isinstance(n, ast.JoinedStr):
        text = ast.get_source_segment(src, n) or ""
        if len(text) >= min_len and " " in text and any(isinstance(v, ast.Constant) and " " in str(v.value) for v in n.values):
            targets.append(n)

OVERRIDES = {}
if "--overrides" in sys.argv:
    OVERRIDES = json.load(open(sys.argv[sys.argv.index("--overrides") + 1], encoding="utf-8"))
plan = []
used_keys = set()
per_line = {}
for n in sorted(targets, key=lambda x: (x.lineno, x.col_offset)):
    idx = per_line.get(n.lineno, 0)
    per_line[n.lineno] = idx + 1
    override = OVERRIDES.get(f"{n.lineno}#{idx}") or OVERRIDES.get(str(n.lineno)) or {}
    fname = func_of(n)
    call = call_of(n)
    code = None
    if call is not None and getattr(call.func, "id", "") in ("err", "_not_from_caller") and call.args and isinstance(call.args[0], ast.Constant):
        code = str(call.args[0].value)
    if call is not None and getattr(call.func, "id", "") == "_fn" and call.args and isinstance(call.args[0], ast.Constant):
        base = "tools." + str(call.args[0].value)
    elif fname is None:
        parent = parents.get(n)
        var = parent.targets[0].id if isinstance(parent, ast.Assign) and isinstance(parent.targets[0], ast.Name) else "text"
        base = f"{var.lower().lstrip('_')}"
    else:
        base = f"{fname.lstrip('_').removeprefix('tool_')}"
    if isinstance(n, ast.Constant):
        template, args = esc(n.value), {}
        tail = code or slug(n.value)
    else:
        parts, args, names = [], {}, set()
        for v in n.values:
            if isinstance(v, ast.Constant):
                parts.append(esc(str(v.value)))
            else:
                nm = expr_name(v.value, names)
                args[nm] = ast.get_source_segment(src, v.value)
                spec = ""
                if v.format_spec is not None:
                    spec = ":" + "".join(str(x.value) for x in v.format_spec.values if isinstance(x, ast.Constant))
                parts.append("{" + nm + spec + "}")
        template = "".join(parts)
        tail = code or slug(re.sub(r"\{[^}]*\}", " ", template))
    key = override.get("key") or (f"{base}.{tail}" if not base.startswith("tools.") else base)
    if override.get("args"):  # rename placeholders: {old} -> {new}
        for old_name, new_name in override["args"].items():
            template = template.replace("{" + old_name + "}", "{" + new_name + "}").replace("{" + old_name + ":", "{" + new_name + ":")
            args = {(new_name if a == old_name else a): v for a, v in args.items()}
    k, i = key, 2
    if override.get("key") and any(pk == key and pt == template for _, pk, pt, _ in plan):
        k = key  # the same message used twice: one catalog entry
    else:
        while k in used_keys:
            k, i = f"{key}_{i}", i + 1
    used_keys.add(k)
    plan.append((n, k, template, args))

for n, key, template, args in plan:
    print(f"{n.lineno:4d} {key:48s} {template[:90]!r}" + (f"  args={list(args)}" if args else ""))
print(f"\n{len(plan)} messages")

if apply_changes:
    notes = json.load(open(NOTES, encoding="utf-8"))
    messages = notes.setdefault("messages", {}).setdefault(group, {})
    edits = []
    for n, key, template, args in plan:
        messages[key] = template
        call_src = f'_msg("{group}.{key}"' + "".join(f", {k}={v}" for k, v in args.items()) + ")"
        edits.append((offset(n.lineno, n.col_offset), offset(n.end_lineno, n.end_col_offset), call_src))
    out = bytearray(raw)
    for start, end, text in sorted(edits, key=lambda e: -e[0]):
        out[start:end] = text.encode("utf-8")
    new_src = out.decode("utf-8")
    new_tree = ast.parse(new_src)
    # helper + import after the last top-level import
    lines = new_src.split("\n")
    last_import = max(x.end_lineno for x in new_tree.body if isinstance(x, (ast.Import, ast.ImportFrom)))
    helper = ['from backend.ai.prompts import load_prompts', '', '', 'def _msg(key: str, **fmt) -> str:',
              '    """Model-facing message from ai/prompts/engine_notes.json ("messages"); `fmt` fills the {placeholders}."""',
              '    group, name = key.split(".", 1)', '    text = load_prompts("engine_notes")["messages"][group][name]',
              '    return text.format(**fmt) if fmt else text.replace("{{", "{").replace("}}", "}")']
    lines[last_import:last_import] = helper
    final = "\n".join(lines)
    ast.parse(final)
    open(path, "w", encoding="utf-8").write(final)
    json.dump(notes, open(NOTES, "w", encoding="utf-8"), ensure_ascii=False, indent=1)
    print("applied")
