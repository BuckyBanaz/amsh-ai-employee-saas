"use client";
import React, { useMemo, useState } from 'react';

type Priority = 'Low' | 'Normal' | 'High';
type Status = 'Published' | 'Scheduled' | 'Draft';
type AudienceScope = 'All' | 'BusinessType' | 'Plan' | 'Country';

interface Audience {
  scope: AudienceScope;
  values: string[];
}

interface Announcement {
  id: string;
  title: string;
  body: string;
  priority: Priority;
  status: Status;
  date: string;
  audience: Audience;
}

const BUSINESS_TYPES = [
  'Dental Clinic',
  'Medical Center',
  'Restaurant',
  'Beauty Salon',
  'Fitness Studio',
  'Retail Store',
];

const PLANS = ['Starter', 'Professional', 'Business', 'Enterprise'];
const COUNTRIES = ['NL', 'DE', 'FR', 'GB', 'IT'];

/** Rough tenant counts per business type, used to preview how many accounts an announcement reaches. */
const BUSINESS_TYPE_COUNTS: Record<string, number> = {
  'Dental Clinic': 54,
  'Medical Center': 21,
  Restaurant: 18,
  'Beauty Salon': 14,
  'Fitness Studio': 12,
  'Retail Store': 9,
};

const TOTAL_BUSINESSES = Object.values(BUSINESS_TYPE_COUNTS).reduce((sum, n) => sum + n, 0);

const priorityStyles: Record<Priority, string> = {
  High: 'bg-[#FEF3C7] text-[#92400E]',
  Normal: 'bg-[#DBEAFE] text-[#1E40AF]',
  Low: 'bg-[#F1F5F9] text-[#334155]',
};

const statusStyles: Record<Status, string> = {
  Published: 'bg-[#D1FAE5] text-[#065F46]',
  Scheduled: 'bg-[#FEF3C7] text-[#92400E]',
  Draft: 'bg-[#F1F5F9] text-[#334155]',
};

const scopeOptions: { value: AudienceScope; label: string }[] = [
  { value: 'All', label: 'All Businesses' },
  { value: 'BusinessType', label: 'Specific Business Type' },
  { value: 'Plan', label: 'Specific Plan' },
  { value: 'Country', label: 'Specific Country' },
];

const optionsForScope = (scope: AudienceScope) => {
  if (scope === 'BusinessType') return BUSINESS_TYPES;
  if (scope === 'Plan') return PLANS;
  if (scope === 'Country') return COUNTRIES;
  return [];
};

const audienceLabel = (audience: Audience) => {
  if (audience.scope === 'All') return 'All Businesses';
  const joined = audience.values.join(', ');
  if (audience.scope === 'BusinessType') return `Business Type (${joined})`;
  if (audience.scope === 'Plan') return `Specific Plan (${joined})`;
  return `Specific Country (${joined})`;
};

const estimatedReach = (audience: Audience) => {
  if (audience.scope === 'All') return TOTAL_BUSINESSES;
  if (audience.scope === 'BusinessType') {
    return audience.values.reduce((sum, type) => sum + (BUSINESS_TYPE_COUNTS[type] ?? 0), 0);
  }
  // Plan and country splits are not modelled per tenant yet, so reach stays unknown.
  return null;
};

const seedAnnouncements: Announcement[] = [
  {
    id: 'ann-1',
    title: 'Scheduled Voice Server Maintenance',
    body: 'We will be performing routine infrastructure updates to voice gateways on Feb 2 between 02:00 and 04:00 UTC.',
    priority: 'High',
    status: 'Published',
    date: '2026-01-29',
    audience: { scope: 'All', values: [] },
  },
  {
    id: 'ann-2',
    title: 'Introducing Dieter: New German AI Receptionist',
    body: 'Dieter is now available for all DACH region accounts. Highly optimized for medical scheduling.',
    priority: 'Normal',
    status: 'Published',
    date: '2026-01-24',
    audience: { scope: 'BusinessType', values: ['Medical Center', 'Dental Clinic'] },
  },
  {
    id: 'ann-3',
    title: 'Upcoming EUR Billing Regulation Updates',
    body: 'Compliance and tax calculation adjustments starting mid February for EEA-based subscribers.',
    priority: 'High',
    status: 'Scheduled',
    date: 'Scheduled: Feb 5',
    audience: { scope: 'Country', values: ['NL', 'DE', 'FR'] },
  },
  {
    id: 'ann-4',
    title: 'Table Reservation Flow Improvements',
    body: 'Party-size handling and waitlist callbacks are now generally available for hospitality accounts.',
    priority: 'Normal',
    status: 'Published',
    date: '2026-01-21',
    audience: { scope: 'BusinessType', values: ['Restaurant'] },
  },
  {
    id: 'ann-5',
    title: 'Twilio Gateway API Upgrade Beta',
    body: 'Testing a highly optimized low latency audio connection. Contact support to register.',
    priority: 'Low',
    status: 'Draft',
    date: 'Draft',
    audience: { scope: 'All', values: [] },
  },
];

const inputClass =
  'w-full px-3 py-2.5 bg-[#F8FAFC] border border-[#E2E8F0] rounded-lg text-[13px] text-[#0F172A] placeholder-[#94A3B8] focus:outline-none focus:ring-2 focus:ring-[#2563EB]/20 focus:border-[#2563EB]';

export default function AnnouncementsPage() {
  const [announcements, setAnnouncements] = useState<Announcement[]>(seedAnnouncements);

  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [priority, setPriority] = useState<Priority>('Normal');
  const [scope, setScope] = useState<AudienceScope>('All');
  const [values, setValues] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);

  const [statusFilter, setStatusFilter] = useState<'All' | Status>('All');
  const [typeFilter, setTypeFilter] = useState('All');

  const draftAudience: Audience = { scope, values };
  const draftReach = estimatedReach(draftAudience);

  const visible = useMemo(
    () =>
      announcements.filter((item) => {
        const matchesStatus = statusFilter === 'All' || item.status === statusFilter;
        const matchesType =
          typeFilter === 'All' ||
          item.audience.scope === 'All' ||
          (item.audience.scope === 'BusinessType' && item.audience.values.includes(typeFilter));
        return matchesStatus && matchesType;
      }),
    [announcements, statusFilter, typeFilter]
  );

  const flash = (message: string) => {
    setToast(message);
    window.setTimeout(() => setToast(null), 2600);
  };

  const toggleValue = (value: string) =>
    setValues((current) =>
      current.includes(value) ? current.filter((v) => v !== value) : [...current, value]
    );

  const changeScope = (next: AudienceScope) => {
    setScope(next);
    setValues([]);
    setError(null);
  };

  const resetForm = () => {
    setTitle('');
    setBody('');
    setPriority('Normal');
    setScope('All');
    setValues([]);
    setError(null);
  };

  const submit = (status: Status) => {
    if (!title.trim()) {
      setError('Announcement title is required.');
      return;
    }
    if (!body.trim()) {
      setError('Message content is required.');
      return;
    }
    if (scope !== 'All' && values.length === 0) {
      setError('Pick at least one target, or switch back to All Businesses.');
      return;
    }

    const created: Announcement = {
      id: `ann-${Date.now()}`,
      title: title.trim(),
      body: body.trim(),
      priority,
      status,
      date: status === 'Draft' ? 'Draft' : status === 'Scheduled' ? 'Scheduled' : '2026-01-30',
      audience: { scope, values: [...values] },
    };

    setAnnouncements((current) => [created, ...current]);
    resetForm();
    flash(status === 'Published' ? 'Announcement published' : `Saved as ${status.toLowerCase()}`);
  };

  const publishExisting = (id: string) => {
    setAnnouncements((current) =>
      current.map((item) => (item.id === id ? { ...item, status: 'Published', date: '2026-01-30' } : item))
    );
    flash('Announcement published');
  };

  const remove = (id: string) => {
    setAnnouncements((current) => current.filter((item) => item.id !== id));
    flash('Announcement deleted');
  };

  return (
    <div className="flex-1 overflow-y-auto scrollbar-hide p-8 animate-in fade-in duration-500">
      <header className="mb-6 pb-5 border-b border-[#E2E8F0] flex flex-wrap justify-between items-center gap-3">
        <div>
          <h1 className="text-[24px] font-bold text-[#0F172A] tracking-tight leading-tight">Announcements</h1>
          <p className="text-[14px] text-[#475569] mt-1 font-normal">Platform-wide announcements.</p>
        </div>
        <div className="flex items-center gap-3">
          <button className="flex items-center gap-2 border border-[#E2E8F0] rounded-lg py-2 px-3 text-[13px] font-medium text-[#475569] bg-white shadow-sm hover:bg-gray-50 transition-colors">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect>
              <line x1="16" y1="2" x2="16" y2="6"></line>
              <line x1="8" y1="2" x2="8" y2="6"></line>
              <line x1="3" y1="10" x2="21" y2="10"></line>
            </svg>
            Jan 1 - Jan 30, 2026
          </button>
          <button className="flex items-center justify-center border border-[#E2E8F0] rounded-full w-9 h-9 text-[#475569] bg-white shadow-sm hover:bg-gray-50 transition-colors">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"></path>
              <path d="M13.73 21a2 2 0 0 1-3.46 0"></path>
            </svg>
          </button>
        </div>
      </header>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        {/* List */}
        <div className="xl:col-span-2">
          <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
            <h2 className="text-[14px] font-bold text-[#475569] uppercase tracking-wider">Recent Announcements</h2>
            <div className="flex items-center gap-2">
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value as 'All' | Status)}
                className="px-2.5 py-1.5 bg-[#F8FAFC] border border-[#E2E8F0] rounded-lg text-[12px] font-semibold text-[#475569] focus:outline-none focus:ring-2 focus:ring-[#2563EB]/20 cursor-pointer"
              >
                <option value="All">Status: All</option>
                <option value="Published">Published</option>
                <option value="Scheduled">Scheduled</option>
                <option value="Draft">Draft</option>
              </select>
              <select
                value={typeFilter}
                onChange={(e) => setTypeFilter(e.target.value)}
                className="px-2.5 py-1.5 bg-[#F8FAFC] border border-[#E2E8F0] rounded-lg text-[12px] font-semibold text-[#475569] focus:outline-none focus:ring-2 focus:ring-[#2563EB]/20 cursor-pointer"
              >
                <option value="All">Business Type: All</option>
                {BUSINESS_TYPES.map((type) => (
                  <option key={type} value={type}>
                    {type}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="space-y-4">
            {visible.length === 0 ? (
              <div className="bg-white border border-[#E2E8F0] rounded-xl p-10 text-center text-[13px] text-[#94A3B8]">
                No announcements match these filters.
              </div>
            ) : (
              visible.map((item) => {
                const reach = estimatedReach(item.audience);
                return (
                  <article key={item.id} className="bg-white border border-[#E2E8F0] rounded-xl p-5 shadow-sm">
                    <div className="flex flex-wrap items-start justify-between gap-3 mb-2">
                      <div className="flex items-center gap-2">
                        <h3 className="text-[15px] font-bold text-[#0F172A]">{item.title}</h3>
                        <span className={`px-2 py-0.5 rounded-md text-[12px] font-semibold ${priorityStyles[item.priority]}`}>
                          {item.priority}
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className={`px-2 py-0.5 rounded-md text-[12px] font-semibold ${statusStyles[item.status]}`}>
                          {item.status}
                        </span>
                        <span className="text-[12px] text-[#94A3B8]">{item.date}</span>
                      </div>
                    </div>

                    <p className="text-[13px] text-[#475569] leading-relaxed mb-3">{item.body}</p>

                    <div className="flex flex-wrap items-center gap-x-3 gap-y-2 pt-3 border-t border-[#E2E8F0]">
                      <span className="text-[12px] text-[#94A3B8]">Target Audience:</span>
                      <span className="text-[12px] font-semibold text-[#2563EB]">{audienceLabel(item.audience)}</span>
                      {reach !== null && (
                        <span className="text-[11px] text-[#94A3B8]">· approx {reach} businesses</span>
                      )}
                      <div className="ml-auto flex items-center gap-2">
                        {item.status !== 'Published' && (
                          <button
                            onClick={() => publishExisting(item.id)}
                            className="text-[12px] font-semibold text-[#10B981] hover:underline"
                          >
                            Publish
                          </button>
                        )}
                        <button
                          onClick={() => remove(item.id)}
                          className="text-[12px] font-semibold text-[#991B1B] hover:underline"
                        >
                          Delete
                        </button>
                      </div>
                    </div>
                  </article>
                );
              })
            )}
          </div>
        </div>

        {/* Create form */}
        <aside className="bg-white border border-[#E2E8F0] rounded-xl p-6 shadow-sm h-fit">
          <h2 className="text-[16px] font-bold text-[#0F172A] mb-4 pb-4 border-b border-[#E2E8F0]">New Announcement</h2>

          {error && (
            <div className="mb-4 rounded-lg border border-[#EF4444] bg-[#FEE2E2] px-3 py-2 text-[13px] font-semibold text-[#991B1B]">
              {error}
            </div>
          )}

          <div className="space-y-4">
            <label className="block">
              <span className="text-[13px] font-semibold text-[#475569]">Announcement Title</span>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g. System upgrade notification"
                className={`${inputClass} mt-1.5`}
              />
            </label>

            <label className="block">
              <span className="text-[13px] font-semibold text-[#475569]">Message Content</span>
              <textarea
                value={body}
                onChange={(e) => setBody(e.target.value)}
                rows={4}
                placeholder="Write announcement details here..."
                className={`${inputClass} mt-1.5 resize-y`}
              />
            </label>

            <label className="block">
              <span className="text-[13px] font-semibold text-[#475569]">Target Audience</span>
              <select
                value={scope}
                onChange={(e) => changeScope(e.target.value as AudienceScope)}
                className={`${inputClass} mt-1.5 cursor-pointer`}
              >
                {scopeOptions.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </label>

            {scope !== 'All' && (
              <div className="border border-[#E2E8F0] rounded-lg p-3">
                <div className="text-[12px] font-semibold text-[#475569] mb-2">
                  {scope === 'BusinessType' ? 'Pick business types' : scope === 'Plan' ? 'Pick plans' : 'Pick countries'}
                </div>
                <div className="grid grid-cols-2 gap-1.5">
                  {optionsForScope(scope).map((option) => (
                    <label key={option} className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={values.includes(option)}
                        onChange={() => toggleValue(option)}
                        className="w-4 h-4 accent-[#2563EB]"
                      />
                      <span className="text-[12px] text-[#0F172A]">
                        {option}
                        {scope === 'BusinessType' && (
                          <span className="text-[#94A3B8]"> ({BUSINESS_TYPE_COUNTS[option]})</span>
                        )}
                      </span>
                    </label>
                  ))}
                </div>
              </div>
            )}

            <label className="block">
              <span className="text-[13px] font-semibold text-[#475569]">Priority</span>
              <select
                value={priority}
                onChange={(e) => setPriority(e.target.value as Priority)}
                className={`${inputClass} mt-1.5 cursor-pointer`}
              >
                <option value="Low">Low</option>
                <option value="Normal">Normal</option>
                <option value="High">High</option>
              </select>
            </label>

            <div className="bg-[#F8FAFC] rounded-lg p-3 text-[12px]">
              <div className="flex justify-between">
                <span className="text-[#64748B]">Audience</span>
                <span className="font-semibold text-[#0F172A] text-right">{audienceLabel(draftAudience)}</span>
              </div>
              <div className="flex justify-between mt-1.5">
                <span className="text-[#64748B]">Estimated reach</span>
                <span className="font-semibold text-[#0F172A]">
                  {draftReach === null ? 'Not estimated' : `${draftReach} businesses`}
                </span>
              </div>
            </div>

            <div className="flex items-center gap-2 pt-2">
              <button
                onClick={() => submit('Draft')}
                className="flex-1 px-3 py-2 border border-[#E2E8F0] bg-white text-[#475569] rounded-lg text-[13px] font-semibold hover:bg-gray-50 transition-colors"
              >
                Save Draft
              </button>
              <button
                onClick={() => submit('Scheduled')}
                className="flex-1 px-3 py-2 border border-[#E2E8F0] bg-white text-[#475569] rounded-lg text-[13px] font-semibold hover:bg-gray-50 transition-colors"
              >
                Schedule
              </button>
              <button
                onClick={() => submit('Published')}
                className="flex-1 px-3 py-2 bg-[#2563EB] hover:bg-blue-700 text-white rounded-lg text-[13px] font-semibold transition-colors"
              >
                Publish Now
              </button>
            </div>
          </div>
        </aside>
      </div>

      {toast && (
        <div
          role="status"
          className="fixed bottom-6 right-6 z-40 bg-[#0F172A] text-white text-[13px] font-semibold px-4 py-2.5 rounded-lg shadow-lg"
        >
          {toast}
        </div>
      )}
    </div>
  );
}
