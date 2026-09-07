"use client";
import React from 'react';
import { STRINGS } from '../../../../utils/strings/en';

const operations = STRINGS.DASHBOARD.COMPONENTS.AI_OPERATIONS.LIST;

export function AIOperationsList() {
  return (
    <div className="bg-white border border-gray-100 rounded-2xl p-6 shadow-sm h-full flex flex-col">
      <h3 className="text-[15px] font-bold text-gray-900 mb-6">{STRINGS.DASHBOARD.COMPONENTS.AI_OPERATIONS.TITLE}</h3>
      
      <div className="flex-1 relative">
        {/* Timeline Line */}
        <div className="absolute left-[3px] top-2 bottom-2 w-px bg-gray-100"></div>

        <div className="space-y-6">
          {operations.map((op, idx) => (
            <div key={idx} className="relative pl-6">
              {/* Timeline Dot */}
              <div className="absolute left-0 top-1.5 w-2 h-2 rounded-full bg-[#0066FF] ring-4 ring-white"></div>
              
              <div className="flex flex-col gap-1">
                <span className="text-[11px] font-bold text-gray-500">{op.time}</span>
                <p className="text-[13px] font-medium text-gray-800 leading-snug">{op.title}</p>
              </div>
              
              {/* Subtle divider except for last item */}
              {idx !== operations.length - 1 && (
                <div className="w-full h-px bg-gray-50 mt-5"></div>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
