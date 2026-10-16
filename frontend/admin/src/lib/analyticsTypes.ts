// Shape of GET /admin/analytics (also produced by the sample-data preview in analyticsSample.ts).
export interface BizRow {
  id: string;
  name: string;
  vertical: string;
  plan: string;
  status: string;
}
export interface Analytics {
  range: { days: number; from: string; to: string };
  generatedAt: string;
  currency: string;
  kpis: {
    totalBusinesses: number;
    newBusinesses: number;
    newBusinessesPrevious: number;
    trial: number;
    paid: number;
    converted: number;
    inactive: number;
    revenue: Record<string, number>;
    revenuePrevious: number;
    mrr: Record<string, number>;
  };
  trialDays: number;
  growth: { date: string; total: number; trial: number; paid: number; inactive: number }[];
  planMix: Record<string, number>;
  byStatus: Record<string, number>;
  funnel: { signups: number; trial: number; converted: number; paid: number };
  revenueSeries: { date: string; revenue: number; cumulative: number }[];
  weekly: { label: string; trials: number; converted: number }[];
  calls: {
    total: number;
    previous: number;
    series: { date: string; calls: number; aiRate: number | null; transferRate: number | null }[];
    aiRate: number | null;
    transferRate: number | null;
    byVertical: Record<string, number>;
  };
  topBusinesses: { name: string; calls: number; appointments: number; conversion: number }[];
  recentSignups: (BizRow & { createdAt: string | null })[];
  trialExpiring: (BizRow & { daysLeft: number | null; calls: number })[];
  recentlyConverted: (BizRow & { convertedAt: string; toPlan: string })[];
}
