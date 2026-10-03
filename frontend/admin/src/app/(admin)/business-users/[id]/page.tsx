"use client";
import React, { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import {
  fetchBusinessUser,
  updateBusinessUser,
  BusinessUserDetail,
} from '@/lib/api';

export default function UserDetailPage() {
  const params = useParams();
  const userId = typeof params?.id === 'string' ? params.id : '';

  const [user, setUser] = useState<BusinessUserDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [activeTab, setActiveTab] = useState<'businesses' | 'activity' | 'permissions'>('businesses');
  const [actionSuccess, setActionSuccess] = useState('');
  const [actionError, setActionError] = useState('');
  const [updating, setUpdating] = useState(false);

  const loadUser = useCallback(async () => {
    if (!userId) return;
    try {
      setError('');
      const data = await fetchBusinessUser(userId);
      setUser(data);
    } catch {
      setError('Could not load user profile from the database.');
    } finally {
      setLoading(false);
    }
  }, [userId]);

  useEffect(() => {
    loadUser();
  }, [loadUser]);

  const handleToggleStatus = async () => {
    if (!user) return;
    setUpdating(true);
    setActionError('');
    try {
      const newStatus = !user.is_active;
      await updateBusinessUser(user.id, { is_active: newStatus });
      setUser((prev) =>
        prev
          ? {
              ...prev,
              is_active: newStatus,
              status: newStatus ? 'Active' : 'Suspended',
            }
          : null
      );
      setActionSuccess(`User status changed to ${newStatus ? 'Active' : 'Suspended'}.`);
      setTimeout(() => setActionSuccess(''), 3000);
    } catch {
      setActionError('Failed to update user status.');
    } finally {
      setUpdating(false);
    }
  };

  const handleChangeRole = async (newRole: string) => {
    if (!user) return;
    setUpdating(true);
    setActionError('');
    try {
      await updateBusinessUser(user.id, { role: newRole });
      setUser((prev) => (prev ? { ...prev, role: newRole.charAt(0).toUpperCase() + newRole.slice(1) } : null));
      setActionSuccess(`User role updated to ${newRole}.`);
      setTimeout(() => setActionSuccess(''), 3000);
    } catch {
      setActionError('Failed to update user role.');
    } finally {
      setUpdating(false);
    }
  };

  if (loading) {
    return (
      <div className="flex-1 p-6 flex flex-col items-center justify-center min-h-[400px]">
        <div className="w-7 h-7 border-2 border-[#2563EB] border-t-transparent rounded-full animate-spin mb-3"></div>
        <p className="text-xs text-[#94A3B8]">Loading user profile from live database...</p>
      </div>
    );
  }

  if (error || !user) {
    return (
      <div className="flex-1 p-6">
        <div className="mb-4">
          <Link
            href="/business-users"
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#475569] hover:text-[#2563EB]"
          >
            ← Back to Business Users
          </Link>
        </div>
        <div className="bg-white border border-[#E2E8F0] rounded-xl p-8 text-center max-w-md mx-auto">
          <div className="text-red-500 font-bold text-sm mb-1">User Not Found</div>
          <p className="text-xs text-[#64748B] mb-4">
            {error || 'The requested business user could not be located in the database.'}
          </p>
          <Link
            href="/business-users"
            className="px-4 py-2 bg-[#2563EB] text-white rounded-lg text-xs font-semibold"
          >
            Return to Users Directory
          </Link>
        </div>
      </div>
    );
  }

  const initials = user.name
    .split(' ')
    .map((n) => n[0])
    .join('')
    .substring(0, 2)
    .toUpperCase();

  return (
    <div className="flex-1 overflow-y-auto scrollbar-hide p-4 sm:p-5 lg:p-6 w-full animate-in fade-in duration-500">
      {/* Breadcrumb */}
      <div className="mb-3">
        <Link
          href="/business-users"
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#475569] hover:text-[#2563EB] transition-colors"
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <line x1="19" y1="12" x2="5" y2="12"></line>
            <polyline points="12 19 5 12 12 5"></polyline>
          </svg>
          Back to Business Users
        </Link>
      </div>

      {/* Notifications */}
      {actionSuccess && (
        <div className="mb-3 p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-lg text-xs font-medium flex items-center justify-between">
          <span>{actionSuccess}</span>
          <button onClick={() => setActionSuccess('')}>✕</button>
        </div>
      )}
      {actionError && (
        <div className="mb-3 p-3 bg-rose-50 border border-rose-200 text-rose-800 rounded-lg text-xs font-medium flex items-center justify-between">
          <span>{actionError}</span>
          <button onClick={() => setActionError('')}>✕</button>
        </div>
      )}

      {/* Profile Header Card */}
      <div className="bg-white border border-[#E2E8F0] rounded-xl p-4 shadow-2xs mb-4">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="flex items-center gap-3.5">
            <div className="w-12 h-12 rounded-xl bg-blue-600 text-white font-bold text-sm flex items-center justify-center shrink-0 shadow-xs">
              {initials}
            </div>
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <h1 className="text-xl font-bold text-[#0F172A] tracking-tight">
                  {user.name}
                </h1>
                <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-semibold bg-[#EFF6FF] text-[#2563EB] border border-blue-100">
                  {user.role}
                </span>
                <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold ${
                  user.is_active
                    ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                    : 'bg-rose-50 text-rose-700 border border-rose-200'
                }`}>
                  <span className={`w-1.5 h-1.5 rounded-full ${user.is_active ? 'bg-emerald-500' : 'bg-rose-500'}`}></span>
                  {user.status}
                </span>
              </div>

              <div className="flex flex-wrap items-center gap-y-1 gap-x-4 text-xs text-[#475569] mt-1.5">
                <span className="flex items-center gap-1.5">
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-[#94A3B8]">
                    <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"></path>
                    <polyline points="22,6 12,13 2,6"></polyline>
                  </svg>
                  {user.email}
                </span>
                <span className="text-[#94A3B8]">
                  Created {user.createdAt || 'N/A'}
                </span>
                <span className="text-[#94A3B8]">
                  Last active: {user.lastActive}
                </span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <select
              value={user.role.toLowerCase()}
              disabled={updating}
              onChange={(e) => handleChangeRole(e.target.value)}
              className="px-2.5 py-1.5 bg-[#F8FAFC] border border-[#E2E8F0] rounded-lg text-xs font-semibold text-[#475569] hover:bg-gray-100 focus:outline-none"
            >
              <option value="owner">Role: Owner</option>
              <option value="admin">Role: Admin</option>
              <option value="manager">Role: Manager</option>
              <option value="doctor">Role: Doctor</option>
              <option value="receptionist">Role: Receptionist</option>
              <option value="staff">Role: Staff</option>
            </select>

            <button
              onClick={handleToggleStatus}
              disabled={updating}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold border transition-colors ${
                user.is_active
                  ? 'border-rose-200 text-rose-600 bg-rose-50 hover:bg-rose-100'
                  : 'border-emerald-200 text-emerald-700 bg-emerald-50 hover:bg-emerald-100'
              }`}
            >
              {updating ? 'Updating...' : user.is_active ? 'Suspend User' : 'Reactivate User'}
            </button>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-2 border-b border-[#E2E8F0] mb-4">
        <button
          onClick={() => setActiveTab('businesses')}
          className={`px-3.5 py-2 text-xs font-bold border-b-2 transition-colors ${
            activeTab === 'businesses'
              ? 'border-[#2563EB] text-[#2563EB]'
              : 'border-transparent text-[#64748B] hover:text-[#0F172A]'
          }`}
        >
          Associated Clinics ({user.associatedBusinesses?.length || 0})
        </button>
        <button
          onClick={() => setActiveTab('activity')}
          className={`px-3.5 py-2 text-xs font-bold border-b-2 transition-colors ${
            activeTab === 'activity'
              ? 'border-[#2563EB] text-[#2563EB]'
              : 'border-transparent text-[#64748B] hover:text-[#0F172A]'
          }`}
        >
          Activity Trail ({user.activityLogs?.length || 0})
        </button>
        <button
          onClick={() => setActiveTab('permissions')}
          className={`px-3.5 py-2 text-xs font-bold border-b-2 transition-colors ${
            activeTab === 'permissions'
              ? 'border-[#2563EB] text-[#2563EB]'
              : 'border-transparent text-[#64748B] hover:text-[#0F172A]'
          }`}
        >
          Security & Access
        </button>
      </div>

      {/* Tab 1: Associated Clinics */}
      {activeTab === 'businesses' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {user.associatedBusinesses && user.associatedBusinesses.length > 0 ? (
            user.associatedBusinesses.map((b) => (
              <div key={b.id} className="bg-white border border-[#E2E8F0] rounded-xl p-4 shadow-2xs hover:shadow-xs transition-shadow">
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <Link
                      href={`/businesses/${b.id}`}
                      className="text-sm font-bold text-[#0F172A] hover:text-[#2563EB] transition-colors flex items-center gap-1.5"
                    >
                      {b.name}
                      <span className="text-xs text-[#94A3B8]">↗</span>
                    </Link>
                    <p className="text-xs text-[#64748B] mt-0.5">{b.type} · {b.country}</p>
                  </div>
                  <span className="px-2 py-0.5 rounded text-[11px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                    {b.status}
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-2 text-xs bg-[#F8FAFC] p-3 rounded-lg border border-[#E2E8F0] mb-3">
                  <div>
                    <span className="text-[#94A3B8] block text-[10px] uppercase font-bold">Assigned Receptionist</span>
                    <span className="font-semibold text-[#0F172A]">{b.aiReceptionist}</span>
                  </div>
                  <div>
                    <span className="text-[#94A3B8] block text-[10px] uppercase font-bold">Subscription Plan</span>
                    <span className="font-semibold text-[#2563EB]">{b.plan}</span>
                  </div>
                </div>

                <div className="flex items-center justify-between text-xs text-[#64748B]">
                  <span>Calls Today: <strong className="text-[#0F172A]">{b.callsToday}</strong></span>
                  <span>Appointments Today: <strong className="text-[#0F172A]">{b.appointmentsToday}</strong></span>
                </div>
              </div>
            ))
          ) : (
            <div className="col-span-2 bg-white border border-[#E2E8F0] rounded-xl p-8 text-center text-xs text-[#94A3B8]">
              No linked business assigned yet.
            </div>
          )}
        </div>
      )}

      {/* Tab 2: Activity Logs */}
      {activeTab === 'activity' && (
        <div className="bg-white border border-[#E2E8F0] rounded-xl shadow-2xs overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-[#F8FAFC] border-b border-[#E2E8F0] text-[10px] font-bold text-[#475569] uppercase tracking-wider">
                  <th className="px-4 py-2.5">Event Action</th>
                  <th className="px-4 py-2.5">Target</th>
                  <th className="px-4 py-2.5">Outcome</th>
                  <th className="px-4 py-2.5">Origin IP / Host</th>
                  <th className="px-4 py-2.5 text-right">Timestamp</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#E2E8F0]">
                {user.activityLogs && user.activityLogs.length > 0 ? (
                  user.activityLogs.map((log) => (
                    <tr key={log.id} className="hover:bg-[#F8FAFC]/80 transition-colors">
                      <td className="px-4 py-2.5 font-semibold text-[#0F172A]">{log.action}</td>
                      <td className="px-4 py-2.5 text-[#475569]">{log.target}</td>
                      <td className="px-4 py-2.5">
                        <span className={`inline-flex px-1.5 py-0.5 rounded text-[10px] font-bold ${
                          log.outcome === 'success' ? 'bg-emerald-50 text-emerald-700' : 'bg-rose-50 text-rose-700'
                        }`}>
                          {log.outcome}
                        </span>
                      </td>
                      <td className="px-4 py-2.5 text-[#64748B] font-mono text-[11px]">{log.ip}</td>
                      <td className="px-4 py-2.5 text-right text-[#94A3B8]">{log.time}</td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={5} className="px-4 py-8 text-center text-[#94A3B8]">
                      No audit events recorded for this user yet.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Tab 3: Security & Permissions */}
      {activeTab === 'permissions' && (
        <div className="bg-white border border-[#E2E8F0] rounded-xl p-5 shadow-2xs space-y-4 max-w-2xl">
          <div>
            <h3 className="text-sm font-bold text-[#0F172A] mb-1">Account Permissions & Scope</h3>
            <p className="text-xs text-[#64748B]">
              Tenant users have isolated access restricted strictly to their assigned clinic ({user.associatedBusinesses?.[0]?.name || 'Unassigned'}).
            </p>
          </div>

          <div className="border border-[#E2E8F0] rounded-lg p-3 space-y-2 text-xs">
            <div className="flex justify-between py-1 border-b border-[#E2E8F0]">
              <span className="text-[#94A3B8]">Database User ID</span>
              <span className="font-mono text-[#0F172A] font-semibold">{user.id}</span>
            </div>
            <div className="flex justify-between py-1 border-b border-[#E2E8F0]">
              <span className="text-[#94A3B8]">Security Scope</span>
              <span className="font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-100">
                business (Tenant Isolated)
              </span>
            </div>
            <div className="flex justify-between py-1 border-b border-[#E2E8F0]">
              <span className="text-[#94A3B8]">Email Verification</span>
              <span className={`font-semibold ${user.emailVerified ? 'text-emerald-600' : 'text-amber-600'}`}>
                {user.emailVerified ? 'Verified' : 'Pending Verification'}
              </span>
            </div>
            <div className="flex justify-between py-1">
              <span className="text-[#94A3B8]">Assigned Role</span>
              <span className="font-semibold text-[#0F172A]">{user.role}</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
