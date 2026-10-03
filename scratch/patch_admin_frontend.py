import pathlib

base = pathlib.Path(r"C:\Users\Parikshit\Desktop\saas\frontend\admin\src\app\(admin)")

# ---- health
p = base / "health" / "page.tsx"
s = p.read_text(encoding="utf-8")


def sub(old, new):
    global s
    assert s.count(old) == 1, old[:60]
    s = s.replace(old, new, 1)


sub("type HealthStatus = 'Operational' | 'Degraded';", "type HealthStatus = 'Operational' | 'Degraded' | 'Not configured' | 'Unknown';")
sub("""  latency: string;
  errorRate: string;
  requestsPerMinute: string;
  uptime: string;
}""", """  latency: string | null;
  errorRate: string | null;
  detail?: string | null;
}""")
sub("""        isOperational ? 'bg-[#D1FAE5] text-[#047857]' : 'bg-[#FEF3C7] text-[#B45309]'
      }`}
    >
      <span className={`h-1.5 w-1.5 rounded-full ${isOperational ? 'bg-[#10B981]' : 'bg-[#F59E0B]'}`} />""",
    """        isOperational ? 'bg-[#D1FAE5] text-[#047857]' : status === 'Degraded' ? 'bg-[#FEF3C7] text-[#B45309]' : 'bg-[#F1F5F9] text-[#475569]'
      }`}
    >
      <span className={`h-1.5 w-1.5 rounded-full ${isOperational ? 'bg-[#10B981]' : status === 'Degraded' ? 'bg-[#F59E0B]' : 'bg-[#94A3B8]'}`} />""")
i = s.index('      <dl className="space-y-1">')
j = s.index("      </dl>") + len("      </dl>")
s = s[:i] + """      <dl className="space-y-1">
        <div className="flex items-center justify-between gap-2">
          <dt className="text-[11px] text-[#94A3B8]">Latency</dt>
          <dd className="text-xs font-bold text-[#334155]">{service.latency ?? '–'}</dd>
        </div>
        {service.errorRate && (
          <div className="flex items-center justify-between gap-2">
            <dt className="text-[11px] text-[#94A3B8]">Failure rate</dt>
            <dd className="text-xs font-bold text-[#334155]">{service.errorRate}</dd>
          </div>
        )}
      </dl>
      {service.detail && <p className="mt-2 text-[11px] leading-snug text-[#64748B]">{service.detail}</p>}""" + s[j:]
i = s.index('          <button className="inline-flex items-center gap-1.5')
j = s.index("</button>", i) + len("</button>")
s = s[:i] + "          <span className=\"text-[11px] text-[#94A3B8]\">{checkedAt ? `Updated ${new Date(checkedAt).toLocaleTimeString()}` : ''}</span>" + s[j:]
sub("  const [loading, setLoading] = useState(true);\n\n  useEffect(() => {\n    async function loadHealth() {",
    "  const [loading, setLoading] = useState(true);\n  const [checkedAt, setCheckedAt] = useState<string | null>(null);\n\n  useEffect(() => {\n    async function loadHealth() {")
sub("        setServices(response.services || []);\n", "        setServices(response.services || []);\n        setCheckedAt(response.generatedAt || null);\n")
sub("    loadHealth();\n  }, []);", "    loadHealth();\n    const timer = window.setInterval(() => document.visibilityState === 'visible' && loadHealth(), 30000);\n    return () => window.clearInterval(timer);\n  }, []);")
sub("Technical infrastructure monitoring.", "Measured live: database and Redis are timed on each refresh, providers show their last real check. Refreshes every 30 seconds.")
p.write_text(s, encoding="utf-8")

# ---- notifications
p = base / "notifications" / "page.tsx"
s = p.read_text(encoding="utf-8")
sub("System alerts and updates.", "Providers that need attention and recent account activity.")
a = s.index("          notifications.map((notif: any) => (")
b = s.index("          ))", a) + len("          ))")
s = s[:a] + """          notifications.map((notif: any) => (
            <div key={notif.id} className="flex items-start justify-between gap-4 rounded-lg border border-[#E2E8F0] bg-white p-4 shadow-2xs">
              <div className="flex items-start gap-3">
                <span className={`mt-1.5 h-2 w-2 shrink-0 rounded-full ${notif.level === 'error' ? 'bg-red-500' : notif.level === 'warning' ? 'bg-amber-500' : 'bg-slate-300'}`} aria-hidden="true" />
                <div>
                  <h3 className="text-sm font-bold text-[#1E293B]">{notif.title}</h3>
                  <p className="mt-0.5 text-sm text-[#475569]">{notif.message}</p>
                  {notif.link && <a href={notif.link} className="mt-1 inline-block text-xs font-medium text-[#0066FF] hover:underline">Open</a>}
                </div>
              </div>
              <span className="shrink-0 text-xs text-[#94A3B8]">{new Date(notif.date).toLocaleString()}</span>
            </div>
          ))""" + s[b:]
p.write_text(s, encoding="utf-8")
print("frontend pages patched")
