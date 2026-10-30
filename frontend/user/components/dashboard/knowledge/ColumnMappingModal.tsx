"use client";
import React, { useEffect, useState } from 'react';
import {
  ColumnRole,
  ColumnSetting,
  DashboardController,
  KnowledgeItem,
  KnowledgeTables,
} from '../../../controllers/dashboard.controller';

interface ColumnMappingModalProps {
  item: KnowledgeItem | null;
  onClose: () => void;
  onSaved: () => void;
}

const ROLE_LABELS: Record<ColumnRole, string> = {
  course: 'Course / item',
  country: 'Country / nationality',
  category: 'Category',
  year: 'Academic year / session',
  fee: 'Fee / price (the answer)',
  other: 'Other detail',
  ignore: 'Ignore this column',
};

const LEVEL_STYLE = {
  error: 'border-red-200 bg-red-50 text-red-700',
  warning: 'border-amber-200 bg-amber-50 text-amber-800',
  info: 'border-blue-100 bg-blue-50 text-blue-800',
};

/** "Computer Science = B.Tech CSE" lines <-> {alias: value}. */
const aliasesToText = (aliases: Record<string, string>) => Object.entries(aliases).map(([a, v]) => `${a} = ${v}`).join('\n');
const textToAliases = (text: string) =>
  Object.fromEntries(
    text
      .split('\n')
      .map((line) => line.split('='))
      .filter((parts) => parts.length === 2 && parts[0].trim() && parts[1].trim())
      .map(([a, v]) => [a.trim(), v.trim()]),
  );

/** How a document's tables are read: confirm each column's role (Fee holds the answers), rename unclear headings, add other
 * names callers use for a value, and see the problems that would make an exact fee lookup wrong. */
export function ColumnMappingModal({ item, onClose, onSaved }: ColumnMappingModalProps) {
  const [data, setData] = useState<KnowledgeTables | null>(null);
  const [draft, setDraft] = useState<Record<string, Record<string, { role: ColumnRole; label: string; aliases: string }>>>({});
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!item) return;
    let cancelled = false;
    setData(null);
    setError('');
    DashboardController.getKnowledgeTables(item.id)
      .then((res) => {
        if (cancelled) return;
        setData(res);
        setDraft(
          Object.fromEntries(
            res.tables.map((t) => [
              t.name,
              Object.fromEntries(t.columns.map((c) => [c.name, { role: c.role, label: c.label, aliases: aliasesToText(c.aliases) }])),
            ]),
          ),
        );
      })
      .catch((err) => !cancelled && setError(err?.message || 'Could not load the tables.'));
    return () => {
      cancelled = true;
    };
  }, [item]);

  if (!item) return null;

  const update = (table: string, column: string, patch: Partial<{ role: ColumnRole; label: string; aliases: string }>) =>
    setDraft((prev) => ({ ...prev, [table]: { ...prev[table], [column]: { ...prev[table][column], ...patch } } }));

  const handleSave = async () => {
    if (!data) return;
    const tables: Record<string, { columns: Record<string, ColumnSetting> }> = {};
    for (const t of data.tables) {
      const columns: Record<string, ColumnSetting> = {};
      for (const c of t.columns) {
        const d = draft[t.name][c.name];
        columns[c.name] = {
          role: d.role === c.detected_role && !c.confirmed ? null : d.role,
          label: d.label.trim() || null,
          aliases: textToAliases(d.aliases),
        };
      }
      tables[t.name] = { columns };
    }
    try {
      setSaving(true);
      setError('');
      const res = await DashboardController.saveKnowledgeTables(item.id, tables);
      setData(res);
      onSaved();
    } catch (err: any) {
      setError(err?.message || 'Could not save the column settings.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="relative w-full max-w-4xl bg-white rounded-2xl shadow-2xl border border-gray-100 overflow-hidden flex flex-col max-h-[88vh]">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 bg-[#F9FAFB]/50">
          <div>
            <h3 className="text-sm font-bold text-gray-900">Columns: {item.filename}</h3>
            <p className="text-xs text-gray-500 mt-0.5">
              Check how each column is read. The Fee column holds the answers; the other columns are matched against what callers say.
            </p>
          </div>
          <button onClick={onClose} aria-label="Close" className="w-7 h-7 flex items-center justify-center rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100">
            ✕
          </button>
        </div>

        <div className="p-6 overflow-y-auto flex-1 space-y-6">
          {error && <div className="p-3 text-xs text-red-600 bg-red-50 border border-red-200 rounded-lg" role="alert">{error}</div>}
          {!data && !error && <p className="text-xs text-gray-500">Loading tables…</p>}
          {data && data.tables.length === 0 && <p className="text-xs text-gray-500">No tables were found in this document.</p>}

          {data?.tables.map((t) => (
            <section key={t.name} className="space-y-3">
              <div className="flex items-center gap-2">
                <h4 className="text-xs font-bold text-gray-900">{t.name}</h4>
                <span className="text-[10px] text-gray-500">{t.rows} rows</span>
              </div>

              {t.issues.length > 0 && (
                <ul className="space-y-1.5">
                  {t.issues.map((issue, i) => (
                    <li key={i} className={`text-[11px] px-3 py-1.5 rounded-lg border ${LEVEL_STYLE[issue.level]}`}>
                      {issue.message}
                    </li>
                  ))}
                </ul>
              )}

              <div className="overflow-x-auto">
                <table className="w-full text-[11px] text-left border border-gray-100 rounded-lg">
                  <thead className="bg-[#F9FAFB] text-gray-500 uppercase tracking-wider text-[10px]">
                    <tr>
                      <th className="px-2.5 py-2">Column</th>
                      <th className="px-2.5 py-2">Read as</th>
                      <th className="px-2.5 py-2">Label (optional)</th>
                      <th className="px-2.5 py-2">Other names callers use</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50">
                    {t.columns.map((c) => {
                      const d = draft[t.name]?.[c.name];
                      if (!d) return null;
                      return (
                        <tr key={c.name} className="align-top">
                          <td className="px-2.5 py-2">
                            <div className="font-semibold text-gray-900">{c.name}</div>
                            <div className="text-gray-400 truncate max-w-[200px]" title={c.samples.join(', ')}>
                              {c.samples.slice(0, 3).join(', ')}{c.empty ? ` · ${c.empty} empty` : ''}
                            </div>
                          </td>
                          <td className="px-2.5 py-2">
                            <select
                              aria-label={`How ${c.name} is read`}
                              value={d.role}
                              onChange={(e) => update(t.name, c.name, { role: e.target.value as ColumnRole })}
                              className="border border-gray-200 rounded-md px-2 py-1 bg-white"
                            >
                              {data.roles.map((r) => (
                                <option key={r} value={r}>{ROLE_LABELS[r] || r}{r === c.detected_role ? ' (detected)' : ''}</option>
                              ))}
                            </select>
                          </td>
                          <td className="px-2.5 py-2">
                            <input
                              aria-label={`Label for ${c.name}`}
                              value={d.label}
                              maxLength={60}
                              placeholder={c.name}
                              onChange={(e) => update(t.name, c.name, { label: e.target.value })}
                              className="border border-gray-200 rounded-md px-2 py-1 w-36"
                            />
                          </td>
                          <td className="px-2.5 py-2">
                            {d.role === 'fee' || d.role === 'ignore' ? (
                              <span className="text-gray-400">—</span>
                            ) : (
                              <textarea
                                aria-label={`Other names for values of ${c.name}`}
                                value={d.aliases}
                                rows={2}
                                placeholder={c.samples[0] ? `one per line: other name = ${c.samples[0]}` : 'other name = value'}
                                onChange={(e) => update(t.name, c.name, { aliases: e.target.value })}
                                className="border border-gray-200 rounded-md px-2 py-1 w-56 font-mono text-[10px]"
                              />
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </section>
          ))}
        </div>

        <div className="flex items-center justify-end gap-2 px-6 py-3 border-t border-gray-100 bg-[#F9FAFB]/50">
          <button onClick={onClose} className="px-4 py-1.5 text-xs font-semibold text-gray-600 hover:bg-gray-100 rounded-lg">Close</button>
          <button
            onClick={handleSave}
            disabled={!data || saving || data.tables.length === 0}
            className="px-4 py-1.5 bg-[#0066FF] text-white rounded-lg text-xs font-semibold hover:bg-[#0052cc] disabled:opacity-50"
          >
            {saving ? 'Saving…' : 'Save columns'}
          </button>
        </div>
      </div>
    </div>
  );
}
