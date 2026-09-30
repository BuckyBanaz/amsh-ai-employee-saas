"use client";
import React, { useState } from 'react';
import { TableSkeleton } from '../common/ShimmerSkeleton';
import { InvoiceItem } from '../../controllers/billing.controller';

export interface InvoiceHistoryProps {
  invoices?: InvoiceItem[];
  isLoading?: boolean;
  businessName?: string;
  businessCurrency?: string;
}

export function InvoiceHistory({
  invoices = [],
  isLoading = false,
  businessName = "Medical Practice",
  businessCurrency = "USD"
}: InvoiceHistoryProps) {
  const [selectedInvoice, setSelectedInvoice] = useState<InvoiceItem | null>(null);

  const handlePrint = () => {
    if (typeof window !== 'undefined') {
      window.print();
    }
  };

  if (isLoading) {
    return (
      <div className="bg-white border border-gray-100 rounded-xl shadow-[0_1px_4px_rgba(0,0,0,0.03)] overflow-hidden mb-6 p-4">
        <div className="mb-4">
          <div className="h-4 w-36 bg-gray-200 rounded animate-pulse mb-1" />
          <div className="h-3 w-56 bg-gray-100 rounded animate-pulse" />
        </div>
        <TableSkeleton rows={4} headers={['DATE', 'INVOICE NUMBER', 'DESCRIPTION', 'AMOUNT', 'STATUS', 'ACTION']} />
      </div>
    );
  }

  return (
    <div className="bg-white border border-gray-100 rounded-xl shadow-[0_1px_4px_rgba(0,0,0,0.03)] overflow-hidden mb-6">
      <div className="px-5 py-3.5 border-b border-gray-100 flex items-center justify-between">
        <div>
          <h3 className="text-sm font-bold text-gray-900 tracking-tight">
            Billing Invoices & Receipts
          </h3>
          <p className="text-[11px] text-gray-500">
            Download your tax invoices and view subscription payment history.
          </p>
        </div>
        <span className="text-xs font-semibold text-gray-500 bg-gray-50 px-2.5 py-1 rounded-full border border-gray-100">
          {invoices.length} {invoices.length === 1 ? 'Invoice' : 'Invoices'}
        </span>
      </div>

      {invoices.length === 0 ? (
        <div className="text-center py-10 px-4">
          <div className="w-10 h-10 rounded-full bg-blue-50 text-[#0066FF] flex items-center justify-center mx-auto mb-2">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
              <polyline points="14 2 14 8 20 8"></polyline>
              <line x1="16" y1="13" x2="8" y2="13"></line>
              <line x1="16" y1="17" x2="8" y2="17"></line>
              <polyline points="10 9 9 9 8 9"></polyline>
            </svg>
          </div>
          <h4 className="text-xs font-bold text-gray-800">No invoices yet</h4>
          <p className="text-[11px] text-gray-500 mt-0.5">
            Invoices will appear here once your billing cycle completes.
          </p>
        </div>
      ) : (
        <div className="overflow-x-auto scrollbar-hide">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-[#F9FAFB]/70 border-b border-gray-100">
                <th className="px-4 py-2.5 text-[10px] font-bold text-gray-400 uppercase tracking-wider">Date</th>
                <th className="px-4 py-2.5 text-[10px] font-bold text-gray-400 uppercase tracking-wider">Invoice #</th>
                <th className="px-4 py-2.5 text-[10px] font-bold text-gray-400 uppercase tracking-wider">Description</th>
                <th className="px-4 py-2.5 text-[10px] font-bold text-gray-400 uppercase tracking-wider">Amount</th>
                <th className="px-4 py-2.5 text-[10px] font-bold text-gray-400 uppercase tracking-wider">Status</th>
                <th className="px-4 py-2.5 text-[10px] font-bold text-gray-400 uppercase tracking-wider text-right">Receipt</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {invoices.map((invoice) => (
                <tr key={invoice.id} className="hover:bg-blue-50/20 transition-colors group">
                  <td className="px-4 py-3 text-xs font-semibold text-gray-900 whitespace-nowrap">
                    {invoice.date}
                  </td>
                  <td className="px-4 py-3 text-xs font-mono font-medium text-gray-700 whitespace-nowrap">
                    {invoice.number}
                  </td>
                  <td className="px-4 py-3 text-xs text-gray-600">
                    <div>{invoice.description}</div>
                    <div className="text-[10px] text-gray-400">{invoice.period}</div>
                  </td>
                  <td className="px-4 py-3 text-xs font-mono font-bold text-gray-900 whitespace-nowrap">
                    {invoice.amount}
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap">
                    <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-[#E6FBF3] text-[#10B981] border border-emerald-100">
                      <span className="w-1.5 h-1.5 rounded-full bg-[#10B981]" />
                      {invoice.status}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right whitespace-nowrap">
                    <button
                      type="button"
                      onClick={() => setSelectedInvoice(invoice)}
                      className="inline-flex items-center gap-1.5 text-xs font-bold text-[#0066FF] hover:text-[#0052cc] bg-blue-50/70 hover:bg-blue-100/70 px-2.5 py-1 rounded-md transition-colors cursor-pointer"
                    >
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
                        <polyline points="7 10 12 15 17 10"></polyline>
                        <line x1="12" y1="15" x2="12" y2="3"></line>
                      </svg>
                      View / Print
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Invoice Receipt Modal */}
      {selectedInvoice && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-gray-900/60 backdrop-blur-xs p-4 animate-in fade-in duration-200">
          <div className="bg-white rounded-2xl max-w-xl w-full p-6 shadow-2xl border border-gray-100 space-y-5 max-h-[90vh] overflow-y-auto">
            {/* Header */}
            <div className="flex items-start justify-between border-b border-gray-100 pb-4">
              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-[#0066FF] bg-blue-50 px-2 py-0.5 rounded">
                  ORIGINAL TAX INVOICE
                </span>
                <h3 className="text-xl font-black text-gray-900 mt-1">
                  {selectedInvoice.number}
                </h3>
                <p className="text-xs text-gray-500">
                  Issued on {selectedInvoice.date} • Paid via {selectedInvoice.payment_method}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setSelectedInvoice(null)}
                className="text-gray-400 hover:text-gray-600 p-1 rounded-lg hover:bg-gray-100 cursor-pointer"
              >
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="18" y1="6" x2="6" y2="18"></line>
                  <line x1="6" y1="6" x2="18" y2="18"></line>
                </svg>
              </button>
            </div>

            {/* Bill Details */}
            <div className="grid grid-cols-2 gap-4 text-xs">
              <div className="space-y-1">
                <span className="text-[10px] uppercase font-bold text-gray-400 tracking-wider">Billed To</span>
                <p className="font-bold text-gray-900">{businessName}</p>
                <p className="text-gray-500">Subscription Account</p>
                <p className="text-gray-500">Active Tenant</p>
              </div>
              <div className="space-y-1 text-right">
                <span className="text-[10px] uppercase font-bold text-gray-400 tracking-wider">Service Provider</span>
                <p className="font-bold text-gray-900">AMSh AI Technologies Inc.</p>
                <p className="text-gray-500">AI Receptionist SaaS Platform</p>
                <p className="text-gray-500">billing@amsh-ai.com</p>
              </div>
            </div>

            {/* Itemized Table */}
            <div className="border border-gray-100 rounded-xl overflow-hidden">
              <table className="w-full text-left text-xs">
                <thead className="bg-gray-50 border-b border-gray-100 text-[10px] font-bold text-gray-500 uppercase tracking-wider">
                  <tr>
                    <th className="px-4 py-2">Item Description</th>
                    <th className="px-4 py-2">Period</th>
                    <th className="px-4 py-2 text-right">Amount</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  <tr>
                    <td className="px-4 py-3 font-medium text-gray-900">
                      {selectedInvoice.description}
                    </td>
                    <td className="px-4 py-3 text-gray-500 font-mono text-[11px]">
                      {selectedInvoice.period}
                    </td>
                    <td className="px-4 py-3 text-right font-mono font-bold text-gray-900">
                      {selectedInvoice.amount}
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>

            {/* Summary */}
            <div className="space-y-2 text-xs border-t border-gray-100 pt-3">
              <div className="flex justify-between text-gray-500">
                <span>Subtotal:</span>
                <span className="font-mono">{selectedInvoice.amount}</span>
              </div>
              <div className="flex justify-between text-gray-500">
                <span>Applicable Taxes / GST:</span>
                <span className="font-mono">Included</span>
              </div>
              <div className="flex justify-between text-base font-bold text-gray-900 border-t border-gray-100 pt-2">
                <span>Total Paid:</span>
                <span className="font-mono text-[#0066FF]">{selectedInvoice.amount}</span>
              </div>
            </div>

            {/* Actions */}
            <div className="flex items-center justify-between border-t border-gray-100 pt-4">
              <div className="flex items-center gap-1.5 text-xs text-emerald-700 font-semibold bg-emerald-50 px-2.5 py-1 rounded-full border border-emerald-200/50">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="20 6 9 17 4 12"></polyline>
                </svg>
                Payment Confirmed & Settled
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setSelectedInvoice(null)}
                  className="px-3 py-1.5 rounded-lg text-xs font-semibold text-gray-700 hover:bg-gray-100 cursor-pointer"
                >
                  Close
                </button>
                <button
                  type="button"
                  onClick={handlePrint}
                  className="px-3.5 py-1.5 bg-[#0066FF] hover:bg-[#0052cc] text-white rounded-lg text-xs font-bold shadow-xs cursor-pointer flex items-center gap-1.5"
                >
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="6 9 6 2 18 2 18 9"></polyline>
                    <path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"></path>
                    <rect x="6" y="14" width="12" height="8"></rect>
                  </svg>
                  Print / Save Receipt
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
