import type { Analytics } from './analyticsTypes';

// SAMPLE DATA for the analytics preview toggle. Invented numbers, generated deterministically so the picture does not change
// between renders. Never mixed with real data: the page shows one or the other.

function rng(seed: number) {
  let s = seed;
  return () => {
    s = (s * 1664525 + 1013904223) % 4294967296;
    return s / 4294967296;
  };
}

const iso = (d: Date) => d.toISOString().slice(0, 10);

export function buildSampleAnalytics(days: number): Analytics {
  const rand = rng(days * 97 + 13);
  const end = new Date();
  end.setUTCHours(0, 0, 0, 0);
  const dates = Array.from({ length: days }, (_, i) => new Date(end.getTime() - (days - 1 - i) * 86400000));

  // Businesses grow from ~half to 128, with trial and paid shares rising alongside.
  const startTotal = Math.round(128 * 0.52);
  const growth = dates.map((d, i) => {
    const t = days === 1 ? 1 : i / (days - 1);
    const total = Math.round(startTotal + (128 - startTotal) * t + rand() * 2);
    const trial = Math.round(total * (0.2 + 0.065 * t));
    const inactive = Math.round(total * 0.06);
    return { date: iso(d), total: Math.min(total, 128), trial, paid: Math.round(total * (0.5 + 0.17 * t)), inactive };
  });
  growth[growth.length - 1] = { date: iso(dates[dates.length - 1]), total: 128, trial: 34, paid: 86, inactive: 8 };

  let running = 0;
  const revenueSeries = dates.map((d, i) => {
    const t = days === 1 ? 1 : i / (days - 1);
    const revenue = Math.round((900 + 700 * t + rand() * 260) * (30 / Math.max(days, 7)) ** 0.3);
    running += revenue;
    return { date: iso(d), revenue, cumulative: running };
  });
  const scale = 42800 / (running || 1);
  let acc = 0;
  revenueSeries.forEach((r) => {
    r.revenue = Math.round(r.revenue * scale);
    acc += r.revenue;
    r.cumulative = acc;
  });

  const weekCount = Math.max(1, Math.ceil(days / 7));
  const weekly = Array.from({ length: weekCount }, (_, i) => {
    const d = new Date(end.getTime() - (weekCount - 1 - i) * 7 * 86400000);
    const trials = Math.round(18 + i * (14 / Math.max(weekCount - 1, 1)) + rand() * 5);
    return { label: d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' }), trials, converted: Math.round(trials * (0.5 + rand() * 0.2)) };
  });

  const callSeries = dates.map((d, i) => {
    const t = days === 1 ? 1 : i / (days - 1);
    const calls = Math.round(430 + 190 * t + rand() * 140 - 70);
    return { date: iso(d), calls, aiRate: Math.round(72 + 14 * t + rand() * 8), transferRate: Math.round(4 + rand() * 4) };
  });
  const callTotal = callSeries.reduce((s, c) => s + c.calls, 0);

  return {
    range: { days, from: iso(dates[0]), to: iso(dates[dates.length - 1]) },
    generatedAt: new Date().toISOString(),
    currency: 'EUR',
    kpis: {
      totalBusinesses: 128,
      newBusinesses: 20,
      newBusinessesPrevious: 17,
      trial: 34,
      paid: 86,
      converted: 28,
      inactive: 8,
      revenue: { EUR: 42800 },
      revenuePrevious: 34500,
      mrr: { EUR: 42800 },
    },
    trialDays: 14,
    growth,
    planMix: { Basic: 42, Professional: 38, Trial: 34, Enterprise: 14 },
    byStatus: { active: 86, trial: 34, paused: 5, suspended: 3 },
    funnel: { signups: 128, trial: 34, converted: 28, paid: 86 },
    revenueSeries,
    weekly,
    calls: {
      total: callTotal,
      previous: Math.round(callTotal * 0.89),
      series: callSeries,
      aiRate: 84,
      transferRate: 6,
      byVertical: { 'Dental Clinic': 2217, 'General Clinic': 1223, Physiotherapy: 534, Veterinary: 308, Dermatology: 231, Others: 379 },
    },
    topBusinesses: [
      { name: 'Smile Dental', calls: 1248, appointments: 312, conversion: 28 },
      { name: 'Health First', calls: 892, appointments: 221, conversion: 25 },
      { name: 'Klinik Zentrum', calls: 745, appointments: 198, conversion: 27 },
      { name: 'Bright Smile', calls: 642, appointments: 163, conversion: 22 },
      { name: 'Care & Cure', calls: 531, appointments: 141, conversion: 26 },
    ],
    recentSignups: [
      { id: 's1', name: 'Greenwood Dental', vertical: 'Dental Clinic', plan: 'Trial', status: 'active', createdAt: new Date(end.getTime() - 0 * 86400000).toISOString() },
      { id: 's2', name: 'Health Plus', vertical: 'General Clinic', plan: 'Trial', status: 'active', createdAt: new Date(end.getTime() - 1 * 86400000).toISOString() },
      { id: 's3', name: 'Smile Care', vertical: 'Dental Clinic', plan: 'Professional', status: 'active', createdAt: new Date(end.getTime() - 2 * 86400000).toISOString() },
      { id: 's4', name: 'City Vet Clinic', vertical: 'Veterinary', plan: 'Trial', status: 'active', createdAt: new Date(end.getTime() - 3 * 86400000).toISOString() },
      { id: 's5', name: 'Wellness Clinic', vertical: 'General Clinic', plan: 'Basic', status: 'active', createdAt: new Date(end.getTime() - 4 * 86400000).toISOString() },
    ],
    trialExpiring: [
      { id: 't1', name: 'Nova Dental', vertical: 'Dental Clinic', plan: 'Professional', status: 'trial', daysLeft: 2, calls: 124 },
      { id: 't2', name: 'Smile Hub', vertical: 'Dental Clinic', plan: 'Basic', status: 'trial', daysLeft: 3, calls: 86 },
      { id: 't3', name: 'Family Clinic', vertical: 'General Clinic', plan: 'Professional', status: 'trial', daysLeft: 4, calls: 62 },
      { id: 't4', name: 'Urban Dental', vertical: 'Dental Clinic', plan: 'Basic', status: 'trial', daysLeft: 5, calls: 59 },
      { id: 't5', name: 'Care Point', vertical: 'General Clinic', plan: 'Professional', status: 'trial', daysLeft: 6, calls: 47 },
    ],
    recentlyConverted: [
      { id: 'c1', name: 'Smile Dental', vertical: 'Dental Clinic', plan: 'Professional', status: 'active', convertedAt: new Date(end.getTime() - 1 * 86400000).toISOString(), toPlan: 'Professional' },
      { id: 'c2', name: 'Health First', vertical: 'General Clinic', plan: 'Basic', status: 'active', convertedAt: new Date(end.getTime() - 3 * 86400000).toISOString(), toPlan: 'Basic' },
      { id: 'c3', name: 'Bright Smile', vertical: 'Dental Clinic', plan: 'Professional', status: 'active', convertedAt: new Date(end.getTime() - 5 * 86400000).toISOString(), toPlan: 'Professional' },
      { id: 'c4', name: 'Klinik Zentrum', vertical: 'General Clinic', plan: 'Professional', status: 'active', convertedAt: new Date(end.getTime() - 7 * 86400000).toISOString(), toPlan: 'Professional' },
      { id: 'c5', name: 'Care & Cure', vertical: 'General Clinic', plan: 'Basic', status: 'active', convertedAt: new Date(end.getTime() - 9 * 86400000).toISOString(), toPlan: 'Basic' },
    ],
  };
}
