"use client";
import React from 'react';
import { STRINGS } from '../../utils/strings/en';

const invoices = STRINGS.DASHBOARD.COMPONENTS.INVOICE_HISTORY.TABLE.MOCK_DATA;

export function InvoiceHistory() {
  return (
    <div className="bg-white border border-gray-100 rounded-xl shadow-[0_1px_4px_rgba(0,0,0,0.03)] overflow-hidden mb-4">
      <div className="px-4 py-3 border-b border-gray-100">
        <h3 className="text-sm font-bold text-gray-900 tracking-tight">{STRINGS.DASHBOARD.COMPONENTS.INVOICE_HISTORY.TITLE}</h3>
      </div>
      
      <div className="overflow-x-auto scrollbar-hide">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr>
              <th className="px-3.5 py-2 text-[10px] font-bold text-gray-400 uppercase tracking-wider bg-[#F9FAFB]/60 border-b border-gray-100">{STRINGS.DASHBOARD.COMPONENTS.INVOICE_HISTORY.TABLE.COLS[0]}</th>
              <th className="px-3.5 py-2 text-[10px] font-bold text-gray-400 uppercase tracking-wider bg-[#F9FAFB]/60 border-b border-gray-100">{STRINGS.DASHBOARD.COMPONENTS.INVOICE_HISTORY.TABLE.COLS[1]}</th>
              <th className="px-3.5 py-2 text-[10px] font-bold text-gray-400 uppercase tracking-wider bg-[#F9FAFB]/60 border-b border-gray-100">{STRINGS.DASHBOARD.COMPONENTS.INVOICE_HISTORY.TABLE.COLS[2]}</th>
              <th className="px-3.5 py-2 text-[10px] font-bold text-gray-400 uppercase tracking-wider bg-[#F9FAFB]/60 border-b border-gray-100">{STRINGS.DASHBOARD.COMPONENTS.INVOICE_HISTORY.TABLE.COLS[3]}</th>
              <th className="px-3.5 py-2 text-[10px] font-bold text-gray-400 uppercase tracking-wider bg-[#F9FAFB]/60 border-b border-gray-100 text-right">{STRINGS.DASHBOARD.COMPONENTS.INVOICE_HISTORY.TABLE.COLS[4]}</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {invoices.map((invoice, idx) => (
              <tr key={idx} className="hover:bg-gray-50/50 transition-colors">
                <td className="px-3.5 py-2 text-xs font-semibold text-gray-900 whitespace-nowrap">{invoice.date}</td>
                <td className="px-3.5 py-2 text-xs text-gray-500">{invoice.description}</td>
                <td className="px-3.5 py-2 text-xs font-semibold text-gray-900 whitespace-nowrap">{invoice.amount}</td>
                <td className="px-3.5 py-2 whitespace-nowrap">
                  <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold bg-[#E6FBF3] text-[#10B981]">
                    {invoice.status}
                  </span>
                </td>
                <td className="px-3.5 py-2 text-right whitespace-nowrap">
                  <button className="text-xs font-semibold text-[#0066FF] hover:text-[#0052cc] transition-colors">
                    {STRINGS.DASHBOARD.COMPONENTS.INVOICE_HISTORY.TABLE.DOWNLOAD_BTN}
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
