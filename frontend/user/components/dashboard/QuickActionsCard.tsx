"use client";
import React from 'react';
import Link from 'next/link';

export function QuickActionsCard() {
  return (
    <div className="bg-white border border-gray-100 rounded-xl shadow-[0_1px_4px_rgba(0,0,0,0.03)] p-4">
      <h2 className="text-xs font-bold text-gray-900 tracking-wider uppercase mb-3">Quick Actions</h2>
      
      <div className="grid grid-cols-2 gap-2 mb-2.5">
        <Link href="/appointments" className="py-2 px-2 bg-gray-50 hover:bg-gray-100 rounded-lg text-xs font-semibold text-gray-800 transition-colors text-center block">
          + Appointment
        </Link>
        <Link href="/patients" className="py-2 px-2 bg-gray-50 hover:bg-gray-100 rounded-lg text-xs font-semibold text-gray-800 transition-colors text-center block">
          + Patient
        </Link>
        <Link href="/ai?test=true" className="py-2 px-2 bg-gray-50 hover:bg-gray-100 rounded-lg text-xs font-semibold text-gray-800 transition-colors text-center block">
          Test Voice AI
        </Link>
        <Link href="/services" className="py-2 px-2 bg-gray-50 hover:bg-gray-100 rounded-lg text-xs font-semibold text-gray-800 transition-colors text-center block">
          + Service
        </Link>
      </div>

      <Link href="/ai" className="w-full py-2 bg-[#F0F7FF] hover:bg-blue-50 text-[#0066FF] rounded-lg text-xs font-bold transition-colors text-center block">
        Configure AI Receptionist
      </Link>
    </div>
  );
}

