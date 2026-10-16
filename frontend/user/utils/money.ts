/** A price in the plan's own currency, the way the payment will be taken ("$99", "₹4,999"). */
export function formatPrice(amount: number, currency: string): string {
  try {
    return new Intl.NumberFormat(currency === 'INR' ? 'en-IN' : 'en-US', {
      style: 'currency',
      currency,
      maximumFractionDigits: Number.isInteger(amount) ? 0 : 2,
    }).format(amount);
  } catch {
    return `${currency} ${amount}`;
  }
}

/** The quota lines a plan card shows, from the catalog's quotas. A null quota is unlimited. */
const QUOTA_LABELS: [key: string, label: string][] = [
  ['voice_minutes', 'voice minutes / month'],
  ['messages', 'messages / month'],
  ['concurrent_calls', 'concurrent calls'],
  ['seats', 'team seats'],
  ['knowledge_docs', 'knowledge documents'],
];

export function quotaLines(quotas?: Record<string, number | null>): string[] {
  if (!quotas) return [];
  return QUOTA_LABELS.filter(([key]) => quotas[key] !== undefined).map(([key, label]) => {
    const value = quotas[key];
    return `${value === null ? 'Unlimited' : value.toLocaleString()} ${label}`;
  });
}
