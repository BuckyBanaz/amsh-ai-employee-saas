"use client";

import React, { useState } from "react";

export default function RoiCalculator() {
  const [currency, setCurrency] = useState<"usd" | "inr">("usd");
  const [doctorsCount, setDoctorsCount] = useState(2);
  const [callsPerMonth, setCallsPerMonth] = useState(800);

  // Financial calculations
  const humanSalaryMonthly = currency === "usd" ? 3200 : 28000;
  const amshCostMonthly = currency === "usd" ? 49 : 3999;

  // Extra human staffing needed as doctors scale
  const humanStaffNeeded = Math.max(1, Math.ceil(doctorsCount / 2));
  const totalHumanCostAnnual = humanSalaryMonthly * humanStaffNeeded * 12;
  const totalAmshCostAnnual = amshCostMonthly * 12;

  const annualSavings = totalHumanCostAnnual - totalAmshCostAnnual;
  const percentSaved = Math.round((annualSavings / totalHumanCostAnnual) * 100);

  // Estimated recovered appointments (15% of callers typically bounce on busy lines)
  const missedCallsRecovered = Math.round(callsPerMonth * 0.18);
  const avgBookingValue = currency === "usd" ? 150 : 800;
  const annualRecoveredRevenue = missedCallsRecovered * avgBookingValue * 12;

  const formatCurrency = (val: number) => {
    if (currency === "usd") {
      return `$${val.toLocaleString()}`;
    }
    return `₹${val.toLocaleString()}`;
  };

  return (
    <div className="w-full max-w-6xl mx-auto rounded-3xl border border-slate-200 bg-white p-6 sm:p-10 shadow-[0_12px_45px_-15px_rgba(0,0,0,0.07)]">
      {/* Header & Currency Switcher */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-8 border-b border-slate-200/80">
        <div>
          <span className="font-mono-ui text-xs uppercase tracking-wider text-blue-600 font-bold">
            VIRTUAL EMPLOYEE ROI CALCULATOR
          </span>
          <h3 className="font-sora text-2xl sm:text-3xl font-bold text-slate-950 mt-1">
            See how much your clinic saves every year.
          </h3>
          <p className="text-sm text-slate-600 mt-1">
            Compare a traditional human front-desk team with an autonomous 24/7 AI employee.
          </p>
        </div>

        {/* Global Currency Toggle */}
        <div className="flex items-center gap-1.5 p-1 rounded-xl bg-slate-100 border border-slate-200 shrink-0 self-start sm:self-auto font-mono-ui">
          <button
            type="button"
            onClick={() => setCurrency("usd")}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
              currency === "usd" ? "bg-white text-slate-950 shadow-xs" : "text-slate-500 hover:text-slate-800"
            }`}
          >
            🇺🇸 USD ($)
          </button>
          <button
            type="button"
            onClick={() => setCurrency("inr")}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
              currency === "inr" ? "bg-white text-slate-950 shadow-xs" : "text-slate-500 hover:text-slate-800"
            }`}
          >
            🇮🇳 INR (₹)
          </button>
        </div>
      </div>

      {/* Sliders Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 py-8 items-center border-b border-slate-200/80">
        {/* Left Sliders: Interactive Controls */}
        <div className="lg:col-span-7 space-y-7">
          {/* Slider 1: Doctors in Clinic */}
          <div>
            <div className="flex justify-between items-center mb-2 font-mono-ui text-xs">
              <span className="font-bold text-slate-700 uppercase">Doctors / Practitioners:</span>
              <span className="text-base font-extrabold text-blue-600 bg-blue-50 px-3 py-0.5 rounded-md border border-blue-200">
                {doctorsCount} {doctorsCount === 1 ? "Doctor" : "Doctors"}
              </span>
            </div>
            <input
              type="range"
              min="1"
              max="12"
              value={doctorsCount}
              onChange={(e) => setDoctorsCount(Number(e.target.value))}
              className="w-full h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-blue-600"
            />
            <div className="flex justify-between text-[11px] text-slate-400 font-mono-ui mt-1">
              <span>Solo Practitioner (1)</span>
              <span>Medium Clinic (6)</span>
              <span>Hospital (12+)</span>
            </div>
          </div>

          {/* Slider 2: Monthly Patient Inbound Calls */}
          <div>
            <div className="flex justify-between items-center mb-2 font-mono-ui text-xs">
              <span className="font-bold text-slate-700 uppercase">Estimated Monthly Patient Calls:</span>
              <span className="text-base font-extrabold text-blue-600 bg-blue-50 px-3 py-0.5 rounded-md border border-blue-200">
                {callsPerMonth.toLocaleString()} Calls / mo
              </span>
            </div>
            <input
              type="range"
              min="200"
              max="4000"
              step="100"
              value={callsPerMonth}
              onChange={(e) => setCallsPerMonth(Number(e.target.value))}
              className="w-full h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-blue-600"
            />
            <div className="flex justify-between text-[11px] text-slate-400 font-mono-ui mt-1">
              <span>200 calls</span>
              <span>2,000 calls</span>
              <span>4,000+ calls</span>
            </div>
          </div>
        </div>

        {/* Right Output: Savings Highlight Card */}
        <div className="lg:col-span-5 rounded-2xl bg-gradient-to-br from-slate-900 to-slate-950 p-6 text-white shadow-xl flex flex-col justify-between space-y-4">
          <div>
            <span className="font-mono-ui text-[11px] font-bold uppercase tracking-wider text-emerald-400">
              ESTIMATED ANNUAL SAVINGS
            </span>
            <div className="font-sora text-4xl sm:text-5xl font-extrabold text-white tracking-tight mt-1">
              {formatCurrency(annualSavings)}
              <span className="text-xs text-slate-400 font-normal font-mono-ui block mt-1">
                / year saved ({percentSaved}% cost reduction)
              </span>
            </div>
          </div>

          <div className="space-y-2 pt-4 border-t border-slate-800 text-xs font-mono-ui text-slate-300">
            <div className="flex justify-between">
              <span>Human Staff ({humanStaffNeeded} full-time):</span>
              <span className="text-rose-400 font-bold">{formatCurrency(totalHumanCostAnnual)}/yr</span>
            </div>
            <div className="flex justify-between">
              <span>AMSh Virtual Employee:</span>
              <span className="text-emerald-400 font-bold">{formatCurrency(totalAmshCostAnnual)}/yr</span>
            </div>
            <div className="flex justify-between pt-2 border-t border-slate-800/80 text-blue-300">
              <span>Recovered Missed Visits:</span>
              <span className="font-bold">+{missedCallsRecovered} bookings/mo</span>
            </div>
          </div>

          <a
            href="http://localhost:3000/login"
            className="w-full py-3 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-center text-xs uppercase tracking-wider transition-all shadow-md block"
          >
            Hire Your AI Employee Now →
          </a>
        </div>
      </div>

      {/* Direct Comparison Matrix */}
      <div className="pt-8">
        <h4 className="font-sora text-base font-bold text-slate-900 mb-4 text-center sm:text-left">
          Human Receptionist vs. AMSh Autonomous Virtual Employee
        </h4>

        <div className="overflow-x-auto">
          <table className="w-full text-xs text-left">
            <thead>
              <tr className="border-b border-slate-200 text-slate-400 font-mono-ui uppercase text-[10.5px]">
                <th className="py-3 font-bold">Operational Parameter</th>
                <th className="py-3 font-bold text-rose-700">Human Front Desk</th>
                <th className="py-3 font-bold text-blue-600">AMSh AI Employee</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-700 font-medium">
              <tr>
                <td className="py-3 font-semibold text-slate-900">Coverage Hours</td>
                <td className="py-3 text-slate-500">8 hrs/day (closed nights &amp; weekends)</td>
                <td className="py-3 text-emerald-700 font-semibold">24 hours / 365 days nonstop</td>
              </tr>
              <tr>
                <td className="py-3 font-semibold text-slate-900">Concurrent Calls</td>
                <td className="py-3 text-slate-500">1 call at a time (busy tone for 2nd caller)</td>
                <td className="py-3 text-emerald-700 font-semibold">Up to 20 lines answered simultaneously</td>
              </tr>
              <tr>
                <td className="py-3 font-semibold text-slate-900">Response Speed</td>
                <td className="py-3 text-slate-500">3-6 rings (or voicemail if assisting patients)</td>
                <td className="py-3 text-emerald-700 font-semibold">Picks up on 1st ring (&lt;180ms latency)</td>
              </tr>
              <tr>
                <td className="py-3 font-semibold text-slate-900">WhatsApp Triage</td>
                <td className="py-3 text-slate-500">Manual typing during idle moments</td>
                <td className="py-3 text-emerald-700 font-semibold">Instant 24/7 automated WhatsApp CRM</td>
              </tr>
              <tr>
                <td className="py-3 font-semibold text-slate-900">Sick Days &amp; Turnover</td>
                <td className="py-3 text-slate-500">15+ days off/year, retraining required</td>
                <td className="py-3 text-emerald-700 font-semibold">Zero sick days, zero retraining, 99.99% SLA</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
