"use client";
import React from 'react';
import { STRINGS } from '../../utils/strings/en';

const operations = STRINGS.DASHBOARD.COMPONENTS.AI_OPERATIONS.LIST;

export function AIOperationsList() {
  return (
    <div className="bg-white border border-gray-100 rounded-xl p-4 shadow-[0_1px_4px_rgba(0,0,0,0.03)] h-full flex flex-col">
      <h3 className="text-xs font-bold text-gray-900 tracking-tight mb-3">{STRINGS.DASHBOARD.COMPONENTS.AI_OPERATIONS.TITLE}</h3>
      
      <div className="flex-1 relative">
        {/* Timeline Line */}
        <div className="absolute left-[3px] top-1.5 bottom-1.5 w-px bg-gray-100"></div>

        <div className="space-y-3">
          {operations.map((op, idx) => (
            <div key={idx} className="relative pl-5">
              {/* Timeline Dot */}
              <div className="absolute left-0 top-1.5 w-1.5 h-1.5 rounded-full bg-[#0066FF] ring-2 ring-white"></div>
              
              <div className="flex flex-col gap-0.5">
                <span className="text-[10px] font-medium text-gray-400">{op.time}</span>
                <p className="text-xs font-medium text-gray-800 leading-snug">{op.title}</p>
              </div>
              
              {idx !== operations.length - 1 && (
                <div className="w-full h-px bg-gray-50 mt-2.5"></div>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
