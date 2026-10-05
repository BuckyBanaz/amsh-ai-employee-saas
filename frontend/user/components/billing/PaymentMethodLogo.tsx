import React from 'react';
import {
  siAmericanexpress,
  siApplepay,
  siDiscover,
  siGooglepay,
  siKlarna,
  siMastercard,
  siPaypal,
  siPaytm,
  siPhonepe,
  siSepa,
  siVisa,
} from 'simple-icons';
import type { PaymentMethodId } from '../../utils/paymentMethods';

type Glyph = { path: string; hex: string };

// Official brand marks from simple-icons (CC0), each in its brand colour. Klarna's pink is its background, not its ink.
const GLYPHS: Partial<Record<PaymentMethodId, Glyph & { tile?: string }>> = {
  visa: siVisa,
  mastercard: siMastercard,
  amex: siAmericanexpress,
  discover: siDiscover,
  applepay: siApplepay,
  googlepay: siGooglepay,
  gpay: siGooglepay,
  paytm: siPaytm,
  phonepe: siPhonepe,
  paypal: siPaypal,
  sepa: siSepa,
  klarna: { path: siKlarna.path, hex: '0B051D', tile: '#FFB3C7' },
};

/** Methods simple-icons does not carry, drawn as clean wordmarks in their brand colours (no third-party artwork copied). */
function Wordmark({ id }: { id: PaymentMethodId }) {
  switch (id) {
    case 'upi':
      return (
        <svg viewBox="0 0 64 24" className="h-5 w-auto" aria-hidden="true">
          <text x="2" y="18" fontFamily="Arial, Helvetica, sans-serif" fontWeight="800" fontStyle="italic" fontSize="18" fill="#3D3D3D">UPI</text>
          <path d="M42 4 L50 12 L42 20 Z" fill="#F37021" />
          <path d="M49 4 L57 12 L49 20 Z" fill="#0F8040" />
        </svg>
      );
    case 'rupay':
      return (
        <svg viewBox="0 0 72 24" className="h-5 w-auto" aria-hidden="true">
          <text x="1" y="18" fontFamily="Arial, Helvetica, sans-serif" fontWeight="800" fontStyle="italic" fontSize="17" fill="#1D4F91">RuPay</text>
          <path d="M57 5 L64 12 L57 19 Z" fill="#F37021" />
          <path d="M63 5 L70 12 L63 19 Z" fill="#0F8040" />
        </svg>
      );
    case 'netbanking':
      return (
        <span className="flex items-center text-slate-700">
          <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="M3 10 12 4l9 6" />
            <path d="M5 10v8M9.5 10v8M14.5 10v8M19 10v8M3 20h18" />
          </svg>
        </span>
      );
    case 'ideal':
      return (
        <svg viewBox="0 0 48 24" className="h-5 w-auto" aria-hidden="true">
          <rect x="1" y="1" width="46" height="22" rx="4" fill="#fff" stroke="#CC0066" strokeWidth="1.5" />
          <text x="24" y="16.5" textAnchor="middle" fontFamily="Arial, Helvetica, sans-serif" fontWeight="800" fontSize="12" fill="#CC0066">iDEAL</text>
        </svg>
      );
    case 'mada':
      return (
        <svg viewBox="0 0 56 24" className="h-5 w-auto" aria-hidden="true">
          <rect x="2" y="6" width="14" height="4" rx="1" fill="#259BD6" />
          <rect x="2" y="13" width="14" height="4" rx="1" fill="#84B740" />
          <text x="19" y="17" fontFamily="Arial, Helvetica, sans-serif" fontWeight="800" fontSize="14" fill="#1F1F1F">mada</text>
        </svg>
      );
    case 'stcpay':
      return (
        <svg viewBox="0 0 64 24" className="h-5 w-auto" aria-hidden="true">
          <text x="2" y="17" fontFamily="Arial, Helvetica, sans-serif" fontWeight="800" fontSize="15" fill="#4F008C">stc</text>
          <text x="31" y="17" fontFamily="Arial, Helvetica, sans-serif" fontWeight="600" fontSize="13" fill="#4F008C">pay</text>
        </svg>
      );
    default:
      return null;
  }
}

const WORDMARK_ONLY = new Set<PaymentMethodId>(['upi', 'rupay', 'ideal', 'mada', 'stcpay']);

/** One payment method as a tile: the brand mark and its name (wordmark brands are their own name). */
export function PaymentMethodLogo({ id, label }: { id: PaymentMethodId; label: string }) {
  const glyph = GLYPHS[id];
  return (
    <span
      title={label}
      className="inline-flex h-10 items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 text-xs font-medium text-slate-700"
    >
      {glyph ? (
        <span className="inline-flex h-6 w-6 shrink-0 items-center justify-center rounded" style={{ background: glyph.tile || 'transparent' }}>
          <svg viewBox="0 0 24 24" className="h-5 w-5" aria-hidden="true">
            <path d={glyph.path} fill={`#${glyph.hex}`} />
          </svg>
        </span>
      ) : (
        <span className="inline-flex" aria-hidden="true">
          <Wordmark id={id} />
        </span>
      )}
      {WORDMARK_ONLY.has(id) ? <span className="sr-only">{label}</span> : <span>{label}</span>}
    </span>
  );
}
