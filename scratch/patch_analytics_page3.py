import pathlib

p = pathlib.Path(r"C:\Users\Parikshit\Desktop\saas\frontend\admin\src\app\(admin)\analytics\page.tsx")
s = p.read_text(encoding="utf-8")


def sub(old, new):
    global s
    assert s.count(old) == 1, old[:70]
    s = s.replace(old, new, 1)


sub("import { BarsWithLines, COLORS, Donut, GroupedBars, Sparkline, StackedBars, compact, downsample }",
    "import { AreaLines, BarsWithLines, COLORS, Donut, Funnel, GroupedBars, Sparkline, StackedBars, downsample }")
sub("growth: { date: string; total: number; trial: number; paid: number }[];", "growth: { date: string; total: number; trial: number; paid: number; inactive: number }[];")

# KPI card: icon, text, delta line, big sparkline on the right (as in the design)
a = s.index('              <div key={c.name} className="rounded-xl border border-[#E2E8F0] bg-white p-3.5 shadow-2xs">')
b = s.index("            ))}\n          </dl>")
s = s[:a] + """              <div key={c.name} className="flex items-stretch justify-between gap-2 rounded-xl border border-[#E2E8F0] bg-white p-3.5 shadow-2xs">
                <div className="flex min-w-0 items-start gap-3">
                  <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl" style={{ backgroundColor: `${c.color}1A`, color: c.color }}>
                    <svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                      <path d={c.icon} />
                    </svg>
                  </span>
                  <div className="min-w-0">
                    <dt className="truncate text-[11px] font-medium text-[#64748B]">{c.name}</dt>
                    <dd className="truncate text-[22px] font-bold leading-tight tabular-nums tracking-tight text-[#0F172A]">{c.value}</dd>
                    <p className="mt-0.5 text-[11px] font-medium leading-tight" style={{ color: c.tone }}>{c.sub}</p>
                  </div>
                </div>
                <div className="flex shrink-0 items-end">
                  <Sparkline values={c.spark} color={c.color} />
                </div>
              </div>
""" + s[b:]

# card tones for the sub text
sub("sub: change(k.newBusinesses, k.newBusinessesPrevious) || 'no new in period', color: COLORS.blue,", "sub: change(k.newBusinesses, k.newBusinessesPrevious) || 'no new in period', tone: COLORS.green, color: COLORS.blue,")
sub("sub: `${pct(k.trial, k.totalBusinesses)} of total`, color: COLORS.purple,", "sub: `${pct(k.trial, k.totalBusinesses)} of total`, tone: '#64748B', color: COLORS.purple,")
sub("sub: `${pct(k.paid, k.totalBusinesses)} of total`, color: COLORS.green,", "sub: `${pct(k.paid, k.totalBusinesses)} of total`, tone: '#64748B', color: COLORS.green,")
sub("sub: data.funnel.trial ? `${pct(k.converted, data.funnel.trial)} trial → paid` : 'no trials yet', color: COLORS.purple,", "sub: data.funnel.trial ? `${pct(k.converted, data.funnel.trial)} trial → paid rate` : 'no trials yet', tone: COLORS.green, color: COLORS.purple,")
sub("sub: `${pct(k.inactive, k.totalBusinesses)} paused or suspended`, color: COLORS.red,", "sub: `${pct(k.inactive, k.totalBusinesses)} of total`, tone: k.inactive ? COLORS.red : '#64748B', color: COLORS.red,")
sub("sub: mrrText ? `plan value ${mrrText}/mo` : change(Object.values(k.revenue)[0] ?? 0, k.revenuePrevious) || 'no payments in period', color: COLORS.blue,", "sub: mrrText ? `plan value ${mrrText}/mo` : change(Object.values(k.revenue)[0] ?? 0, k.revenuePrevious) || 'no payments in period', tone: '#64748B', color: COLORS.blue,")
sub("{ name: 'Revenue Collected',", "{ name: 'Revenue (collected)',")

# funnel card with real funnel shape + numbers
a = s.index('            <Card title="Business Conversion Funnel">')
b = s.index("            </Card>\n          </div>", a) + len("            </Card>\n")
s = s[:a] + """            <Card title="Business Conversion Funnel">
              <div className="flex items-center gap-3">
                <Funnel
                  steps={[
                    { label: 'Total signups', value: data.funnel.signups, color: COLORS.lightBlue },
                    { label: 'Started trial', value: data.funnel.trial, color: COLORS.blue },
                    { label: 'Converted to paid', value: data.funnel.converted, color: COLORS.purple },
                    { label: 'Active paid', value: data.funnel.paid, color: COLORS.green },
                  ]}
                />
                <ul className="min-w-0 flex-1 space-y-[26px] text-xs">
                  {[
                    ['Total signups', data.funnel.signups],
                    ['Started trial', data.funnel.trial],
                    ['Converted to paid', data.funnel.converted],
                    ['Active paid', data.funnel.paid],
                  ].map(([label, value]) => (
                    <li key={label as string} className="flex items-baseline justify-between gap-2">
                      <span className="text-[#64748B]">{label}</span>
                      <span className="font-bold tabular-nums text-[#0F172A]">
                        {value} <span className="font-normal text-[#94A3B8]">{pct(value as number, data.funnel.signups)}</span>
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
            </Card>
""" + s[b:]

# revenue trend: always draw
a = s.index('            <Card title="Revenue Trend">')
b = s.index("            </Card>\n", a) + len("            </Card>\n")
s = s[:a] + """            <Card title="Revenue Trend">
              <Legend items={[{ name: `Revenue collected (${data.currency})`, color: COLORS.blue }, { name: 'Cumulative', color: COLORS.green, line: true }]} />
              <BarsWithLines
                labels={derived.revenue.map((r) => shortDate(r.date))}
                bars={derived.revenue.map((r) => r.revenue)}
                barColor={COLORS.blue}
                barName={data.currency}
                lineOnBarScale
                lines={[{ name: 'Cumulative', color: COLORS.green, values: derived.revenue.map((r) => r.cumulative) }]}
              />
              <p className="mt-1 text-[10px] text-[#94A3B8]">
                {Object.values(k.revenue).every((v) => v === 0) ? 'No payments were recorded in this period. ' : ''}
                {mrrText ? `Plan value of active paying businesses: ${mrrText} / month (list price, not collected).` : ''}
              </p>
            </Card>
""" + s[b:]

# status card -> Retention & Churn chart
a = s.index('            <Card title="Businesses by Status">')
b = s.index("            </Card>\n", a) + len("            </Card>\n")
s = s[:a] + """            <Card title="Retention & Churn">
              <Legend items={[{ name: 'Active', color: COLORS.green }, { name: 'Churned / inactive', color: COLORS.red }]} />
              <AreaLines
                labels={derived.growth.map((g) => shortDate(g.date))}
                series={[
                  { name: 'Active', color: COLORS.green, values: derived.growth.map((g) => g.total - g.inactive) },
                  { name: 'Churned / inactive', color: COLORS.red, values: derived.growth.map((g) => g.inactive) },
                ]}
              />
              <p className="mt-1 text-[10px] text-[#94A3B8]">
                {Object.entries(data.byStatus).map(([st, n]) => `${cap(st)} ${n}`).join(' · ')}. Plotted by sign-up date and today&apos;s status: the platform keeps no status history.
              </p>
            </Card>
""" + s[b:]

# trial vs paid: always draw
a = s.index('            <Card title="Trial vs Paid Businesses">')
b = s.index("            </Card>\n", a) + len("            </Card>\n")
s = s[:a] + """            <Card title="Trial vs Paid Businesses">
              <Legend items={[{ name: 'Trial started', color: COLORS.lightBlue }, { name: 'Converted to paid', color: COLORS.green }]} />
              <GroupedBars labels={data.weekly.map((w) => w.label)} data={[{ name: 'Trial started', color: COLORS.lightBlue, values: data.weekly.map((w) => w.trials) }, { name: 'Converted', color: COLORS.green, values: data.weekly.map((w) => w.converted) }]} />
              {data.weekly.every((w) => w.trials === 0 && w.converted === 0) && <p className="mt-1 text-[10px] text-[#94A3B8]">No trials started or converted in this period.</p>}
            </Card>
""" + s[b:]

# call chart: always draw
sub("""              {data.calls.total === 0 ? (
                <Empty text="No calls in this period." />
              ) : (
                <>
                  <Legend items={[{ name: 'Total calls', color: COLORS.lightBlue }""", """              {(
                <>
                  <Legend items={[{ name: 'Total calls', color: COLORS.lightBlue }""")
sub("""                  </p>
                </>
              )}
            </Card>

            <Card title="Calls by Vertical">""", """                  </p>
                </>
              )}
            </Card>

            <Card title="Calls by Vertical">""")

# top businesses: avatar tile
sub("rows={data.topBusinesses.map((b) => [b.name, b.calls.toLocaleString(), b.appointments, `${b.conversion}%`])}",
    "rows={data.topBusinesses.map((b) => [<span key=\"n\" className=\"inline-flex items-center gap-2\"><span className=\"flex h-5 w-5 items-center justify-center rounded-md bg-[#EFF6FF] text-[9px] font-bold text-[#2563EB]\">{b.name.slice(0, 1).toUpperCase()}</span>{b.name}</span>, b.calls.toLocaleString(), b.appointments, `${b.conversion}%`])}")
p.write_text(s, encoding="utf-8")
print("analytics page matched to design")
