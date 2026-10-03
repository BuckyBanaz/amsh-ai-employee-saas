import pathlib
import re

p = pathlib.Path(r"C:\Users\Parikshit\Desktop\saas\frontend\admin\src\app\(admin)\integrations\page.tsx")
s = p.read_text(encoding="utf-8")


def sub1(old, new):
    global s
    assert s.count(old) == 1, old[:70]
    s = s.replace(old, new, 1)


# dead save handler + state (credentials are read-only now)
a = s.index("  const handleSaveConfig = async () => {")
b = s.index("  const filtered = integrations.filter(")
s = s[:a] + s[b:]
sub1("  const [isSaving, setIsSaving] = useState(false);\n", "")

# a visible, honest error instead of silent fake data
sub1("      {/* Tabs */}\n", """      {loadError && (
        <div className="mb-4 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-xs font-semibold text-amber-800">{loadError}</div>
      )}

      {/* Tabs */}
""")

# the real message of the last check on every card
sub1("              {/* Bottom Actions: Default Toggle, Ping Test, Configure */}", """              {item.message && (
                <p className={`text-[11px] leading-snug ${item.status === 'Connected' ? 'text-slate-500' : 'text-amber-700'}`}>{item.message}</p>
              )}

              {/* Bottom Actions: Default Toggle, Ping Test, Configure */}""")
p.write_text(s, encoding="utf-8")
print("ok; setIsSaving refs:", s.count("setIsSaving"), "editConfig refs:", s.count("editConfig"))
