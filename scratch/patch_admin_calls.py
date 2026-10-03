import pathlib, re

p = pathlib.Path(r"C:\Users\Parikshit\Desktop\saas\backend\server\api\routes\admin_calls.py")
s = p.read_text(encoding="utf-8")

# 1. delete the demo-seeding function and its call
a = s.index("def _ensure_seeded_calls(db: Session) -> None:")
m = re.search(r"\n(?=@router|def |class )", s[a + 10:])
b = a + 10 + m.start() + 1
s = s[:a] + s[b:]
assert "    _ensure_seeded_calls(db)\n" in s
s = s.replace("    _ensure_seeded_calls(db)\n", "", 1)

# 2. invented fallbacks -> real zeros
s = s.replace("or 145\n", "or 0\n", 1)
s = s.replace("if total_calls_all > 0 else 88.5", "if total_calls_all > 0 else 0.0", 1)
s = s.replace("if total_calls_all > 0 else 7.5", "if total_calls_all > 0 else 0.0", 1)

# 3. require a platform admin on the list (was optional / anonymous)
s = s.replace("admin: Optional[User] = Depends(_get_optional_admin),\n) -> Dict[str, Any]:\n    \"\"\"Platform-wide call monitoring",
              "admin: User = Depends(require_platform_admin),\n) -> Dict[str, Any]:\n    \"\"\"Platform-wide call monitoring", 1)
if "require_platform_admin" not in s.split("def list_admin_calls")[0]:
    s = s.replace("from backend.server.database.models.business import Business",
                  "from backend.server.auth.security import require_platform_admin\nfrom backend.server.database.models.business import Business", 1)
p.write_text(s, encoding="utf-8")
print("seeding removed:", "_ensure_seeded_calls" not in s, "| auth required:", "Depends(require_platform_admin)" in s)
