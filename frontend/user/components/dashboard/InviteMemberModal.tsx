"use client";
import React, { useState } from 'react';
import { STRINGS } from '../../utils/strings/en';
import { DashboardController } from '../../controllers/dashboard.controller';

interface InviteMemberModalProps {
  isOpen: boolean;
  onClose: () => void;
  onMemberInvited?: () => void;
}

export function InviteMemberModal({ isOpen, onClose, onMemberInvited }: InviteMemberModalProps) {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [role, setRole] = useState('receptionist');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [invited, setInvited] = useState<{ name: string; email: string; url: string } | null>(null);
  const [copied, setCopied] = useState(false);

  if (!isOpen) return null;

  const close = () => {
    setInvited(null);
    setCopied(false);
    onClose();
  };

  const copyLink = async () => {
    if (!invited) return;
    try {
      await navigator.clipboard.writeText(invited.url);
      setCopied(true);
    } catch {
      setCopied(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim() || !name.trim()) {
      setError('Please provide both name and email.');
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      const res = await DashboardController.inviteTeamMember({
        name: name.trim(),
        email: email.trim().toLowerCase(),
        role: role.toLowerCase(),
      });
      setInvited({ name: name.trim(), email: email.trim().toLowerCase(), url: res?.invite_url || '' });
      setName('');
      setEmail('');
      setRole('receptionist');
      onMemberInvited?.();
    } catch (err: any) {
      setError(err?.message || 'Failed to send invitation. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-black/30 backdrop-blur-sm"
        onClick={close}
      />

      {/* Modal */}
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-[480px] relative z-10 p-6 sm:p-7 animate-in fade-in zoom-in-95 duration-200">
        {invited ? (
          <div data-testid="invite-sent">
            <h2 className="text-lg font-extrabold text-gray-900 tracking-tight mb-1">Invitation sent</h2>
            <p className="text-xs text-gray-500 mb-4">
              We emailed {invited.name} at <span className="font-semibold text-gray-700">{invited.email}</span> a link to choose a password. You
              can also share the link yourself; it works once and expires in 7 days.
            </p>
            {invited.url && (
              <div className="flex items-center gap-2 mb-5">
                <input
                  readOnly
                  value={invited.url}
                  aria-label="Invite link"
                  onFocus={(e) => e.currentTarget.select()}
                  className="flex-1 min-w-0 border border-gray-200 rounded-lg py-2 px-3 text-[11px] font-mono text-gray-700 bg-gray-50"
                />
                <button
                  type="button"
                  onClick={copyLink}
                  className="px-3 py-2 bg-white border border-gray-200 text-gray-800 rounded-lg text-xs font-bold hover:bg-gray-50 transition-colors shrink-0"
                >
                  {copied ? 'Copied' : 'Copy link'}
                </button>
              </div>
            )}
            <div className="flex justify-end">
              <button type="button" onClick={close} className="px-4 py-2 bg-[#0066FF] text-white rounded-lg text-xs font-bold hover:bg-[#0052cc] shadow-xs transition-colors">
                Done
              </button>
            </div>
          </div>
        ) : (
        <>
        <h2 className="text-lg font-extrabold text-gray-900 tracking-tight mb-1">Invite Team Member</h2>
        <p className="text-xs text-gray-500 mb-5">
          Send an invitation link to join your {STRINGS.APP.NAME} receptionist workspace.
        </p>

        {error && (
          <div className="mb-4 p-2.5 rounded-lg bg-red-50 border border-red-200 text-xs font-semibold text-red-700">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Full Name */}
          <div>
            <label className="block text-xs font-bold text-gray-800 mb-1.5">Full Name</label>
            <input 
              type="text" 
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Dr. Priya Sharma" 
              className="w-full border border-gray-200 rounded-lg py-2 px-3 text-xs font-medium text-gray-900 focus:outline-none focus:border-[#0066FF] focus:ring-1 focus:ring-[#0066FF] placeholder:text-gray-400"
            />
          </div>

          {/* Email */}
          <div>
            <label className="block text-xs font-bold text-gray-800 mb-1.5">Email Address</label>
            <input 
              type="email" 
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="e.g. priya@clinic.com" 
              className="w-full border border-gray-200 rounded-lg py-2 px-3 text-xs font-medium text-gray-900 focus:outline-none focus:border-[#0066FF] focus:ring-1 focus:ring-[#0066FF] placeholder:text-gray-400"
            />
          </div>

          {/* Role */}
          <div>
            <label className="block text-xs font-bold text-gray-800 mb-1.5">Select Role</label>
            <div className="relative">
              <select 
                value={role}
                onChange={(e) => setRole(e.target.value)}
                className="w-full border border-gray-200 rounded-lg py-2 px-3 text-xs font-medium text-gray-900 focus:outline-none focus:border-[#0066FF] focus:ring-1 focus:ring-[#0066FF] appearance-none bg-white cursor-pointer"
              >
                <option value="receptionist">Receptionist / Front Desk</option>
                <option value="doctor">Doctor / Specialist</option>
                <option value="admin">Administrator</option>
                <option value="manager">Practice Manager</option>
              </select>
              <div className="absolute inset-y-0 right-3 flex items-center pointer-events-none text-gray-500">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="6 9 12 15 18 9" />
                </svg>
              </div>
            </div>
          </div>

          {/* Actions */}
          <div className="pt-3 flex items-center justify-end gap-2.5">
            <button 
              type="button" 
              onClick={close}
              className="px-4 py-2 bg-white border border-gray-200 text-gray-700 rounded-lg text-xs font-bold hover:bg-gray-50 transition-colors"
            >
              Cancel
            </button>
            <button 
              type="submit" 
              disabled={submitting}
              className="px-4 py-2 bg-[#0066FF] text-white rounded-lg text-xs font-bold hover:bg-[#0052cc] shadow-xs transition-colors disabled:opacity-60 cursor-pointer"
            >
              {submitting ? 'Sending...' : 'Send Invitation'}
            </button>
          </div>
        </form>
        </>
        )}
      </div>
    </div>
  );
}
