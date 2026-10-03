import pathlib

p = pathlib.Path(r"C:\Users\Parikshit\Desktop\saas\frontend\admin\src\app\(admin)\integrations\page.tsx")
s = p.read_text(encoding="utf-8")


def sub(old, new):
    global s
    assert s.count(old) == 1, old[:60]
    s = s.replace(old, new, 1)


sub("import { SmtpConfigDialog } from '../../../components/admin/SmtpConfigDialog';\n",
    "import { SmtpConfigDialog } from '../../../components/admin/SmtpConfigDialog';\nimport { CredentialsDialog } from '../../../components/admin/CredentialsDialog';\n")
sub("  managed_by?: string;\n}", "  managed_by?: string;\n  sources?: Record<string, string>;\n  overridden?: boolean;\n}")
sub("  const [smtpOpen, setSmtpOpen] = useState(false);\n", "  const [smtpOpen, setSmtpOpen] = useState(false);\n  const [editing, setEditing] = useState<Integration | null>(null);\n")

# Configure for every provider
a = s.index("                    {item.configurable && (")
b = s.index("                    )}", a) + len("                    )}")
s = s[:a] + """                    <button
                      type="button"
                      onClick={() => (item.id === 'platform_smtp' ? setSmtpOpen(true) : setEditing(item))}
                      className="inline-flex h-9 items-center rounded-lg bg-slate-900 px-3 text-sm font-semibold text-white transition-colors hover:bg-slate-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0066FF] focus-visible:ring-offset-2"
                    >
                      Configure
                    </button>""" + s[b:]

# dialog mount
sub("      {smtpOpen && (", """      {editing && (
        <CredentialsDialog
          provider={editing}
          onClose={() => setEditing(null)}
          onChanged={() => {
            setNotice(`${editing.name} updated. Checking the connection...`);
            load();
          }}
        />
      )}

      {smtpOpen && (""")

# pick up the background refresh quickly when something has never been checked
sub("""        setItems(Array.isArray(data) ? data : []);
        setLoadError('');""", """        setItems(Array.isArray(data) ? data : []);
        setLoadError('');
        if (Array.isArray(data) && data.some((i: Integration) => !i.last_checked_at)) window.setTimeout(() => load(), 4000);""")
p.write_text(s, encoding="utf-8")
print("page patched")
