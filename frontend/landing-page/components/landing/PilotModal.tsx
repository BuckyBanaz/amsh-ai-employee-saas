"use client";

import React, { useState, useEffect } from "react";

export function openPilotModal() {
  if (typeof window !== "undefined") {
    window.dispatchEvent(new CustomEvent("open-pilot-modal"));
  }
}

export default function PilotModal() {
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [formData, setFormData] = useState({
    clinicName: "",
    fullName: "",
    email: "",
    phone: "",
    location: "United States",
    practiceType: "Dental clinic",
    dailyCalls: "20–50",
    goals: ["Missed calls", "Appointment booking"],
    notes: "",
  });

  useEffect(() => {
    const handleOpen = () => {
      setIsOpen(true);
      setSubmitted(false);
      setError(null);
    };

    window.addEventListener("open-pilot-modal", handleOpen);

    if (typeof window !== "undefined") {
      const params = new URLSearchParams(window.location.search);
      if (params.get("pilot") === "open" || params.get("plan") === "pilot") {
        setIsOpen(true);
      }
    }

    return () => window.removeEventListener("open-pilot-modal", handleOpen);
  }, []);

  const handleGoalToggle = (goal: string) => {
    setFormData((prev) => {
      const exists = prev.goals.includes(goal);
      return {
        ...prev,
        goals: exists ? prev.goals.filter((g) => g !== goal) : [...prev.goals, goal],
      };
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!formData.clinicName.trim() || !formData.fullName.trim() || !formData.email.trim()) {
      setError("Please fill out clinic name, your name, and email.");
      return;
    }

    setLoading(true);

    try {
      const res = await fetch("/api/pilot", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Failed to submit application");
      }

      setSubmitted(true);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Submission failed";
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center p-3 sm:p-4 bg-slate-950/75 backdrop-blur-sm animate-in fade-in duration-150 overflow-y-auto"
      onClick={() => setIsOpen(false)}
      role="dialog"
      aria-modal="true"
    >
      <div
        className="relative w-full max-w-xl max-h-[92vh] overflow-y-auto rounded-2xl bg-white p-5 sm:p-7 text-slate-900 shadow-2xl border border-slate-200/80 my-auto transition-all"
        style={{ scrollbarWidth: "none" }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Top Header Row with Badge & Close Button */}
        <div className="flex items-center justify-between gap-3 mb-3">
          <div className="inline-flex items-center gap-1.5 rounded-full border border-blue-200 bg-blue-50/90 px-2.5 py-1 text-[11px] font-medium text-blue-700">
            <span className="w-1.5 h-1.5 rounded-full bg-blue-600 animate-pulse" />
            <span>14-Day Clinic Pilot &bull; getamsh.com</span>
          </div>

          <button
            onClick={() => setIsOpen(false)}
            className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-500 hover:text-slate-800 flex items-center justify-center transition-colors cursor-pointer shrink-0"
            aria-label="Close dialog"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {submitted ? (
          /* Success Screen */
          <div className="py-6 text-center space-y-4">
            <div className="w-14 h-14 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-600 flex items-center justify-center mx-auto text-2xl font-bold shadow-xs">
              ✓
            </div>
            <div className="space-y-1.5">
              <span className="text-[11px] font-bold uppercase tracking-wider text-emerald-700 bg-emerald-50 px-2.5 py-0.5 rounded-full border border-emerald-200">
                Application Received
              </span>
              <h3 className="font-sora text-xl sm:text-2xl font-bold text-slate-950 pt-1">
                Thank you, {formData.fullName}!
              </h3>
              <p className="text-xs sm:text-sm text-slate-600 max-w-sm mx-auto leading-relaxed">
                We received your pilot application for <strong>{formData.clinicName}</strong>. Our team will contact you via email or WhatsApp within 24 hours to schedule your guided 14-day setup.
              </p>
            </div>

            <div className="rounded-xl border border-slate-100 bg-slate-50 p-3.5 text-xs text-slate-600 text-left space-y-1.5 max-w-sm mx-auto">
              <div className="font-semibold text-slate-900">What happens next:</div>
              <div className="flex items-center gap-1.5">
                <span className="text-blue-600 font-bold">✓</span>
                <span>1-on-1 discovery to review your clinic call flows</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="text-blue-600 font-bold">✓</span>
                <span>Custom AI receptionist tuned with your doctor schedules</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="text-blue-600 font-bold">✓</span>
                <span>14 days supervised testing with direct founder support</span>
              </div>
            </div>

            <div className="pt-2">
              <button
                onClick={() => setIsOpen(false)}
                className="rounded-xl bg-slate-950 hover:bg-blue-600 px-6 py-2.5 text-xs font-semibold text-white transition-colors cursor-pointer"
              >
                Done &bull; Return to Website
              </button>
            </div>
          </div>
        ) : (
          /* Pilot Application Form */
          <div>
            {/* Title & Short Subtitle */}
            <div className="mb-4">
              <h2 className="font-sora text-xl sm:text-2xl font-bold tracking-tight text-slate-950">
                Join the AMSh Pilot Program
              </h2>
              <p className="text-xs text-slate-500 mt-1">
                Apply to test our AI front-desk employee for your clinic. Guided onboarding with direct founder support.
              </p>
            </div>

            {error && (
              <div className="mb-3.5 rounded-lg border border-rose-200 bg-rose-50 p-2.5 text-xs text-rose-700 font-medium flex items-center gap-2">
                <span>⚠️</span>
                <span>{error}</span>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-3.5 text-xs">
              {/* Row 1: Clinic Name & Your Name */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-medium text-slate-700 mb-1">
                    Clinic / Practice Name <span className="text-blue-600 font-bold">&bull;</span>
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Bright Smile Dental"
                    value={formData.clinicName}
                    onChange={(e) => setFormData({ ...formData, clinicName: e.target.value })}
                    className="w-full rounded-lg border border-slate-200 bg-slate-50/60 hover:bg-white hover:border-slate-300 focus:bg-white px-3 py-2 text-slate-900 placeholder:text-slate-400 focus:border-blue-600 focus:ring-2 focus:ring-blue-500/15 outline-none transition-all text-xs sm:text-sm"
                  />
                </div>

                <div>
                  <label className="block font-medium text-slate-700 mb-1">
                    Your Name <span className="text-blue-600 font-bold">&bull;</span>
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="Full name"
                    value={formData.fullName}
                    onChange={(e) => setFormData({ ...formData, fullName: e.target.value })}
                    className="w-full rounded-lg border border-slate-200 bg-slate-50/60 hover:bg-white hover:border-slate-300 focus:bg-white px-3 py-2 text-slate-900 placeholder:text-slate-400 focus:border-blue-600 focus:ring-2 focus:ring-blue-500/15 outline-none transition-all text-xs sm:text-sm"
                  />
                </div>
              </div>

              {/* Row 2: Business Email & Phone */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-medium text-slate-700 mb-1">
                    Business Email <span className="text-blue-600 font-bold">&bull;</span>
                  </label>
                  <input
                    type="email"
                    required
                    placeholder="you@clinic.com"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    className="w-full rounded-lg border border-slate-200 bg-slate-50/60 hover:bg-white hover:border-slate-300 focus:bg-white px-3 py-2 text-slate-900 placeholder:text-slate-400 focus:border-blue-600 focus:ring-2 focus:ring-blue-500/15 outline-none transition-all text-xs sm:text-sm"
                  />
                </div>

                <div>
                  <label className="block font-medium text-slate-700 mb-1">
                    Phone / WhatsApp
                  </label>
                  <input
                    type="tel"
                    placeholder="Include country code (e.g. +1 / +44)"
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    className="w-full rounded-lg border border-slate-200 bg-slate-50/60 hover:bg-white hover:border-slate-300 focus:bg-white px-3 py-2 text-slate-900 placeholder:text-slate-400 focus:border-blue-600 focus:ring-2 focus:ring-blue-500/15 outline-none transition-all text-xs sm:text-sm"
                  />
                </div>
              </div>

              {/* Row 3: Location & Practice Type */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-medium text-slate-700 mb-1">
                    Clinic Location <span className="text-blue-600 font-bold">&bull;</span>
                  </label>
                  <div className="relative">
                    <select
                      value={formData.location}
                      onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                      className="w-full appearance-none rounded-lg border border-slate-200 bg-slate-50/60 hover:bg-white hover:border-slate-300 focus:bg-white px-3 py-2 text-slate-900 focus:border-blue-600 focus:ring-2 focus:ring-blue-500/15 outline-none transition-all text-xs sm:text-sm cursor-pointer"
                    >
                      <option value="United Kingdom">United Kingdom</option>
                      <option value="United States">United States</option>
                      <option value="India">India</option>
                      <option value="Canada">Canada</option>
                      <option value="Australia">Australia</option>
                      <option value="UAE / Middle East">UAE / Middle East</option>
                      <option value="Other">Other</option>
                    </select>
                    <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2.5 text-slate-400">
                      <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                      </svg>
                    </div>
                  </div>
                </div>

                <div>
                  <label className="block font-medium text-slate-700 mb-1">
                    Practice Type <span className="text-blue-600 font-bold">&bull;</span>
                  </label>
                  <div className="relative">
                    <select
                      value={formData.practiceType}
                      onChange={(e) => setFormData({ ...formData, practiceType: e.target.value })}
                      className="w-full appearance-none rounded-lg border border-slate-200 bg-slate-50/60 hover:bg-white hover:border-slate-300 focus:bg-white px-3 py-2 text-slate-900 focus:border-blue-600 focus:ring-2 focus:ring-blue-500/15 outline-none transition-all text-xs sm:text-sm cursor-pointer"
                    >
                      <option value="Dental clinic">Dental clinic</option>
                      <option value="General medical clinic">General medical clinic</option>
                      <option value="Aesthetic / Med spa">Aesthetic / Med spa</option>
                      <option value="Physiotherapy / Rehab">Physiotherapy / Rehab</option>
                      <option value="Multi-specialty hospital">Multi-specialty hospital</option>
                      <option value="Other">Other</option>
                    </select>
                    <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2.5 text-slate-400">
                      <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                      </svg>
                    </div>
                  </div>
                </div>
              </div>

              {/* Inbound calls per day (Compact Segmented Row) */}
              <div>
                <label className="block font-medium text-slate-700 mb-1.5">
                  Approximate inbound calls per day
                </label>
                <div className="grid grid-cols-5 gap-1.5">
                  {["Under 20", "20–50", "50–100", "100+", "Not sure"].map((callOpt) => {
                    const isSelected = formData.dailyCalls === callOpt;
                    return (
                      <button
                        type="button"
                        key={callOpt}
                        onClick={() => setFormData({ ...formData, dailyCalls: callOpt })}
                        className={`py-1.5 px-1 rounded-lg text-[11px] font-semibold transition-all text-center cursor-pointer ${
                          isSelected
                            ? "bg-blue-600 text-white shadow-xs"
                            : "border border-slate-200 bg-slate-50 text-slate-700 hover:bg-white hover:border-slate-300"
                        }`}
                      >
                        {callOpt}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Automation Goals (Compact Selectable Chips) */}
              <div>
                <label className="block font-medium text-slate-700 mb-1.5">
                  What would you like AMSh to help with?
                </label>
                <div className="flex flex-wrap gap-1.5">
                  {[
                    "Missed calls",
                    "Appointment booking",
                    "After-hours calls",
                    "WhatsApp enquiries",
                    "Appointment reminders",
                  ].map((goal) => {
                    const isChecked = formData.goals.includes(goal);
                    return (
                      <button
                        type="button"
                        key={goal}
                        onClick={() => handleGoalToggle(goal)}
                        className={`inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border text-[11px] font-medium transition-all cursor-pointer ${
                          isChecked
                            ? "bg-blue-50 border-blue-500 text-blue-900 font-semibold"
                            : "bg-slate-50 border-slate-200 text-slate-600 hover:bg-white hover:border-slate-300"
                        }`}
                      >
                        <span className={`w-3.5 h-3.5 rounded flex items-center justify-center text-[10px] ${
                          isChecked ? "bg-blue-600 text-white" : "border border-slate-300 bg-white"
                        }`}>
                          {isChecked ? "✓" : ""}
                        </span>
                        <span>{goal}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Submit Button */}
              <div className="pt-2">
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full flex items-center justify-center gap-2 rounded-xl bg-blue-600 hover:bg-blue-700 py-3 text-sm font-semibold text-white shadow-md shadow-blue-500/25 transition disabled:opacity-50 cursor-pointer active:scale-[0.99]"
                >
                  {loading ? (
                    <>
                      <span className="w-4 h-4 rounded-full border-2 border-white border-t-transparent animate-spin" />
                      <span>Submitting...</span>
                    </>
                  ) : (
                    <span>Submit Pilot Application &rarr;</span>
                  )}
                </button>
                <div className="flex items-center justify-center gap-2 text-[10.5px] text-slate-400 text-center mt-2 font-medium">
                  <span>🔒 No credit card required</span>
                  <span>&bull;</span>
                  <span>14-day guided trial</span>
                  <span>&bull;</span>
                  <span>Reply in 24h</span>
                </div>
              </div>
            </form>
          </div>
        )}
      </div>
    </div>
  );
}
