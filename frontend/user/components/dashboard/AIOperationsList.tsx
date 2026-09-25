"use client";
import React, { useEffect, useState } from 'react';
import { STRINGS } from '../../utils/strings/en';
import { DashboardController, CallLogItem } from '../../controllers/dashboard.controller';

export function AIOperationsList() {
  const [operations, setOperations] = useState<Array<{ time: string; title: string; outcome?: string }>>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    DashboardController.getCalls(undefined, { limit: 6 })
      .then((calls: CallLogItem[]) => {
        if (calls && calls.length > 0) {
          const ops = calls.map((c) => {
            const timeStr = c.started_at
              ? new Date(c.started_at).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })
              : 'Recent';
            const actionText = c.summary || `AI handled call from ${c.caller_name || c.caller_number} (${c.intent || 'General'})`;
            return {
              time: timeStr,
              title: actionText,
              outcome: c.outcome,
            };
          });
          setOperations(ops);
        } else {
          setOperations(STRINGS.DASHBOARD.COMPONENTS.AI_OPERATIONS.LIST);
        }
      })
      .catch(() => {
        setOperations(STRINGS.DASHBOARD.COMPONENTS.AI_OPERATIONS.LIST);
      })
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="bg-white border border-gray-100 rounded-xl p-4 shadow-[0_1px_4px_rgba(0,0,0,0.03)] h-full flex flex-col min-h-[260px]">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-xs font-bold text-gray-900 tracking-tight">{STRINGS.DASHBOARD.COMPONENTS.AI_OPERATIONS.TITLE}</h3>
        <span className="text-[10px] font-semibold text-gray-400">Live Actions</span>
      </div>
      
      <div className="flex-1 relative overflow-y-auto max-h-[220px]">
        {/* Timeline Line */}
        <div className="absolute left-[3px] top-1.5 bottom-1.5 w-px bg-gray-100"></div>

        {loading ? (
          <div className="p-4 text-center text-xs text-gray-400">Loading live operations...</div>
        ) : (
          <div className="space-y-3">
            {operations.map((op, idx) => (
              <div key={idx} className="relative pl-5">
                {/* Timeline Dot */}
                <div className={`absolute left-0 top-1.5 w-1.5 h-1.5 rounded-full ring-2 ring-white ${
                  op.outcome === 'transferred' ? 'bg-amber-500' : 'bg-[#0066FF]'
                }`}></div>
                
                <div className="flex flex-col gap-0.5">
                  <span className="text-[10px] font-medium text-gray-400">{op.time}</span>
                  <p className="text-xs font-medium text-gray-800 leading-snug line-clamp-2">{op.title}</p>
                </div>
                
                {idx !== operations.length - 1 && (
                  <div className="w-full h-px bg-gray-50 mt-2.5"></div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
