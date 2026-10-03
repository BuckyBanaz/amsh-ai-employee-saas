import pathlib

p = pathlib.Path(r"C:\Users\Parikshit\Desktop\saas\frontend\admin\src\app\(admin)\analytics\page.tsx")
s = p.read_text(encoding="utf-8")


def sub(old, new):
    global s
    assert s.count(old) == 1, old[:70]
    s = s.replace(old, new, 1)


# revenue: line on its own right axis, money in the tooltip
sub("                lineOnBarScale\n", "                lineScale=\"own\"\n                barFmt={(v) => money(v, data.currency)}\n")

# KPI names must wrap, not be cut
sub('<dt className="truncate text-[11px] font-medium text-[#64748B]">{c.name}</dt>', '<dt className="text-[11px] font-medium leading-tight text-[#64748B]">{c.name}</dt>')
sub('<dd className="truncate text-[22px] font-bold leading-tight tabular-nums tracking-tight text-[#0F172A]">{c.value}</dd>', '<dd className="mt-0.5 text-[22px] font-bold leading-tight tabular-nums tracking-tight text-[#0F172A]">{c.value}</dd>')

# funnel numbers aligned to the steps
a = s.index('                <ul className="min-w-0 flex-1 space-y-[26px] text-xs">')
b = s.index("                </ul>", a) + len("                </ul>")
s = s[:a] + """                <ul className="min-w-0 flex-1 text-xs">
                  {[
                    ['Total signups', data.funnel.signups],
                    ['Started trial', data.funnel.trial],
                    ['Converted to paid', data.funnel.converted],
                    ['Active paid', data.funnel.paid],
                  ].map(([label, value]) => (
                    <li key={label as string} className="flex h-12 items-center justify-between gap-2">
                      <span className="leading-tight text-[#64748B]">{label}</span>
                      <span className="whitespace-nowrap font-bold tabular-nums text-[#0F172A]">
                        {value} <span className="ml-1 font-normal text-[#94A3B8]">{pct(value as number, data.funnel.signups)}</span>
                      </span>
                    </li>
                  ))}
                </ul>""" + s[b:]
p.write_text(s, encoding="utf-8")
print("page4 ok")
