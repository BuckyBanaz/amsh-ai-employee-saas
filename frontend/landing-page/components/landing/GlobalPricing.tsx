"use client";

import React, { useState } from "react";
import { Icon } from "./icons";

type Currency = "usd" | "inr" | "gbp" | "eur";

interface PlanTier {
  name: string;
  desc: string;
  featured: boolean;
  pricing: Record<Currency, { monthly: string; annual: string; unit: string }>;
  features: string[];
}

const TIERS: PlanTier[] = [
  {
    name: "Starter Practice",
    desc: "For solo practitioners, dental & aesthetic clinics.",
    featured: false,
    pricing: {
      usd: { monthly: "$49", annual: "$39", unit: "/ mo" },
      inr: { monthly: "₹3,999", annual: "₹3,199", unit: "/ mo" },
      gbp: { monthly: "£39", annual: "£31", unit: "/ mo" },
      eur: { monthly: "€45", annual: "€36", unit: "/ mo" },
    },
    features: [
      "1,000 voice minutes included",
      "2 concurrent patient lines",
      "Dedicated local clinic phone number",
      "Google Calendar 2-way sync",
      "Human doctor emergency transfer",
      "English, Hindi & Spanish support",
    ],
  },
  {
    name: "Busy Clinic Pro",
    desc: "For high-volume clinics with phone & WhatsApp patient triage.",
    featured: true,
    pricing: {
      usd: { monthly: "$299", annual: "$239", unit: "/ mo" },
      inr: { monthly: "₹24,999", annual: "₹19,999", unit: "/ mo" },
      gbp: { monthly: "£239", annual: "£189", unit: "/ mo" },
      eur: { monthly: "€279", annual: "€219", unit: "/ mo" },
    },
    features: [
      "8,000 voice minutes included",
      "8 concurrent patient lines",
      "Official WhatsApp Cloud API",
      "Live call recordings & transcripts",
      "Automated WhatsApp booking reminders",
      "Custom clinic RAG knowledge base",
      "HIPAA / GDPR / DPDP BAA agreement",
      "Priority latency routing (<180ms)",
    ],
  },
  {
    name: "Hospital / Multi-Branch",
    desc: "For multi-specialty centers, dental chains & hospitals.",
    featured: false,
    pricing: {
      usd: { monthly: "$499", annual: "$399", unit: "/ mo" },
      inr: { monthly: "₹39,999", annual: "₹31,999", unit: "/ mo" },
      gbp: { monthly: "£399", annual: "£319", unit: "/ mo" },
      eur: { monthly: "€460", annual: "€369", unit: "/ mo" },
    },
    features: [
      "25,000 voice minutes included",
      "30 concurrent patient lines",
      "Multi-doctor & multi-branch routing",
      "Custom EMR / HL7 FHIR webhook sync",
      "Dedicated WhatsApp Business account",
      "Dedicated clinical account manager",
      "Custom voice training & 24/7 SLA",
    ],
  },
];

export default function GlobalPricing() {
  const [currency, setCurrency] = useState<Currency>("usd");
  const [annual, setAnnual] = useState(false);

  return (
    <section id="pricing" className="py-24 bg-slate-50/70 border-b border-slate-200/80">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        
        {/* Header */}
        <div className="text-center max-w-3xl mx-auto mb-12">
          <span className="font-mono-ui text-xs uppercase tracking-[0.16em] text-blue-600 font-bold">
            TRANSPARENT GLOBAL PRICING
          </span>
          <h2 className="font-sora text-3xl sm:text-4xl md:text-5xl font-bold tracking-tight text-slate-950 mt-3">
            An autonomous employee for less than 1 day of front-desk salary.
          </h2>
          <p className="mt-4 text-slate-600 text-base leading-relaxed">
            14-day free trial on every plan. Includes ₹1,000 / $10 in voice credits. No credit card required.
          </p>

          {/* Controls: Currency Selector & Annual Toggle */}
          <div className="mt-8 flex flex-wrap items-center justify-center gap-4">
            {/* Currency Selector */}
            <div className="flex items-center gap-1 p-1 rounded-xl bg-white border border-slate-200 shadow-2xs font-mono-ui">
              {[
                { id: "usd", label: "🇺🇸 USD ($)" },
                { id: "inr", label: "🇮🇳 INR (₹)" },
                { id: "gbp", label: "🇬🇧 GBP (£)" },
                { id: "eur", label: "🇪🇺 EUR (€)" },
              ].map((c) => (
                <button
                  key={c.id}
                  type="button"
                  onClick={() => setCurrency(c.id as Currency)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                    currency === c.id
                      ? "bg-slate-950 text-white shadow-xs"
                      : "text-slate-600 hover:text-slate-950"
                  }`}
                >
                  {c.label}
                </button>
              ))}
            </div>

            {/* Annual Billing Toggle */}
            <button
              type="button"
              onClick={() => setAnnual(!annual)}
              className="flex items-center gap-2.5 px-4 py-2 rounded-xl bg-white border border-slate-200 shadow-2xs font-mono-ui text-xs font-semibold text-slate-700 cursor-pointer"
            >
              <span>Monthly</span>
              <div className={`w-8 h-4.5 rounded-full p-0.5 transition-colors ${annual ? "bg-blue-600" : "bg-slate-300"}`}>
                <div className={`w-3.5 h-3.5 rounded-full bg-white transition-transform ${annual ? "translate-x-3.5" : ""}`} />
              </div>
              <span className="flex items-center gap-1.5">
                <span>Annual</span>
                <span className="px-1.5 py-0.5 rounded bg-emerald-100 text-emerald-800 text-[10px] font-bold">
                  SAVE 20%
                </span>
              </span>
            </button>
          </div>
        </div>

        {/* Pricing Cards Grid */}
        <div className="grid gap-8 lg:grid-cols-3 items-stretch">
          {TIERS.map((tier) => {
            const p = tier.pricing[currency];
            const price = annual ? p.annual : p.monthly;

            return (
              <div
                key={tier.name}
                className={`rounded-3xl p-8 flex flex-col justify-between transition-all ${
                  tier.featured
                    ? "border-2 border-blue-600 bg-white shadow-xl relative"
                    : "border border-slate-200 bg-white shadow-xs hover:border-slate-300"
                }`}
              >
                <div>
                  {tier.featured && (
                    <span className="absolute -top-3.5 left-1/2 -translate-x-1/2 px-4 py-1 rounded-full bg-blue-600 text-white font-mono-ui text-[11px] font-bold uppercase tracking-wider shadow-sm">
                      Most Popular
                    </span>
                  )}

                  <h3 className="font-sora text-xl font-bold text-slate-900">{tier.name}</h3>
                  <p className="text-slate-500 text-xs mt-1.5">{tier.desc}</p>

                  <div className="mt-6 flex items-baseline gap-1.5 border-b border-slate-100 pb-6">
                    <span className="font-sora text-4xl font-extrabold text-slate-950">
                      {price}
                    </span>
                    <span className="text-slate-500 text-xs font-mono-ui">
                      {p.unit} {annual ? "(billed annually)" : ""}
                    </span>
                  </div>

                  <ul className="mt-6 space-y-3 text-sm">
                    {tier.features.map((feat) => (
                      <li key={feat} className="flex items-start gap-2.5 text-slate-700">
                        <Icon name="check" className="h-4 w-4 text-blue-600 mt-0.5 shrink-0" />
                        <span>{feat}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                <div className="pt-8">
                  <a
                    href="http://localhost:3000/login"
                    className={`w-full py-3 px-4 rounded-xl font-mono-ui text-xs font-bold uppercase tracking-wider text-center block transition-all shadow-xs ${
                      tier.featured
                        ? "bg-blue-600 hover:bg-blue-700 text-white"
                        : "bg-slate-950 hover:bg-blue-600 text-white"
                    }`}
                  >
                    Start 14-Day Free Trial
                  </a>
                  <p className="text-center font-mono-ui text-[10px] text-slate-400 mt-2">
                    Cancel anytime &bull; No setup fees
                  </p>
                </div>
              </div>
            );
          })}
        </div>

      </div>
    </section>
  );
}
