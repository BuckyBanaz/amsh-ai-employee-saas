"use client";
import React, { useEffect, useMemo, useState } from 'react';
import { createPortal } from 'react-dom';

type AdminRole = 'Super Admin' | 'Admin' | 'Support' | 'Finance' | 'Operations' | 'Developer';
type AdminStatus = 'Active' | 'Inactive';
type ResourceKey =
  | 'businesses'
  | 'users'
  | 'billing'
  | 'calls'
  | 'customers'
  | 'analytics'
  | 'system'
  | 'security';

interface ScopeFlags {
  read: boolean;
  write: boolean;
  full: boolean;
}

type RolePermissions = Record<ResourceKey, ScopeFlags>;

interface AdminUser {
  id: string;
  name: string;
  email: string;
  role: AdminRole;
  status: AdminStatus;
  lastActive: string;
  isCurrentUser?: boolean;
}

const ROLES: AdminRole[] = ['Super Admin', 'Admin', 'Support', 'Finance', 'Operations', 'Developer'];

const roleStyles: Record<AdminRole, string> = {
  'Super Admin': 'bg-[#FEE2E2] text-[#991B1B]',
  Admin: 'bg-[#DBEAFE] text-[#1E40AF]',
  Support: 'bg-[#D1FAE5] text-[#065F46]',
  Finance: 'bg-[#FEF3C7] text-[#92400E]',
  Operations: 'bg-[#EDE9FE] text-[#6D28D9]',
  Developer: 'bg-[#F1F5F9] text-[#334155]',
};

const statusStyles: Record<AdminStatus, string> = {
  Active: 'bg-[#D1FAE5] text-[#065F46]',
  Inactive: 'bg-[#FEE2E2] text-[#991B1B]',
};

const RESOURCES: { key: ResourceKey; label: string }[] = [
  { key: 'businesses', label: 'Businesses' },
  { key: 'users', label: 'Users' },
  { key: 'billing', label: 'Billing' },
  { key: 'calls', label: 'Calls' },
  { key: 'customers', label: 'Customers' },
  { key: 'analytics', label: 'Analytics' },
  { key: 'system', label: 'System' },
  { key: 'security', label: 'Security' },
];

const scopes: { key: keyof ScopeFlags; short: string; label: string }[] = [
  { key: 'read', short: 'R', label: 'Read' },
  { key: 'write', short: 'W', label: 'Write' },
  { key: 'full', short: 'F', label: 'Full' },
];

const flags = (read: boolean, write: boolean, full: boolean): ScopeFlags => ({ read, write, full });

const allOn = (): RolePermissions =>
  RESOURCES.reduce((acc, resource) => {
    acc[resource.key] = flags(true, true, true);
    return acc;
  }, {} as RolePermissions);

const seedPermissions: Record<AdminRole, RolePermissions> = {
  'Super Admin': allOn(),
  Admin: {
    businesses: flags(true, true, false),
    users: flags(true, true, false),
    billing: flags(true, false, false),
    calls: flags(true, true, true),
    customers: flags(true, true, false),
    analytics: flags(true, true, true),
    system: flags(true, false, false),
    security: flags(false, false, false),
  },
  Support: {
    businesses: flags(true, false, false),
    users: flags(true, false, false),
    billing: flags(false, false, false),
    calls: flags(true, true, false),
    customers: flags(true, true, false),
    analytics: flags(true, false, false),
    system: flags(false, false, false),
    security: flags(false, false, false),
  },
  Finance: {
    businesses: flags(true, false, false),
    users: flags(false, false, false),
    billing: flags(true, true, true),
    calls: flags(false, false, false),
    customers: flags(false, false, false),
    analytics: flags(true, true, false),
    system: flags(false, false, false),
    security: flags(false, false, false),
  },
  Operations: {
    businesses: flags(true, true, false),
    users: flags(true, false, false),
    billing: flags(false, false, false),
    calls: flags(true, true, true),
    customers: flags(true, true, false),
    analytics: flags(true, false, false),
    system: flags(true, true, false),
    security: flags(false, false, false),
  },
  Developer: {
    businesses: flags(true, false, false),
    users: flags(false, false, false),
    billing: flags(false, false, false),
    calls: flags(true, false, false),
    customers: flags(false, false, false),
    analytics: flags(true, false, false),
    system: flags(true, true, true),
    security: flags(true, false, false),
  },
};

const seedAdmins: AdminUser[] = [
  { id: 'adm-1', name: 'Parikshit Arora', email: 'parikshit@amsh.ai', role: 'Super Admin', status: 'Active', lastActive: 'Just now', isCurrentUser: true },
  { id: 'adm-2', name: 'Aria de Vries', email: 'aria@amsh.ai', role: 'Admin', status: 'Active', lastActive: '10 mins ago' },
  { id: 'adm-3', name: 'Lars Janssen', email: 'lars.j@amsh.ai', role: 'Support', status: 'Active', lastActive: '2 hours ago' },
  { id: 'adm-4', name: 'Sophie Dubois', email: 's.dubois@amsh.ai', role: 'Finance', status: 'Active', lastActive: 'Yesterday' },
  { id: 'adm-5', name: 'Dieter Weber', email: 'd.weber@amsh.ai', role: 'Operations', status: 'Inactive', lastActive: '3 days ago' },
  { id: 'adm-6', name: 'Jan de Jong', email: 'jan.dejong@amsh.ai', role: 'Developer', status: 'Active', lastActive: '5 mins ago' },
];

const inputClass =
  'w-full px-3 py-2 bg-[#F8FAFC] border border-[#E2E8F0] rounded-lg text-[13px] text-[#0F172A] placeholder-[#94A3B8] focus:outline-none focus:ring-2 focus:ring-[#2563EB]/20 focus:border-[#2563EB]';

const isValidEmail = (value: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);

function Toggle({
  checked,
  disabled,
  label,
  onChange,
}: {
  checked: boolean;
  disabled?: boolean;
  label: string;
  onChange: () => void;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      disabled={disabled}
      onClick={onChange}
      className={`relative w-9 h-5 rounded-full transition-colors flex-shrink-0 ${
        checked ? 'bg-[#2563EB]' : 'bg-[#CBD5E1]'
      } ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
    >
      <span
        className={`absolute top-0.5 w-4 h-4 rounded-full bg-white shadow transition-all ${
          checked ? 'left-[18px]' : 'left-0.5'
        }`}
      />
    </button>
  );
}

interface AdminFormProps {
  draft: AdminUser;
  isNew: boolean;
  error: string | null;
  onChange: (admin: AdminUser) => void;
  onSave: () => void;
  onClose: () => void;
}

function AdminForm({ draft, isNew, error, onChange, onSave, onClose }: AdminFormProps) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  if (typeof document === 'undefined') return null;

  return createPortal(
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onClick={onClose}>
      <div
        role="dialog"
        aria-modal="true"
        aria-label={isNew ? 'Add admin' : `Edit ${draft.name}`}
        onClick={(e) => e.stopPropagation()}
        className="bg-white w-full max-w-md rounded-xl shadow-xl border border-[#E2E8F0]"
      >
        <div className="p-5 border-b border-[#E2E8F0]">
          <h2 className="text-[16px] font-bold text-[#0F172A]">{isNew ? 'Add Admin' : `Edit ${draft.name}`}</h2>
          <p className="text-[12px] text-[#64748B] mt-0.5">Internal Amsh administrator account.</p>
        </div>

        <div className="p-5 space-y-4">
          {error && (
            <div className="rounded-lg border border-[#EF4444] bg-[#FEE2E2] px-3 py-2 text-[13px] font-semibold text-[#991B1B]">
              {error}
            </div>
          )}

          <label className="block">
            <span className="text-[12px] font-semibold text-[#475569]">Full Name</span>
            <input
              type="text"
              value={draft.name}
              onChange={(e) => onChange({ ...draft, name: e.target.value })}
              placeholder="e.g. Nina Bakker"
              className={`${inputClass} mt-1`}
            />
          </label>

          <label className="block">
            <span className="text-[12px] font-semibold text-[#475569]">Email</span>
            <input
              type="email"
              value={draft.email}
              onChange={(e) => onChange({ ...draft, email: e.target.value })}
              placeholder="name@amsh.ai"
              className={`${inputClass} mt-1`}
            />
          </label>

          <label className="block">
            <span className="text-[12px] font-semibold text-[#475569]">Role</span>
            <select
              value={draft.role}
              onChange={(e) => onChange({ ...draft, role: e.target.value as AdminRole })}
              className={`${inputClass} mt-1 cursor-pointer`}
            >
              {ROLES.map((role) => (
                <option key={role} value={role}>
                  {role}
                </option>
              ))}
            </select>
          </label>

          <label className="block">
            <span className="text-[12px] font-semibold text-[#475569]">Status</span>
            <select
              value={draft.status}
              onChange={(e) => onChange({ ...draft, status: e.target.value as AdminStatus })}
              disabled={draft.isCurrentUser}
              className={`${inputClass} mt-1 cursor-pointer disabled:bg-[#F1F5F9] disabled:text-[#94A3B8]`}
            >
              <option value="Active">Active</option>
              <option value="Inactive">Inactive</option>
            </select>
            {draft.isCurrentUser && (
              <span className="text-[11px] text-[#94A3B8] block mt-1">You cannot deactivate your own account.</span>
            )}
          </label>
        </div>

        <div className="flex items-center justify-end gap-2 p-5 border-t border-[#E2E8F0] bg-[#F8FAFC] rounded-b-xl">
          <button
            onClick={onClose}
            className="px-3.5 py-2 border border-[#E2E8F0] bg-white text-[#475569] rounded-lg text-[13px] font-semibold hover:bg-gray-50 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={onSave}
            className="px-3.5 py-2 bg-[#2563EB] hover:bg-blue-700 text-white rounded-lg text-[13px] font-semibold transition-colors"
          >
            {isNew ? 'Add Admin' : 'Save Changes'}
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}

export default function AdminUsersPage() {
  const [admins, setAdmins] = useState<AdminUser[]>(seedAdmins);
  const [permissions, setPermissions] = useState<Record<AdminRole, RolePermissions>>(seedPermissions);
  const [selectedId, setSelectedId] = useState('adm-1');
  const [draft, setDraft] = useState<AdminUser | null>(null);
  const [isNew, setIsNew] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const [dirty, setDirty] = useState(false);

  const selectedAdmin = useMemo(
    () => admins.find((admin) => admin.id === selectedId) ?? admins[0],
    [admins, selectedId]
  );
  const selectedRole = selectedAdmin?.role ?? 'Admin';
  const rolePermissions = permissions[selectedRole];
  const roleLocked = selectedRole === 'Super Admin';

  const flash = (message: string) => {
    setToast(message);
    window.setTimeout(() => setToast(null), 2600);
  };

  const toggleScope = (resource: ResourceKey, scope: keyof ScopeFlags) => {
    if (roleLocked) return;
    setPermissions((current) => ({
      ...current,
      [selectedRole]: {
        ...current[selectedRole],
        [resource]: { ...current[selectedRole][resource], [scope]: !current[selectedRole][resource][scope] },
      },
    }));
    setDirty(true);
  };

  const openAdd = () => {
    setDraft({ id: '', name: '', email: '', role: 'Support', status: 'Active', lastActive: 'Never' });
    setIsNew(true);
    setError(null);
  };

  const openEdit = (admin: AdminUser) => {
    setDraft({ ...admin });
    setIsNew(false);
    setError(null);
  };

  const saveAdmin = () => {
    if (!draft) return;
    const name = draft.name.trim();
    const email = draft.email.trim().toLowerCase();

    if (!name) {
      setError('Name is required.');
      return;
    }
    if (!isValidEmail(email)) {
      setError('Enter a valid email address.');
      return;
    }
    if (admins.some((admin) => admin.email.toLowerCase() === email && admin.id !== draft.id)) {
      setError('An admin with this email already exists.');
      return;
    }

    if (isNew) {
      setAdmins((current) => [...current, { ...draft, name, email, id: `adm-${Date.now()}` }]);
      flash(`${name} added`);
    } else {
      setAdmins((current) => current.map((admin) => (admin.id === draft.id ? { ...draft, name, email } : admin)));
      flash(`${name} updated`);
    }
    setDraft(null);
    setError(null);
  };

  const toggleStatus = (admin: AdminUser) => {
    if (admin.isCurrentUser) return;
    const next: AdminStatus = admin.status === 'Active' ? 'Inactive' : 'Active';
    setAdmins((current) => current.map((item) => (item.id === admin.id ? { ...item, status: next } : item)));
    flash(`${admin.name} ${next === 'Active' ? 'activated' : 'deactivated'}`);
  };

  return (
    <div className="flex-1 overflow-y-auto scrollbar-hide p-4 sm:p-5 animate-in fade-in duration-500">
      <header className="mb-4 pb-3 border-b border-[#E2E8F0] flex flex-wrap justify-between items-center gap-2.5">
        <div>
          <h1 className="text-lg font-bold text-[#0F172A] tracking-tight leading-tight">Admin Users</h1>
          <p className="text-xs text-[#475569] mt-0.5 font-normal">Manage internal Amsh administrators.</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={openAdd}
            className="flex items-center gap-1.5 px-2.5 py-1.5 bg-[#2563EB] hover:bg-blue-700 text-white rounded-lg text-xs font-semibold shadow-2xs transition-colors"
          >
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <line x1="12" y1="5" x2="12" y2="19"></line>
              <line x1="5" y1="12" x2="19" y2="12"></line>
            </svg>
            Add Admin
          </button>
          <button className="flex items-center gap-1.5 border border-[#E2E8F0] rounded-lg py-1.5 px-2.5 text-xs font-medium text-[#475569] bg-white shadow-2xs hover:bg-gray-50 transition-colors">
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect>
              <line x1="16" y1="2" x2="16" y2="6"></line>
              <line x1="8" y1="2" x2="8" y2="6"></line>
              <line x1="3" y1="10" x2="21" y2="10"></line>
            </svg>
            Jan 1 - Jan 30, 2026
          </button>
          <button className="flex items-center justify-center border border-[#E2E8F0] rounded-full w-7 h-7 text-[#475569] bg-white shadow-2xs hover:bg-gray-50 transition-colors">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"></path>
              <path d="M13.73 21a2 2 0 0 1-3.46 0"></path>
            </svg>
          </button>
        </div>
      </header>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-3.5">
        {/* Admin table */}
        <div className="xl:col-span-2 bg-white border border-[#E2E8F0] rounded-lg shadow-2xs overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-[#F8FAFC] border-b border-[#E2E8F0]">
                  <th className="px-3.5 py-2 text-[10px] font-bold text-[#475569] uppercase tracking-wider">Name</th>
                  <th className="px-3.5 py-2 text-[10px] font-bold text-[#475569] uppercase tracking-wider">Email</th>
                  <th className="px-3.5 py-2 text-[10px] font-bold text-[#475569] uppercase tracking-wider">Role</th>
                  <th className="px-3.5 py-2 text-[10px] font-bold text-[#475569] uppercase tracking-wider">Status</th>
                  <th className="px-3.5 py-2 text-[10px] font-bold text-[#475569] uppercase tracking-wider">Last Active</th>
                  <th className="px-3.5 py-2 text-[10px] font-bold text-[#475569] uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#E2E8F0]">
                {admins.map((admin) => (
                  <tr
                    key={admin.id}
                    onClick={() => setSelectedId(admin.id)}
                    className={`cursor-pointer transition-colors ${
                      admin.id === selectedId ? 'bg-[#EFF6FF]' : 'hover:bg-[#F8FAFC]/70'
                    }`}
                  >
                    <td className="px-3.5 py-2 text-xs font-bold text-[#0F172A]">
                      {admin.name}
                      {admin.isCurrentUser && <span className="text-[10px] font-medium text-[#94A3B8] ml-1.5">(you)</span>}
                    </td>
                    <td className="px-3.5 py-2 text-xs text-[#475569]">{admin.email}</td>
                    <td className="px-3.5 py-2 whitespace-nowrap">
                      <span className={`inline-flex px-1.5 py-0.5 rounded text-[10px] font-semibold ${roleStyles[admin.role]}`}>
                        {admin.role}
                      </span>
                    </td>
                    <td className="px-3.5 py-2 whitespace-nowrap">
                      <span className={`inline-flex px-1.5 py-0.5 rounded text-[10px] font-semibold ${statusStyles[admin.status]}`}>
                        {admin.status}
                      </span>
                    </td>
                    <td className="px-3.5 py-2 text-xs text-[#94A3B8] whitespace-nowrap">{admin.lastActive}</td>
                    <td className="px-3.5 py-2 whitespace-nowrap" onClick={(e) => e.stopPropagation()}>
                      <div className="flex items-center gap-2.5">
                        <button
                          onClick={() => openEdit(admin)}
                          className="text-xs font-semibold text-[#2563EB] hover:underline"
                        >
                          Edit
                        </button>
                        <button
                          onClick={() => toggleStatus(admin)}
                          disabled={admin.isCurrentUser}
                          title={admin.isCurrentUser ? 'You cannot deactivate your own account' : undefined}
                          className={`text-xs font-semibold ${
                            admin.isCurrentUser
                              ? 'text-[#CBD5E1] cursor-not-allowed'
                              : admin.status === 'Active'
                                ? 'text-[#EF4444] hover:underline'
                                : 'text-[#10B981] hover:underline'
                          }`}
                        >
                          {admin.status === 'Active' ? 'Deactivate' : 'Activate'}
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Role permissions */}
        <aside className="bg-white border border-[#E2E8F0] rounded-lg shadow-2xs p-3.5 h-fit">
          <h2 className="text-xs font-bold text-[#0F172A]">Role Permissions</h2>
          <p className="text-[11px] text-[#64748B] mt-0.5">Inspect and edit access scopes for selected role.</p>

          <div className="mt-2.5 mb-3 flex items-center gap-2">
            <span className={`inline-flex px-1.5 py-0.5 rounded text-[10px] font-semibold ${roleStyles[selectedRole]}`}>
              {selectedRole}
            </span>
            <span className="text-[10px] text-[#94A3B8]">via {selectedAdmin?.name}</span>
          </div>

          {roleLocked && (
            <div className="mb-3 rounded-lg border border-[#E2E8F0] bg-[#F8FAFC] px-2.5 py-1.5 text-[10px] text-[#475569]">
              Super Admin always has full access. Locked to prevent an accidental lockout.
            </div>
          )}

          <div className="space-y-2">
            {RESOURCES.map((resource) => (
              <div key={resource.key} className="flex items-center justify-between gap-2">
                <span className="text-xs font-medium text-[#475569]">{resource.label}</span>
                <div className="flex items-center gap-1.5">
                  {scopes.map((scope) => (
                    <div key={scope.key} className="flex items-center gap-1">
                      <span className="text-[9px] font-semibold text-[#94A3B8]">{scope.short}</span>
                      <Toggle
                        checked={rolePermissions[resource.key][scope.key]}
                        disabled={roleLocked}
                        label={`${scope.label} access for ${resource.label}`}
                        onChange={() => toggleScope(resource.key, scope.key)}
                      />
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>

          <button
            onClick={() => {
              setDirty(false);
              flash(`Permissions saved for ${selectedRole}`);
            }}
            disabled={roleLocked || !dirty}
            className="w-full mt-3.5 px-2.5 py-1.5 bg-[#2563EB] hover:bg-blue-700 text-white rounded-lg text-xs font-semibold transition-colors disabled:bg-[#CBD5E1] disabled:cursor-not-allowed"
          >
            {dirty ? 'Save Permissions' : 'Saved'}
          </button>
        </aside>
      </div>

      {draft && (
        <AdminForm
          draft={draft}
          isNew={isNew}
          error={error}
          onChange={setDraft}
          onSave={saveAdmin}
          onClose={() => {
            setDraft(null);
            setError(null);
          }}
        />
      )}

      {toast && (
        <div
          role="status"
          className="fixed bottom-6 right-6 z-40 bg-[#0F172A] text-white text-[13px] font-semibold px-4 py-2.5 rounded-lg shadow-lg"
        >
          {toast}
        </div>
      )}
    </div>
  );
}
