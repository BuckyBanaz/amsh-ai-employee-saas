"use client";
import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { adminFetch } from '../../../lib/api';

interface BusinessUser {
  id: string;
  name: string;
  email: string;
  business: string;
  businessId: string;
  businessType: string;
  role: string;
  status: 'Active' | 'Suspended';
  lastActive: string;
}

const STATUS_STYLES: Record<string, { bg: string; text: string }> = {
  Active: { bg: 'bg-[#D1FAE5]', text: 'text-[#065F46]' },
  Suspended: { bg: 'bg-[#FEE2E2]', text: 'text-[#991B1B]' },
};

export default function BusinessUsersPage() {
  const [users, setUsers] = useState<BusinessUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedRole, setSelectedRole] = useState<string>('All');

  const loadUsers = async () => {
    setLoading(true);
    try {
      const res = await adminFetch<{ items: BusinessUser[] }>('/admin/business-users');
      setUsers(res.items || []);
      setError('');
    } catch (err: any) {
      console.error('Failed to load business users:', err);
      setError('Could not load business users from server.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadUsers();
  }, []);

  const filteredUsers = users.filter((user) => {
    const matchesSearch =
      user.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      user.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
      user.business.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesRole = selectedRole === 'All' || user.role.toLowerCase() === selectedRole.toLowerCase();

    return matchesSearch && matchesRole;
  });

  return (
    <div className="flex-1 overflow-y-auto scrollbar-hide p-4 sm:p-5 animate-in fade-in duration-500">
      {/* Header */}
      <header className="mb-4 pb-3 border-b border-[#E2E8F0] flex justify-between items-center">
        <div>
          <h1 className="text-lg font-bold text-[#0F172A] tracking-tight leading-tight">
            Business Users
          </h1>
          <p className="text-xs text-[#475569] mt-0.5 font-normal">
            Real staff users across registered platform tenants.
          </p>
        </div>
      </header>

      {/* Filter & Action Bar */}
      <div className="bg-white border border-[#E2E8F0] rounded-lg p-2.5 mb-3.5 shadow-2xs flex flex-wrap items-center justify-between gap-2.5">
        <div className="flex flex-wrap items-center gap-3">
          {/* Search Box */}
          <div className="relative w-[240px]">
            <span className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none text-[#94A3B8]">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="11" cy="11" r="8"></circle>
                <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
              </svg>
            </span>
            <input
              type="text"
              placeholder="Search user name, email, business..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-8 pr-3 py-1.5 bg-[#F8FAFC] border border-[#E2E8F0] rounded-md text-xs text-[#0F172A] placeholder-[#94A3B8] focus:outline-none focus:ring-2 focus:ring-[#2563EB]"
            />
          </div>

          {/* Role Filter */}
          <select
            value={selectedRole}
            onChange={(e) => setSelectedRole(e.target.value)}
            className="px-3 py-1.5 bg-[#F8FAFC] border border-[#E2E8F0] rounded-md text-xs font-semibold text-[#475569] hover:bg-gray-100/80 transition-colors focus:outline-none focus:ring-2 focus:ring-[#2563EB]"
          >
            <option value="All">Role: All</option>
            <option value="Owner">Owner</option>
            <option value="Admin">Admin</option>
            <option value="Doctor">Doctor</option>
            <option value="Staff">Staff</option>
          </select>

          {searchQuery && (
            <button
              onClick={() => { setSearchQuery(''); setSelectedRole('All'); }}
              className="text-xs font-semibold text-[#2563EB] hover:underline"
            >
              Reset
            </button>
          )}
        </div>
      </div>

      {/* Results Info */}
      <div className="mb-2 text-[11px] font-semibold text-[#94A3B8]">
        Showing <span className="text-[#0F172A]">{filteredUsers.length}</span> tenant users
      </div>

      {/* Users Table */}
      <div className="bg-white border border-[#E2E8F0] rounded-lg shadow-2xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-[#F8FAFC] border-b border-[#E2E8F0]">
                <th className="px-3.5 py-2 text-[10px] font-bold text-[#475569] uppercase tracking-wider">User</th>
                <th className="px-3.5 py-2 text-[10px] font-bold text-[#475569] uppercase tracking-wider">Business</th>
                <th className="px-3.5 py-2 text-[10px] font-bold text-[#475569] uppercase tracking-wider">Role</th>
                <th className="px-3.5 py-2 text-[10px] font-bold text-[#475569] uppercase tracking-wider">Status</th>
                <th className="px-3.5 py-2 text-[10px] font-bold text-[#475569] uppercase tracking-wider">Last Active</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#E2E8F0]">
              {loading ? (
                <tr>
                  <td colSpan={5} className="px-3.5 py-8 text-center text-xs text-[#94A3B8]">Loading tenant users...</td>
                </tr>
              ) : error ? (
                <tr>
                  <td colSpan={5} className="px-3.5 py-8 text-center text-xs text-red-600">{error}</td>
                </tr>
              ) : filteredUsers.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-3.5 py-8 text-center text-xs text-[#94A3B8]">
                    No business users found. Users created by clinic owners will appear here.
                  </td>
                </tr>
              ) : (
                filteredUsers.map((user) => {
                  const style = STATUS_STYLES[user.status] || STATUS_STYLES.Active;
                  return (
                    <tr key={user.id} className="hover:bg-[#F8FAFC]/70 transition-colors">
                      <td className="px-3.5 py-2.5">
                        <div className="text-xs font-bold text-[#0F172A]">{user.name}</div>
                        <div className="text-[10px] text-[#94A3B8]">{user.email}</div>
                      </td>
                      <td className="px-3.5 py-2.5">
                        <Link href={`/businesses/${user.businessId}`} className="text-xs font-semibold text-[#0F172A] hover:text-[#2563EB]">
                          {user.business}
                        </Link>
                        <div className="text-[10px] text-[#94A3B8]">{user.businessType}</div>
                      </td>
                      <td className="px-3.5 py-2.5 text-xs font-medium text-[#475569]">{user.role}</td>
                      <td className="px-3.5 py-2.5">
                        <span className={`inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-semibold ${style.bg} ${style.text}`}>
                          {user.status}
                        </span>
                      </td>
                      <td className="px-3.5 py-2.5 text-xs text-[#475569]">{user.lastActive}</td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
