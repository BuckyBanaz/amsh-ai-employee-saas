"use client";
import React from 'react';
import { STRINGS } from '../../utils/strings/en';

const invoices = STRINGS.DASHBOARD.COMPONENTS.INVOICE_HISTORY.TABLE.MOCK_DATA;

export function InvoiceHistory() {
  return (
    <div className="bg-white border border-gray-100 rounded-2xl shadow-sm overflow-hidden mb-8">
      <div className="p-6 border-b border-gray-50">
        <h3 className="text-[16px] font-extrabold text-gray-900 tracking-tight">{STRINGS.DASHBOARD.COMPONENTS.INVOICE_HISTORY.TITLE}</h3>
      </div>
      
      <div className="overflow-x-auto scrollbar-hide">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr>
              <th className="px-6 py-4 text-[11px] font-extrabold text-gray-400 uppercase tracking-wider bg-white border-b border-gray-50">{STRINGS.DASHBOARD.COMPONENTS.INVOICE_HISTORY.TABLE.COLS[0]}</th>
              <th className="px-6 py-4 text-[11px] font-extrabold text-gray-400 uppercase tracking-wider bg-white border-b border-gray-50">{STRINGS.DASHBOARD.COMPONENTS.INVOICE_HISTORY.TABLE.COLS[1]}</th>
              <th className="px-6 py-4 text-[11px] font-extrabold text-gray-400 uppercase tracking-wider bg-white border-b border-gray-50">{STRINGS.DASHBOARD.COMPONENTS.INVOICE_HISTORY.TABLE.COLS[2]}</th>
              <th className="px-6 py-4 text-[11px] font-extrabold text-gray-400 uppercase tracking-wider bg-white border-b border-gray-50">{STRINGS.DASHBOARD.COMPONENTS.INVOICE_HISTORY.TABLE.COLS[3]}</th>
              <th className="px-6 py-4 text-[11px] font-extrabold text-gray-400 uppercase tracking-wider bg-white border-b border-gray-50 text-right">{STRINGS.DASHBOARD.COMPONENTS.INVOICE_HISTORY.TABLE.COLS[4]}</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {invoices.map((invoice, idx) => (
              <tr key={idx} className="hover:bg-gray-50/50 transition-colors">
                <td className="px-6 py-4 text-[13px] font-bold text-gray-900 whitespace-nowrap">{invoice.date}</td>
                <td className="px-6 py-4 text-[13px] font-medium text-gray-500">{invoice.description}</td>
                <td className="px-6 py-4 text-[13px] font-bold text-gray-900 whitespace-nowrap">{invoice.amount}</td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <span className="inline-flex items-center px-2.5 py-0.5 rounded text-[11px] font-bold bg-[#E6FBF3] text-[#10B981]">
                    {invoice.status}
                  </span>
                </td>
                <td className="px-6 py-4 text-right whitespace-nowrap">
                  <button className="text-[13px] font-bold text-[#0066FF] hover:text-[#0052cc] transition-colors">
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
