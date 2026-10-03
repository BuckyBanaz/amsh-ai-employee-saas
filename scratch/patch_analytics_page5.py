import pathlib

base = pathlib.Path(r"C:\Users\Parikshit\Desktop\saas\frontend\admin\src")
p = base / "app" / "(admin)" / "analytics" / "page.tsx"
s = p.read_text(encoding="utf-8")


def sub(old, new, count=1):
    global s
    assert s.count(old) == count, (s.count(old), old[:70])
    s = s.replace(old, new)


# ---- responsive grids (every card may shrink: min-w-0)
sub("<section className={`rounded-xl border border-[#E2E8F0] bg-white p-4 shadow-2xs ${className}`}>", "<section className={`min-w-0 rounded-xl border border-[#E2E8F0] bg-white p-4 shadow-2xs ${className}`}>")
sub('<dl className="grid grid-cols-2 gap-3 lg:grid-cols-3 xl:grid-cols-6">', '<dl className="grid grid-cols-1 gap-3 min-[480px]:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-6">')
sub('<div key={c.name} className="flex items-stretch justify-between gap-2 rounded-xl border border-[#E2E8F0] bg-white p-3.5 shadow-2xs">', '<div key={c.name} className="flex min-w-0 items-stretch justify-between gap-2 overflow-hidden rounded-xl border border-[#E2E8F0] bg-white p-3.5 shadow-2xs">')
sub('<div className="grid gap-3.5 lg:grid-cols-[1.6fr_1fr_1fr]">', '<div className="grid gap-3.5 lg:grid-cols-2 xl:grid-cols-[1.5fr_1fr_1fr]">')
sub('<Card title="Business Growth">', '<Card title="Business Growth" className="lg:col-span-2 xl:col-span-1">')
sub('<div className="grid gap-3.5 lg:grid-cols-3">', '<div className="grid gap-3.5 md:grid-cols-2 xl:grid-cols-3">', 2)
sub('<div className="grid gap-3.5 lg:grid-cols-[1.6fr_1fr_1.2fr]">', '<div className="grid gap-3.5 lg:grid-cols-2 xl:grid-cols-[1.6fr_1fr_1.2fr]">')
sub('<Card title="Call Volume & AI Performance">', '<Card title="Call Volume & AI Performance" className="lg:col-span-2 xl:col-span-1">')
sub('<Card title="Revenue Trend">', '<Card title="Revenue Trend" className="md:col-span-2 xl:col-span-1">')
sub('<div className="flex items-center gap-3">\n                <Funnel', '<div className="flex flex-wrap items-center gap-x-4 gap-y-2">\n                <Funnel')
sub('<ul className="min-w-0 flex-1 text-xs">', '<ul className="min-w-[150px] flex-1 text-xs">')
sub('<div className="flex flex-wrap items-center gap-4">\n                  <Donut', '<div className="flex flex-wrap items-center justify-center gap-4 sm:justify-start">\n                  <Donut')
sub('<ul className="min-w-0 flex-1 space-y-2">', '<ul className="min-w-[140px] flex-1 space-y-2">')

# header: let the controls wrap on small screens
sub('<div className="flex flex-wrap items-center gap-2">\n          {data && <span', '<div className="flex w-full flex-wrap items-center gap-2 sm:w-auto">\n          {data && <span')
sub('<div role="tablist" aria-label="Period" className="inline-flex gap-1 rounded-lg bg-[#F1F5F9] p-1">', '<div role="tablist" aria-label="Period" className="inline-flex gap-1 rounded-lg bg-[#F1F5F9] p-1">')

# ---- sample-data toggle
sub("  const [days, setDays] = useState(30);\n  const [data, setData] = useState<Analytics | null>(null);",
    "  const [days, setDays] = useState(30);\n  const [sample, setSample] = useState(false);\n  const [live, setLive] = useState<Analytics | null>(null);")
sub("        .then((d) => alive && (setData(d), setError('')))", "        .then((d) => alive && (setLive(d), setError('')))")
sub("  const derived = useMemo(() => {", "  const data = useMemo(() => (sample ? buildSampleAnalytics(days) : live), [sample, days, live]);\n\n  const derived = useMemo(() => {")
sub("  const k = data?.kpis;", "  const k = data?.kpis;\n  const showError = error && !sample;")
sub("{error && <p role=\"alert\"", "{showError && <p role=\"alert\"")
sub("{!data && !error && <p", "{!data && !showError && <p")
sub("          <button onClick={exportCsv} disabled={!data}",
    """          <button
            type="button"
            role="switch"
            aria-checked={sample}
            onClick={() => setSample((v) => !v)}
            className={`inline-flex h-8 items-center gap-2 rounded-lg border px-3 text-xs font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#2563EB] ${sample ? 'border-[#F59E0B] bg-[#FEF3C7] text-[#92400E]' : 'border-[#E2E8F0] bg-white text-[#475569] hover:bg-[#F8FAFC]'}`}
          >
            <span className={`h-2 w-2 rounded-full ${sample ? 'bg-[#F59E0B]' : 'bg-[#CBD5E1]'}`} />
            Sample data {sample ? 'on' : 'off'}
          </button>
          <button onClick={exportCsv} disabled={!data}""")
sub("<p className=\"text-[10px] text-[#94A3B8]\">Updated {new Date(data.generatedAt).toLocaleTimeString()}",
    "{sample && <p role=\"note\" className=\"rounded-lg border border-[#FDE68A] bg-[#FFFBEB] px-3 py-1.5 text-[11px] font-medium text-[#92400E]\">Showing invented sample numbers for preview. Switch Sample data off to see the live platform.</p>}\n          <p className=\"text-[10px] text-[#94A3B8]\">Updated {new Date(data.generatedAt).toLocaleTimeString()}")
p.write_text(s, encoding="utf-8")

# ---- chart components: funnel scales down
c = base / "components" / "admin" / "AnalyticsCharts.tsx"
t = c.read_text(encoding="utf-8")
t = t.replace('className="w-full max-w-[220px] shrink-0" role="img" aria-label="Conversion funnel"', 'className="w-[150px] shrink-0 sm:w-[190px]" role="img" aria-label="Conversion funnel"', 1)
c.write_text(t, encoding="utf-8")
print("page5 ok")
