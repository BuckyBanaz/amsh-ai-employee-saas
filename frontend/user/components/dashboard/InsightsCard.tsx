"use client";
import React from 'react';

interface InsightsCardProps {
  totalCalls?: number;
  bookedAppointments?: number;
  conversionRate?: string;
}

export function InsightsCard({
  totalCalls = 0,
  bookedAppointments = 0,
  conversionRate = '100%',
}: InsightsCardProps) {
  return (
    <div className="bg-white border border-gray-100 rounded-xl shadow-[0_1px_4px_rgba(0,0,0,0.03)] p-4">
      <h2 className="text-xs font-bold text-gray-900 tracking-wider uppercase mb-3">AI Reception Insights</h2>

      <ul className="space-y-2.5">
        <li className="flex items-start gap-2.5">
          <div className="w-1.5 h-1.5 rounded-full bg-[#0066FF] mt-1.5 shrink-0"></div>
          <p className="text-xs text-gray-600 leading-relaxed">
            {totalCalls > 0
              ? `AI resolved ${conversionRate} of caller inquiries without receptionist assistance.`
              : 'Deterministic voice state machine active for low-latency (<800ms) patient calls.'}
          </p>
        </li>
        <li className="flex items-start gap-2.5">
          <div className="w-1.5 h-1.5 rounded-full bg-[#0066FF] mt-1.5 shrink-0"></div>
          <p className="text-xs text-gray-600 leading-relaxed">
            {bookedAppointments > 0
              ? `${bookedAppointments} patient appointments scheduled directly into PostgreSQL database.`
              : 'Appointment slots automatically check availability before confirming caller times.'}
          </p>
        </li>
        <li className="flex items-start gap-2.5">
          <div className="w-1.5 h-1.5 rounded-full bg-[#10B981] mt-1.5 shrink-0"></div>
          <p className="text-xs text-gray-600 leading-relaxed">
            Sub-50ms RAG knowledge retrieval answering clinic services, timings, and policies.
          </p>
        </li>
      </ul>
    </div>
  );
}
