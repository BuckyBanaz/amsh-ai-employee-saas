"use client";
import React, { useState, useEffect, useMemo, useCallback } from 'react';
import Link from 'next/link';
import {
  fetchBusinessUsers,
  fetchTenants,
  updateBusinessUser,
  inviteBusinessUser,
  BusinessUserItem,
  BusinessUsersKpis,
  TenantItem,
} from '@/lib/api';

const ROLE_COLORS: Record<string, { bg: string; text: string; border: string }> = {
  Owner: { bg: 'bg-purple-50', text: 'text-purple-700', border: 'border-purple-200' },
  Admin: { bg: 'bg-blue-50', text: 'text-blue-700', border: 'border-blue-200' },
  Manager: { bg: 'bg-indigo-50', text: 'text-indigo-700', border: 'border-indigo-200' },
  Doctor: { bg: 'bg-emerald-50', text: 'text-emerald-700', border: 'border-emerald-200' },
  Receptionist: { bg: 'bg-amber-50', text: 'text-amber-700', border: 'border-amber-200' },
  Staff: { bg: 'bg-slate-50', text: 'text-slate-700', border: 'border-slate-200' },
};

const AVATAR_COLORS = [
  'bg-blue-600',
  'bg-emerald-600',
  'bg-purple-600',
  'bg-indigo-600',
  'bg-amber-600',
  'bg-teal-600',
  'bg-pink-600',
];

export default function BusinessUsersPage() {
  const [users, setUsers] = useState<BusinessUserItem[]>([]);
  const [kpis, setKpis] = useState<BusinessUsersKpis>({
    totalUsers: 0,
    activeUsers: 0,
    suspendedUsers: 0,
    ownersCount: 0,
    businessesCount: 0,
  });
  const [facets, setFacets] = useState<{
    businesses: string[];
    roles: string[];
    types: string[];
    statuses: string[];
  }>({
    businesses: ['All'],
    roles: ['All'],
    types: ['All'],
    statuses: ['All', 'Active', 'Suspended'],
  });

  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedBusiness, setSelectedBusiness] = useState<string>('All');
  const [selectedRole, setSelectedRole] = useState<string>('All');
  const [selectedStatus, setSelectedStatus] = useState<string>('All');
  const [selectedType, setSelectedType] = useState<string>('All');

  // Modals & Action States
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [availableBusinesses, setAvailableBusinesses] = useState<TenantItem[]>([]);
  const [inviteForm, setInviteForm] = useState({
    business_id: '',
    name: '',
    email: '',
    role: 'staff',
    password: '',
  });
  const [inviting, setInviting] = useState(false);
  const [actionSuccess, setActionSuccess] = useState('');
  const [actionError, setActionError] = useState('');
  const [updatingId, setUpdatingId] = useState<string | null>(null);

  // Load live data
  const loadData = useCallback(async () => {
    try {
      setLoadError('');
      const res = await fetchBusinessUsers({
        search: searchQuery,
        role: selectedRole !== 'All' ? selectedRole : undefined,
        status: selectedStatus !== 'All' ? selectedStatus : undefined,
      });
      setUsers(res.items || []);
      if (res.kpis) setKpis(res.kpis);
      if (res.facets) setFacets(res.facets);
    } catch {
      setLoadError('Failed to load business users from the live database.');
    } finally {
      setLoading(false);
    }
  }, [searchQuery, selectedRole, selectedStatus]);

  useEffect(() => {
    loadData();
    const interval = setInterval(loadData, 30000);
    return () => clearInterval(interval);
  }, [loadData]);

  // Load businesses for the invite dropdown
  useEffect(() => {
    fetchTenants({}).then((res) => {
      if (res.items) setAvailableBusinesses(res.items);
    }).catch(() => {});
  }, []);

  // Filter in memory for instantaneous type/business filter
  const filteredUsers = useMemo(() => {
    return users.filter((user) => {
      const matchesSearch =
        !searchQuery ||
        user.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        user.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
        user.business.toLowerCase().includes(searchQuery.toLowerCase()) ||
        user.role.toLowerCase().includes(searchQuery.toLowerCase());

      const matchesBusiness = selectedBusiness === 'All' || user.business === selectedBusiness;
      const matchesRole = selectedRole === 'All' || user.role.toLowerCase() === selectedRole.toLowerCase();
      const matchesStatus = selectedStatus === 'All' || user.status.toLowerCase() === selectedStatus.toLowerCase();
      const matchesType = selectedType === 'All' || user.businessType === selectedType;

      return matchesSearch && matchesBusiness && matchesRole && matchesStatus && matchesType;
    });
  }, [users, searchQuery, selectedBusiness, selectedRole, selectedStatus, selectedType]);

  const hasActiveFilters =
    selectedBusiness !== 'All' ||
    selectedRole !== 'All' ||
    selectedStatus !== 'All' ||
    selectedType !== 'All' ||
    searchQuery.trim().length > 0;

  const resetFilters = () => {
    setSelectedBusiness('All');
    setSelectedRole('All');
    setSelectedStatus('All');
    setSelectedType('All');
    setSearchQuery('');
  };

  // Status toggle handler
  const handleToggleStatus = async (user: BusinessUserItem) => {
    const newActive = user.status !== 'Active';
    setUpdatingId(user.id);
    setActionError('');
    try {
      await updateBusinessUser(user.id, { is_active: newActive });
      setUsers((prev) =>
        prev.map((u) =>
          u.id === user.id ? { ...u, status: newActive ? 'Active' : 'Suspended' } : u
        )
      );
      setKpis((prev) => ({
        ...prev,
        activeUsers: newActive ? prev.activeUsers + 1 : Math.max(0, prev.activeUsers - 1),
        suspendedUsers: newActive ? Math.max(0, prev.suspendedUsers - 1) : prev.suspendedUsers + 1,
      }));
      setActionSuccess(`User ${user.name} is now ${newActive ? 'Active' : 'Suspended'}.`);
      setTimeout(() => setActionSuccess(''), 3000);
    } catch {
      setActionError(`Failed to update status for ${user.name}.`);
    } finally {
      setUpdatingId(null);
    }
  };

  // Invite user submission
  const handleInviteSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inviteForm.business_id || !inviteForm.name || !inviteForm.email) {
      setActionError('Please fill in all required fields.');
      return;
    }
    setInviting(true);
    setActionError('');
    try {
      await inviteBusinessUser(inviteForm);
      setShowInviteModal(false);
      setInviteForm({
        business_id: '',
        name: '',
        email: '',
        role: 'staff',
        password: '',
      });
      setActionSuccess('User successfully provisioned and assigned to business!');
      setTimeout(() => setActionSuccess(''), 3500);
      loadData();
    } catch (err: unknown) {
      setActionError(err instanceof Error ? err.message : 'Failed to provision user.');
    } finally {
      setInviting(false);
    }
  };

  return (
    <div className="flex-1 overflow-y-auto scrollbar-hide p-4 sm:p-5 lg:p-6 w-full animate-in fade-in duration-500">
      {/* Header */}
      <header className="mb-4 pb-3 border-b border-[#E2E8F0] flex flex-wrap justify-between items-center gap-3">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-bold text-[#0F172A] tracking-tight leading-tight">
              Business Users
            </h1>
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
              Live Database
            </span>
          </div>
          <p className="text-xs text-[#475569] mt-0.5 font-normal">
            Real staff, clinic owners, and operators across all active platform tenants.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => loadData()}
            className="flex items-center gap-1.5 border border-[#E2E8F0] rounded-md py-1.5 px-3 text-xs font-semibold text-[#475569] bg-white shadow-2xs hover:bg-gray-50 transition-colors"
            title="Refresh from database"
          >
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className={loading ? 'animate-spin' : ''}>
              <path d="M21.5 2v6h-6M21.34 15.57a10 10 0 1 1-.57-8.38l5.67-5.67"/>
            </svg>
            Refresh
          </button>
          <button
            onClick={() => setShowInviteModal(true)}
            className="flex items-center gap-1.5 px-3.5 py-1.5 bg-[#2563EB] hover:bg-blue-700 text-white rounded-md text-xs font-semibold shadow-sm transition-all hover:shadow"
          >
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <line x1="12" y1="5" x2="12" y2="19"></line>
              <line x1="5" y1="12" x2="19" y2="12"></line>
            </svg>
            Provision User
          </button>
        </div>
      </header>

      {/* Notifications / Alerts */}
      {actionSuccess && (
        <div className="mb-4 p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-lg text-xs font-medium flex items-center justify-between animate-in fade-in duration-300">
          <div className="flex items-center gap-2">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="text-emerald-600">
              <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path>
              <polyline points="22 4 12 14.01 9 11.01"></polyline>
            </svg>
            <span>{actionSuccess}</span>
          </div>
          <button onClick={() => setActionSuccess('')} className="text-emerald-600 hover:text-emerald-900">✕</button>
        </div>
      )}
      {actionError && (
        <div className="mb-4 p-3 bg-rose-50 border border-rose-200 text-rose-800 rounded-lg text-xs font-medium flex items-center justify-between animate-in fade-in duration-300">
          <div className="flex items-center gap-2">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="text-rose-600">
              <circle cx="12" cy="12" r="10"></circle>
              <line x1="12" y1="8" x2="12" y2="12"></line>
              <line x1="12" y1="16" x2="12.01" y2="16"></line>
            </svg>
            <span>{actionError}</span>
          </div>
          <button onClick={() => setActionError('')} className="text-rose-600 hover:text-rose-900">✕</button>
        </div>
      )}

      {/* Top 4 KPI Metrics Bento Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-4">
        <div className="bg-white border border-[#E2E8F0] rounded-xl p-3.5 shadow-2xs hover:shadow-xs transition-shadow">
          <div className="flex items-center justify-between text-[11px] font-semibold text-[#94A3B8] uppercase tracking-wider mb-1">
            <span>Total Business Users</span>
            <span className="w-2 h-2 rounded-full bg-blue-500"></span>
          </div>
          <div className="flex items-baseline justify-between">
            <div className="text-2xl font-bold text-[#0F172A] leading-none">
              {kpis.totalUsers}
            </div>
            <span className="text-[11px] font-semibold text-[#2563EB] bg-blue-50 px-2 py-0.5 rounded-full border border-blue-100">
              {kpis.businessesCount} Clinics
            </span>
          </div>
        </div>

        <div className="bg-white border border-[#E2E8F0] rounded-xl p-3.5 shadow-2xs hover:shadow-xs transition-shadow">
          <div className="flex items-center justify-between text-[11px] font-semibold text-[#94A3B8] uppercase tracking-wider mb-1">
            <span>Active Accounts</span>
            <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
          </div>
          <div className="flex items-baseline justify-between">
            <div className="text-2xl font-bold text-[#0F172A] leading-none">
              {kpis.activeUsers}
            </div>
            <span className="text-[11px] font-semibold text-[#10B981] bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-100">
              {kpis.totalUsers ? Math.round((kpis.activeUsers / kpis.totalUsers) * 100) : 0}% Active
            </span>
          </div>
        </div>

        <div className="bg-white border border-[#E2E8F0] rounded-xl p-3.5 shadow-2xs hover:shadow-xs transition-shadow">
          <div className="flex items-center justify-between text-[11px] font-semibold text-[#94A3B8] uppercase tracking-wider mb-1">
            <span>Suspended / Inactive</span>
            <span className="w-2 h-2 rounded-full bg-rose-500"></span>
          </div>
          <div className="flex items-baseline justify-between">
            <div className="text-2xl font-bold text-[#0F172A] leading-none">
              {kpis.suspendedUsers}
            </div>
            <span className="text-[11px] font-semibold text-rose-600 bg-rose-50 px-2 py-0.5 rounded-full border border-rose-100">
              {kpis.suspendedUsers === 0 ? 'Optimal' : 'Needs Review'}
            </span>
          </div>
        </div>

        <div className="bg-white border border-[#E2E8F0] rounded-xl p-3.5 shadow-2xs hover:shadow-xs transition-shadow">
          <div className="flex items-center justify-between text-[11px] font-semibold text-[#94A3B8] uppercase tracking-wider mb-1">
            <span>Primary Clinic Owners</span>
            <span className="w-2 h-2 rounded-full bg-purple-500"></span>
          </div>
          <div className="flex items-baseline justify-between">
            <div className="text-2xl font-bold text-[#0F172A] leading-none">
              {kpis.ownersCount}
            </div>
            <span className="text-[11px] font-semibold text-purple-700 bg-purple-50 px-2 py-0.5 rounded-full border border-purple-100">
              Root Admins
            </span>
          </div>
        </div>
      </div>

      {/* Filter & Search Bar */}
      <div className="bg-white border border-[#E2E8F0] rounded-xl p-3 mb-4 shadow-2xs flex flex-wrap items-center justify-between gap-2.5">
        <div className="flex flex-wrap items-center gap-2.5 flex-1">
          {/* Search Box */}
          <div className="relative min-w-[220px] flex-1 max-w-sm">
            <span className="absolute inset-y-0 left-0 flex items-center pl-2.5 pointer-events-none text-[#94A3B8]">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="11" cy="11" r="8"></circle>
                <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
              </svg>
            </span>
            <input
              type="text"
              placeholder="Search by name, email, or clinic..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-8 pr-3 py-1.5 bg-[#F8FAFC] border border-[#E2E8F0] rounded-lg text-xs text-[#0F172A] placeholder-[#94A3B8] focus:outline-none focus:ring-2 focus:ring-[#2563EB]/20 focus:border-[#2563EB]"
            />
          </div>

          {/* Business Filter */}
          <select
            value={selectedBusiness}
            onChange={(e) => setSelectedBusiness(e.target.value)}
            className="px-2.5 py-1.5 bg-[#F8FAFC] border border-[#E2E8F0] rounded-lg text-xs font-semibold text-[#475569] hover:bg-gray-100/80 transition-colors focus:outline-none"
          >
            {facets.businesses.map((b) => (
              <option key={b} value={b}>
                {b === 'All' ? 'Clinic: All' : b}
              </option>
            ))}
          </select>

          {/* Role Filter */}
          <select
            value={selectedRole}
            onChange={(e) => setSelectedRole(e.target.value)}
            className="px-2.5 py-1.5 bg-[#F8FAFC] border border-[#E2E8F0] rounded-lg text-xs font-semibold text-[#475569] hover:bg-gray-100/80 transition-colors focus:outline-none"
          >
            {facets.roles.map((r) => (
              <option key={r} value={r}>
                {r === 'All' ? 'Role: All' : r}
              </option>
            ))}
          </select>

          {/* Status Filter */}
          <select
            value={selectedStatus}
            onChange={(e) => setSelectedStatus(e.target.value)}
            className="px-2.5 py-1.5 bg-[#F8FAFC] border border-[#E2E8F0] rounded-lg text-xs font-semibold text-[#475569] hover:bg-gray-100/80 transition-colors focus:outline-none"
          >
            {facets.statuses.map((s) => (
              <option key={s} value={s}>
                {s === 'All' ? 'Status: All' : s}
              </option>
            ))}
          </select>

          {/* Type Filter */}
          {facets.types.length > 2 && (
            <select
              value={selectedType}
              onChange={(e) => setSelectedType(e.target.value)}
              className="px-2.5 py-1.5 bg-[#F8FAFC] border border-[#E2E8F0] rounded-lg text-xs font-semibold text-[#475569] hover:bg-gray-100/80 transition-colors focus:outline-none"
            >
              {facets.types.map((t) => (
                <option key={t} value={t}>
                  {t === 'All' ? 'Type: All' : t}
                </option>
              ))}
            </select>
          )}

          {/* Reset Filters */}
          {hasActiveFilters && (
            <button
              onClick={resetFilters}
              className="text-xs font-semibold text-[#2563EB] hover:underline px-1 py-1"
            >
              Reset Filters
            </button>
          )}
        </div>

        <div className="text-xs font-medium text-[#94A3B8]">
          Showing <span className="font-bold text-[#0F172A]">{filteredUsers.length}</span> of {users.length} users
        </div>
      </div>

      {/* Users Table */}
      <div className="bg-white border border-[#E2E8F0] rounded-xl shadow-2xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-[#F8FAFC] border-b border-[#E2E8F0]">
                <th className="px-4 py-3 text-[10px] font-bold text-[#475569] uppercase tracking-wider min-w-[200px]">
                  User Name
                </th>
                <th className="px-4 py-3 text-[10px] font-bold text-[#475569] uppercase tracking-wider min-w-[200px]">
                  Email Address
                </th>
                <th className="px-4 py-3 text-[10px] font-bold text-[#475569] uppercase tracking-wider min-w-[180px]">
                  Assigned Clinic
                </th>
                <th className="px-4 py-3 text-[10px] font-bold text-[#475569] uppercase tracking-wider min-w-[110px]">
                  Role
                </th>
                <th className="px-4 py-3 text-[10px] font-bold text-[#475569] uppercase tracking-wider min-w-[100px]">
                  Status
                </th>
                <th className="px-4 py-3 text-[10px] font-bold text-[#475569] uppercase tracking-wider min-w-[120px]">
                  Last Active
                </th>
                <th className="px-4 py-3 text-[10px] font-bold text-[#475569] uppercase tracking-wider text-right min-w-[140px]">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#E2E8F0]">
              {loading && users.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-4 py-12 text-center text-xs text-[#94A3B8]">
                    <div className="flex flex-col items-center justify-center gap-2">
                      <div className="w-6 h-6 border-2 border-[#2563EB] border-t-transparent rounded-full animate-spin"></div>
                      <span>Loading real business users from database...</span>
                    </div>
                  </td>
                </tr>
              ) : filteredUsers.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-4 py-12 text-center text-xs text-[#94A3B8]">
                    <div className="flex flex-col items-center justify-center gap-2">
                      <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="text-gray-400">
                        <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path>
                        <circle cx="9" cy="7" r="4"></circle>
                        <path d="M23 21v-2a4 4 0 0 0-3-3.87"></path>
                        <path d="M16 3.13a4 4 0 0 1 0 7.75"></path>
                      </svg>
                      <span className="font-semibold text-gray-600">No business users found</span>
                      <span className="text-[11px] text-gray-400">
                        {hasActiveFilters ? 'Try adjusting your search or active filters.' : 'Provision a new business user to get started.'}
                      </span>
                    </div>
                  </td>
                </tr>
              ) : (
                filteredUsers.map((user, idx) => {
                  const roleStyle = ROLE_COLORS[user.role] || ROLE_COLORS.Staff;
                  const avatarBg = AVATAR_COLORS[idx % AVATAR_COLORS.length];
                  const isUpdating = updatingId === user.id;

                  return (
                    <tr key={user.id} className="hover:bg-[#F8FAFC]/80 transition-colors">
                      {/* Name with Avatar & Link */}
                      <td className="px-4 py-3 whitespace-nowrap">
                        <div className="flex items-center gap-2.5">
                          <div className={`w-7 h-7 rounded-full ${avatarBg} text-white font-bold flex items-center justify-center text-xs shadow-2xs`}>
                            {user.name.charAt(0).toUpperCase()}
                          </div>
                          <div>
                            <Link
                              href={`/business-users/${user.id}`}
                              className="text-xs font-bold text-[#0F172A] hover:text-[#2563EB] transition-colors"
                            >
                              {user.name}
                            </Link>
                            <div className="text-[10px] text-[#94A3B8] font-mono">
                              ID: {user.id.substring(0, 8)}...
                            </div>
                          </div>
                        </div>
                      </td>

                      {/* Email */}
                      <td className="px-4 py-3 text-xs text-[#475569] whitespace-nowrap">
                        <div className="flex items-center gap-1.5">
                          <span>{user.email}</span>
                          {user.emailVerified && (
                            <span title="Verified email" className="text-emerald-500">
                              <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor">
                                <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/>
                              </svg>
                            </span>
                          )}
                        </div>
                      </td>

                      {/* Business */}
                      <td className="px-4 py-3 whitespace-nowrap">
                        {user.businessId ? (
                          <Link
                            href={`/businesses/${user.businessId}`}
                            className="text-xs font-semibold text-[#0F172A] hover:text-[#2563EB] transition-colors flex items-center gap-1"
                          >
                            <span>{user.business}</span>
                            <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="text-[#94A3B8]">
                              <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"></path>
                              <polyline points="15 3 21 3 21 9"></polyline>
                              <line x1="10" y1="14" x2="21" y2="3"></line>
                            </svg>
                          </Link>
                        ) : (
                          <span className="text-xs text-[#94A3B8]">Unassigned</span>
                        )}
                        <div className="text-[10px] text-[#94A3B8]">
                          {user.businessType}
                        </div>
                      </td>

                      {/* Role Badge */}
                      <td className="px-4 py-3 whitespace-nowrap">
                        <span className={`inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-semibold border ${roleStyle.bg} ${roleStyle.text} ${roleStyle.border}`}>
                          {user.role}
                        </span>
                      </td>

                      {/* Status Pill */}
                      <td className="px-4 py-3 whitespace-nowrap">
                        <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold ${
                          user.status === 'Active'
                            ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                            : 'bg-rose-50 text-rose-700 border border-rose-200'
                        }`}>
                          <span className={`w-1.5 h-1.5 rounded-full ${user.status === 'Active' ? 'bg-emerald-500' : 'bg-rose-500'}`}></span>
                          {user.status}
                        </span>
                      </td>

                      {/* Last Active */}
                      <td className="px-4 py-3 text-xs text-[#64748B] whitespace-nowrap">
                        {user.lastActive}
                      </td>

                      {/* Row Actions */}
                      <td className="px-4 py-3 text-right whitespace-nowrap">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            onClick={() => handleToggleStatus(user)}
                            disabled={isUpdating}
                            className={`px-2.5 py-1 text-[11px] font-semibold rounded-md border transition-colors ${
                              user.status === 'Active'
                                ? 'border-[#E2E8F0] text-rose-600 hover:bg-rose-50 hover:border-rose-200'
                                : 'border-emerald-200 text-emerald-700 bg-emerald-50 hover:bg-emerald-100'
                            }`}
                            title={user.status === 'Active' ? 'Suspend user access' : 'Activate user access'}
                          >
                            {isUpdating ? '...' : user.status === 'Active' ? 'Suspend' : 'Activate'}
                          </button>
                          <Link
                            href={`/business-users/${user.id}`}
                            className="px-2.5 py-1 text-[11px] font-semibold rounded-md border border-[#E2E8F0] text-[#475569] hover:bg-gray-100 transition-colors"
                          >
                            View
                          </Link>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Invite/Provision User Modal */}
      {showInviteModal && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="bg-white border border-[#E2E8F0] rounded-2xl w-full max-w-md shadow-2xl p-6 animate-in zoom-in-95 duration-200">
            <div className="flex items-start justify-between mb-4">
              <div>
                <h3 className="text-lg font-bold text-[#0F172A] leading-tight">
                  Provision Business User
                </h3>
                <p className="text-xs text-[#64748B] mt-0.5">
                  Directly provision and assign a staff member to a tenant clinic.
                </p>
              </div>
              <button
                onClick={() => setShowInviteModal(false)}
                className="text-[#94A3B8] hover:text-[#0F172A] p-1 rounded-md"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleInviteSubmit} className="space-y-3.5">
              <div>
                <label className="block text-xs font-bold text-[#334155] mb-1">
                  Assign to Clinic / Business *
                </label>
                <select
                  required
                  value={inviteForm.business_id}
                  onChange={(e) => setInviteForm({ ...inviteForm, business_id: e.target.value })}
                  className="w-full px-3 py-2 bg-[#F8FAFC] border border-[#E2E8F0] rounded-lg text-xs font-semibold text-[#0F172A] focus:outline-none focus:ring-2 focus:ring-[#2563EB]/20 focus:border-[#2563EB]"
                >
                  <option value="">Select a clinic...</option>
                  {availableBusinesses.map((b) => (
                    <option key={b.id} value={b.id}>
                      {b.name} ({b.type})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-[#334155] mb-1">
                  Full Name *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Dr. Jane Doe"
                  value={inviteForm.name}
                  onChange={(e) => setInviteForm({ ...inviteForm, name: e.target.value })}
                  className="w-full px-3 py-2 bg-[#F8FAFC] border border-[#E2E8F0] rounded-lg text-xs text-[#0F172A] placeholder-[#94A3B8] focus:outline-none focus:ring-2 focus:ring-[#2563EB]/20 focus:border-[#2563EB]"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-[#334155] mb-1">
                  Email Address *
                </label>
                <input
                  type="email"
                  required
                  placeholder="jane.doe@clinic.com"
                  value={inviteForm.email}
                  onChange={(e) => setInviteForm({ ...inviteForm, email: e.target.value })}
                  className="w-full px-3 py-2 bg-[#F8FAFC] border border-[#E2E8F0] rounded-lg text-xs text-[#0F172A] placeholder-[#94A3B8] focus:outline-none focus:ring-2 focus:ring-[#2563EB]/20 focus:border-[#2563EB]"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-[#334155] mb-1">
                    Role *
                  </label>
                  <select
                    value={inviteForm.role}
                    onChange={(e) => setInviteForm({ ...inviteForm, role: e.target.value })}
                    className="w-full px-3 py-2 bg-[#F8FAFC] border border-[#E2E8F0] rounded-lg text-xs font-semibold text-[#0F172A] focus:outline-none focus:ring-2 focus:ring-[#2563EB]/20 focus:border-[#2563EB]"
                  >
                    <option value="owner">Owner</option>
                    <option value="admin">Admin</option>
                    <option value="manager">Manager</option>
                    <option value="doctor">Doctor</option>
                    <option value="receptionist">Receptionist</option>
                    <option value="staff">Staff</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-[#334155] mb-1">
                    Initial Password
                  </label>
                  <input
                    type="password"
                    placeholder="Defaults to Password123!"
                    value={inviteForm.password}
                    onChange={(e) => setInviteForm({ ...inviteForm, password: e.target.value })}
                    className="w-full px-3 py-2 bg-[#F8FAFC] border border-[#E2E8F0] rounded-lg text-xs text-[#0F172A] placeholder-[#94A3B8] focus:outline-none focus:ring-2 focus:ring-[#2563EB]/20 focus:border-[#2563EB]"
                  />
                </div>
              </div>

              <div className="pt-3 flex items-center justify-end gap-2 border-t border-[#E2E8F0]">
                <button
                  type="button"
                  onClick={() => setShowInviteModal(false)}
                  className="px-4 py-2 border border-[#E2E8F0] rounded-lg text-xs font-semibold text-[#475569] hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={inviting}
                  className="px-4 py-2 bg-[#2563EB] hover:bg-blue-700 text-white rounded-lg text-xs font-semibold shadow-sm disabled:opacity-50"
                >
                  {inviting ? 'Provisioning...' : 'Provision User'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
