"use client";
import React, { useState } from 'react';
import { STRINGS } from '../../../utils/strings/en';
import { AuthController } from '../../../controllers/auth.controller';

const MIN_LENGTH = 8; // same rule as the server
const INPUT =
  'w-full border border-gray-200 rounded-md py-1.5 px-2.5 text-xs text-gray-900 focus:outline-none focus:border-[#0066FF] focus:ring-1 focus:ring-[#0066FF]';

export function SecuritySettings() {
  const content = STRINGS.DASHBOARD.SETTINGS.SECURITY;
  const [current, setCurrent] = useState('');
  const [next, setNext] = useState('');
  const [confirm, setConfirm] = useState('');
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ kind: 'ok' | 'error'; text: string } | null>(null);
  const [confirmLogoutAll, setConfirmLogoutAll] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);
  const [logoutMessage, setLogoutMessage] = useState<{ kind: 'ok' | 'error'; text: string } | null>(null);

  const handleLogoutAll = async () => {
    setLoggingOut(true);
    setLogoutMessage(null);
    try {
      await AuthController.logoutAll();
      setConfirmLogoutAll(false);
      setLogoutMessage({ kind: 'ok', text: 'Signed out everywhere else. This device is still signed in.' });
    } catch (err: any) {
      setLogoutMessage({ kind: 'error', text: err?.message || 'Could not sign out other sessions.' });
    } finally {
      setLoggingOut(false);
    }
  };

  const handleUpdate = async () => {
    setMessage(null);
    if (!current) return setMessage({ kind: 'error', text: 'Enter your current password.' });
    if (next.length < MIN_LENGTH) return setMessage({ kind: 'error', text: `The new password needs at least ${MIN_LENGTH} characters.` });
    if (next !== confirm) return setMessage({ kind: 'error', text: 'The two new passwords do not match.' });
    setSaving(true);
    try {
      await AuthController.changePassword(current, next);
      setCurrent('');
      setNext('');
      setConfirm('');
      setMessage({ kind: 'ok', text: 'Password updated. Other devices have been signed out.' });
    } catch (err: any) {
      setMessage({ kind: 'error', text: err?.message || 'Could not update the password.' });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-3 max-w-4xl pb-6">
      <div className="bg-white border border-gray-100 rounded-xl p-4 shadow-[0_1px_4px_rgba(0,0,0,0.03)]">
        <h3 className="text-sm font-bold text-gray-900 tracking-tight mb-0.5">{content.CHANGE_PASSWORD.TITLE}</h3>
        <p className="text-xs text-gray-500 mb-3">{content.CHANGE_PASSWORD.DESCRIPTION}</p>

        <div className="space-y-2.5 max-w-md">
          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-1">{content.CHANGE_PASSWORD.CURRENT}</label>
            <input type="password" value={current} onChange={(e) => setCurrent(e.target.value)} autoComplete="current-password" placeholder="••••••••" className={INPUT} />
          </div>
          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-1">{content.CHANGE_PASSWORD.NEW}</label>
            <input type="password" value={next} onChange={(e) => setNext(e.target.value)} autoComplete="new-password" placeholder="••••••••" className={INPUT} />
          </div>
          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-1">{content.CHANGE_PASSWORD.CONFIRM}</label>
            <input type="password" value={confirm} onChange={(e) => setConfirm(e.target.value)} autoComplete="new-password" placeholder="••••••••" className={INPUT} />
          </div>
          {message && (
            <p className={`text-xs font-medium ${message.kind === 'ok' ? 'text-emerald-600' : 'text-red-600'}`}>{message.text}</p>
          )}
          <button
            onClick={handleUpdate}
            disabled={saving}
            className="px-3.5 py-1.5 bg-gray-900 text-white rounded-md text-xs font-semibold shadow-xs hover:bg-black disabled:opacity-60 transition-colors mt-1"
          >
            {saving ? 'Updating...' : content.CHANGE_PASSWORD.UPDATE}
          </button>
        </div>
      </div>

      <div className="bg-white border border-gray-100 rounded-xl p-4 shadow-[0_1px_4px_rgba(0,0,0,0.03)]">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h3 className="text-sm font-bold text-gray-900 tracking-tight mb-0.5">Sign out everywhere</h3>
            <p className="text-xs text-gray-500">
              Ends every other session of your account: other browsers, phones and anyone using your old login. Use it if a device was lost or
              you think someone else signed in.
            </p>
            {logoutMessage && (
              <p className={`text-xs font-medium mt-2 ${logoutMessage.kind === 'ok' ? 'text-emerald-600' : 'text-red-600'}`}>{logoutMessage.text}</p>
            )}
          </div>
          {confirmLogoutAll ? (
            <div className="flex items-center gap-1.5 shrink-0">
              <button
                onClick={handleLogoutAll}
                disabled={loggingOut}
                className="px-3 py-1.5 bg-red-600 hover:bg-red-700 text-white rounded-md text-xs font-semibold disabled:opacity-60 transition-colors"
              >
                {loggingOut ? 'Signing out...' : 'Confirm'}
              </button>
              <button
                onClick={() => setConfirmLogoutAll(false)}
                disabled={loggingOut}
                className="px-3 py-1.5 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-md text-xs font-semibold transition-colors"
              >
                Cancel
              </button>
            </div>
          ) : (
            <button
              onClick={() => setConfirmLogoutAll(true)}
              className="px-3.5 py-1.5 bg-white border border-gray-200 text-gray-900 rounded-md text-xs font-semibold hover:bg-gray-50 shrink-0 transition-colors"
            >
              Sign out everywhere
            </button>
          )}
        </div>
      </div>

      <div className="bg-white border border-gray-100 rounded-xl p-4 shadow-[0_1px_4px_rgba(0,0,0,0.03)]">
        <div className="flex items-start justify-between">
          <div>
            <h3 className="text-sm font-bold text-gray-900 tracking-tight mb-0.5">{content.TFA.TITLE}</h3>
            <p className="text-xs text-gray-500">{content.TFA.DESCRIPTION}</p>
          </div>
          {/* Two-factor sign-in is not built yet: say so instead of showing a button that does nothing. */}
          <button
            disabled
            title="Coming soon"
            className="px-3.5 py-1.5 bg-gray-50 border border-gray-200 text-gray-400 rounded-md text-xs font-semibold ml-4 shrink-0 cursor-not-allowed"
          >
            Coming soon
          </button>
        </div>
      </div>
    </div>
  );
}
