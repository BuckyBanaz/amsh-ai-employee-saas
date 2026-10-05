/**
 * The payment methods a clinic in each country expects to see at checkout, in the order they are used there.
 *
 * `razorpay` says whether today's gateway (Razorpay) actually takes that method. Razorpay covers Indian methods and
 * international cards; iDEAL, mada, STC Pay, Apple Pay and Google Pay outside India need a second gateway (for example
 * Stripe for iDEAL / Apple Pay / Google Pay, Tap or HyperPay for mada / STC Pay) before they can be charged.
 */

export type PaymentMethodId =
  | 'upi' | 'gpay' | 'phonepe' | 'paytm' | 'rupay' | 'netbanking'
  | 'visa' | 'mastercard' | 'amex' | 'discover'
  | 'applepay' | 'googlepay' | 'paypal'
  | 'ideal' | 'sepa' | 'klarna'
  | 'mada' | 'stcpay';

export interface PaymentMethod {
  id: PaymentMethodId;
  label: string;
  razorpay: boolean;
}

const M: Record<PaymentMethodId, PaymentMethod> = {
  upi: { id: 'upi', label: 'UPI', razorpay: true },
  gpay: { id: 'gpay', label: 'Google Pay (UPI)', razorpay: true },
  phonepe: { id: 'phonepe', label: 'PhonePe', razorpay: true },
  paytm: { id: 'paytm', label: 'Paytm', razorpay: true },
  rupay: { id: 'rupay', label: 'RuPay', razorpay: true },
  netbanking: { id: 'netbanking', label: 'Net Banking', razorpay: true },
  visa: { id: 'visa', label: 'Visa', razorpay: true },
  mastercard: { id: 'mastercard', label: 'Mastercard', razorpay: true },
  amex: { id: 'amex', label: 'American Express', razorpay: true },
  discover: { id: 'discover', label: 'Discover', razorpay: false },
  paypal: { id: 'paypal', label: 'PayPal', razorpay: true },
  applepay: { id: 'applepay', label: 'Apple Pay', razorpay: false },
  googlepay: { id: 'googlepay', label: 'Google Pay', razorpay: false },
  ideal: { id: 'ideal', label: 'iDEAL', razorpay: false },
  sepa: { id: 'sepa', label: 'SEPA Direct Debit', razorpay: false },
  klarna: { id: 'klarna', label: 'Klarna', razorpay: false },
  mada: { id: 'mada', label: 'mada', razorpay: false },
  stcpay: { id: 'stcpay', label: 'STC Pay', razorpay: false },
};

export interface CheckoutCountry {
  code: string;
  name: string;
  methods: PaymentMethod[];
}

const list = (...ids: PaymentMethodId[]) => ids.map((id) => M[id]);

export const CHECKOUT_COUNTRIES: CheckoutCountry[] = [
  { code: 'IN', name: 'India', methods: list('upi', 'gpay', 'phonepe', 'paytm', 'rupay', 'visa', 'mastercard', 'netbanking') },
  { code: 'US', name: 'United States', methods: list('visa', 'mastercard', 'amex', 'discover', 'applepay', 'googlepay', 'paypal') },
  { code: 'GB', name: 'United Kingdom', methods: list('visa', 'mastercard', 'amex', 'applepay', 'googlepay', 'paypal') },
  { code: 'NL', name: 'Netherlands', methods: list('ideal', 'visa', 'mastercard', 'applepay', 'googlepay', 'sepa', 'klarna', 'paypal') },
  { code: 'SA', name: 'Saudi Arabia', methods: list('mada', 'applepay', 'stcpay', 'visa', 'mastercard', 'amex') },
  { code: 'AE', name: 'United Arab Emirates', methods: list('visa', 'mastercard', 'amex', 'applepay', 'googlepay') },
  { code: 'DE', name: 'Germany', methods: list('visa', 'mastercard', 'sepa', 'klarna', 'paypal', 'applepay', 'googlepay') },
  { code: 'CA', name: 'Canada', methods: list('visa', 'mastercard', 'amex', 'applepay', 'googlepay', 'paypal') },
  { code: 'AU', name: 'Australia', methods: list('visa', 'mastercard', 'amex', 'applepay', 'googlepay', 'paypal') },
  { code: 'SG', name: 'Singapore', methods: list('visa', 'mastercard', 'amex', 'applepay', 'googlepay', 'paypal') },
];

export const OTHER_COUNTRY: CheckoutCountry = { code: 'XX', name: 'Other country', methods: list('visa', 'mastercard', 'amex', 'paypal') };

const ALIASES: Record<string, string> = {
  india: 'IN', 'united states': 'US', usa: 'US', us: 'US', 'united kingdom': 'GB', uk: 'GB', 'great britain': 'GB', england: 'GB',
  netherlands: 'NL', holland: 'NL', 'the netherlands': 'NL', 'saudi arabia': 'SA', ksa: 'SA', 'united arab emirates': 'AE', uae: 'AE',
  dubai: 'AE', 'abu dhabi': 'AE', germany: 'DE', canada: 'CA', australia: 'AU', singapore: 'SG',
};

// Where the browser says it is, when the clinic has not told us: its time zone first, then its locale's region.
const TIMEZONES: Record<string, string> = {
  'Asia/Kolkata': 'IN', 'Asia/Calcutta': 'IN', 'Europe/London': 'GB', 'Europe/Amsterdam': 'NL', 'Asia/Riyadh': 'SA',
  'Asia/Dubai': 'AE', 'Europe/Berlin': 'DE', 'Asia/Singapore': 'SG', 'America/Toronto': 'CA', 'America/Vancouver': 'CA',
  'Australia/Sydney': 'AU', 'Australia/Melbourne': 'AU',
};

export function countryByCode(code: string | null | undefined): CheckoutCountry {
  return CHECKOUT_COUNTRIES.find((c) => c.code === (code || '').toUpperCase()) || OTHER_COUNTRY;
}

/** ISO code for a country name or code as typed in onboarding ("India", "UAE", "nl"); null when unknown. */
export function countryCode(value: string | null | undefined): string | null {
  const v = (value || '').trim().toLowerCase();
  if (!v) return null;
  if (ALIASES[v]) return ALIASES[v];
  const byCode = CHECKOUT_COUNTRIES.find((c) => c.code.toLowerCase() === v);
  return byCode ? byCode.code : null;
}

/** The clinic's own country if it gave one, else where the browser is. */
export function detectCountry(businessCountry?: string | null): CheckoutCountry {
  const fromBusiness = countryCode(businessCountry);
  if (fromBusiness) return countryByCode(fromBusiness);
  if (typeof Intl !== 'undefined') {
    const tz = Intl.DateTimeFormat().resolvedOptions().timeZone;
    if (TIMEZONES[tz]) return countryByCode(TIMEZONES[tz]);
    if (tz?.startsWith('America/')) return countryByCode('US');
  }
  if (typeof navigator !== 'undefined') {
    const region = (navigator.language || '').split('-')[1];
    if (region) return countryByCode(region);
  }
  return OTHER_COUNTRY;
}
