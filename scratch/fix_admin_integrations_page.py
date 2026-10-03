import ast  # noqa: F401  (kept for symmetry with the other scripts)
import pathlib
import re

p = pathlib.Path(r"C:\Users\Parikshit\Desktop\saas\frontend\admin\src\app\(admin)\integrations\page.tsx")
s = p.read_text(encoding="utf-8")


def sub1(old, new):
    global s
    assert s.count(old) == 1, old[:70]
    s = s.replace(old, new, 1)


# 1. drop the hardcoded fake catalog (it started every page load as "Connected")
a = s.index("const INITIAL_PLATFORM_INTEGRATIONS: PlatformIntegration[] = [")
b = s.index("\n];\n", a) + len("\n];\n")
s = s[:a] + s[b:].lstrip("\n")

# 2. the data model carries the live message and where credentials are managed
sub1("  config: Record<string, string>;\n}", "  config: Record<string, string>;\n  message?: string;\n  managed_by?: string;\n}")

# 3. start empty, never fall back to made-up data
sub1("useState<PlatformIntegration[]>(INITIAL_PLATFORM_INTEGRATIONS);", "useState<PlatformIntegration[]>([]);")
sub1("  const [backendOnline, setBackendOnline] = useState<boolean | null>(null);\n",
     "  const [backendOnline, setBackendOnline] = useState<boolean | null>(null);\n  const [loadError, setLoadError] = useState<string>('');\n")
sub1("""        if (Array.isArray(data) && data.length > 0) {
          setIntegrations(data);
        }
        setBackendOnline(true);
      } else {
        setBackendOnline(false);
      }
    } catch {
      // Backend container not currently running on :8010; graceful fallback to cached platform catalog
      setBackendOnline(false);
    }""", """        setIntegrations(Array.isArray(data) ? data : []);
        setBackendOnline(true);
        setLoadError('');
      } else {
        setBackendOnline(false);
        setLoadError(res.status === 401 || res.status === 403 ? 'Sign in as a platform admin to see live integration status.' : `The server answered ${res.status}.`);
      }
    } catch {
      setBackendOnline(false);
      setLoadError('Could not reach the API server.');
    }""")
sub1("'Offline (Cached Defaults)'", "'API unavailable'")

# 4. a ping shows what the backend measured, never an invented number
sub1("latency_ms: data.latency_ms || 95,", "latency_ms: data.latency_ms ?? 0,")
sub1("""    integrations.reduce((acc, curr) => acc + (curr.latency_ms || 100), 0) / (integrations.length || 1)""",
     """    integrations.filter((i) => i.latency_ms != null).reduce((acc, curr) => acc + (curr.latency_ms || 0), 0) /
      (integrations.filter((i) => i.latency_ms != null).length || 1)""")

# 5. credentials are managed in .env: the modal is read-only, nothing is saved
sub1("<p className=\"text-[11px] text-slate-500\">Update global infrastructure credentials</p>",
     "<p className=\"text-[11px] text-slate-500\">Credentials are read from the server .env file. They are not stored in the database and cannot be edited here.</p>")
sub1("""                    <input
                      type={isSecret ? "password" : "text"}
                      value={val}
                      onChange={(e) => setEditConfig({ ...editConfig, [fieldKey]: e.target.value })}""",
     """                    <input
                      type={isSecret ? "password" : "text"}
                      value={val}
                      readOnly""")
s = re.sub(r"\n\s*<button\n\s*type=\"button\"\n\s*disabled=\{isSaving\}\n\s*onClick=\{handleSaveConfig\}.*?</button>", "", s, count=1, flags=re.S)
p.write_text(s, encoding="utf-8")
print("page patched; leftover handleSaveConfig refs:", s.count("handleSaveConfig"), "isSaving refs:", s.count("isSaving"))
