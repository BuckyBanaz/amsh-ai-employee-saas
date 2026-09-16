"use client";

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';

interface StaffMember {
  id: string;
  name: string;
  role: 'Owner' | 'Doctor' | 'Receptionist' | 'Practice Manager';
  specialty: string;
  email: string;
  phone: string;
  is2FAEnabled: boolean;
  status: 'Active' | 'Locked' | 'Suspended';
  failedLogins: number;
  lastLogin: string;
  treatments: string[];
}

export default function BusinessDetailPage() {
  const params = useParams();
  const [activeTab, setActiveTab] = useState('Overview');

  // Modal States
  const [showContactModal, setShowContactModal] = useState(false);
  const [showEmergencyModal, setShowEmergencyModal] = useState(false);
  const [showDirectPasswordModal, setShowDirectPasswordModal] = useState(false);
  const [selectedStaffForAction, setSelectedStaffForAction] = useState<StaffMember | null>(null);
  const [showImpersonateModal, setShowImpersonateModal] = useState(false);
  const [notificationToast, setNotificationToast] = useState<string | null>(null);

  // Direct Password Reset Form State
  const [customPassword, setCustomPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPasswordText, setShowPasswordText] = useState(false);
  const [requireChangeOnLogin, setRequireChangeOnLogin] = useState(true);
  const [notifyUserViaEmail, setNotifyUserViaEmail] = useState(true);
  const [passwordError, setPasswordError] = useState('');

  // Business State
  const [isAiPaused, setIsAiPaused] = useState(false);
  const [isEmergencyForwardingActive, setIsEmergencyForwardingActive] = useState(false);
  const [businessStatus, setBusinessStatus] = useState<'Active' | 'Suspended'>('Active');
  const hasOpenModal = showContactModal || showEmergencyModal || showDirectPasswordModal || showImpersonateModal;

  useEffect(() => {
    if (!hasOpenModal) return;

    const previous = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    return () => {
      document.body.style.overflow = previous;
    };
  }, [hasOpenModal]);

  const showToast = (msg: string) => {
    setNotificationToast(msg);
    setTimeout(() => {
      setNotificationToast(null);
    }, 4500);
  };

  // Staff list (from Onboarding Staff step)
  const [staffList, setStaffList] = useState<StaffMember[]>([
    {
      id: 'usr-001',
      name: 'Dr. Sarah Wilson',
      role: 'Owner',
      specialty: 'Lead Dentist & Oral Surgery',
      email: 'sarah@smileclinic.com',
      phone: '+31 6 2345 6789',
      is2FAEnabled: true,
      status: 'Active',
      failedLogins: 0,
      lastLogin: 'Today, 09:14 AM',
      treatments: ['Dental Consultation', 'Teeth Whitening', 'Composite Filling']
    },
    {
      id: 'usr-002',
      name: 'Dr. John Miller',
      role: 'Doctor',
      specialty: 'Orthodontics & Restorative',
      email: 'john@smileclinic.com',
      phone: '+31 6 019 2831',
      is2FAEnabled: true,
      status: 'Active',
      failedLogins: 0,
      lastLogin: 'Yesterday, 04:30 PM',
      treatments: ['Dental Cleaning', 'Braces Check', 'Root Canal Therapy']
    },
    {
      id: 'usr-003',
      name: 'Dr. Emily Carter',
      role: 'Doctor',
      specialty: 'Cosmetic Dentistry',
      email: 'emily@smileclinic.com',
      phone: '+31 6 019 2832',
      is2FAEnabled: false,
      status: 'Locked',
      failedLogins: 5,
      lastLogin: '3 days ago',
      treatments: ['Teeth Whitening', 'Veneers Consultation']
    },
    {
      id: 'usr-004',
      name: 'Emma van Dijk',
      role: 'Receptionist',
      specialty: 'Front Desk & Patient Triage',
      email: 'emma@smiledental.com',
      phone: '+31 6 8822 4411',
      is2FAEnabled: true,
      status: 'Active',
      failedLogins: 1,
      lastLogin: 'Today, 08:30 AM',
      treatments: ['Appointment Scheduling', 'Patient Check-in']
    },
    {
      id: 'usr-005',
      name: 'Lucas Becker',
      role: 'Practice Manager',
      specialty: 'Billing & Compliance Administration',
      email: 'lucas@smiledental.com',
      phone: '+31 6 3311 7744',
      is2FAEnabled: true,
      status: 'Active',
      failedLogins: 0,
      lastLogin: 'Feb 1, 2026',
      treatments: ['Insurance Verification', 'Vendor Management']
    }
  ]);

  const tabs = [
    'Overview',
    'Users & Roles',
    'AI Receptionist',
    'Appointments',
    'Calls',
    'Customers',
    'Services',
    'Knowledge Base',
    'Integrations',
    'Usage',
    'Billing',
    'Activity'
  ];

  // Open Direct Password Reset Modal
  const openDirectPasswordModal = (user: StaffMember) => {
    setSelectedStaffForAction(user);
    setCustomPassword('');
    setConfirmPassword('');
    setPasswordError('');
    setShowDirectPasswordModal(true);
  };

  // Generate a high-entropy password for admin
  const handleGenerateStrongPassword = () => {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789!@#$%&*';
    let generated = '';
    for (let i = 0; i < 14; i++) {
      generated += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    setCustomPassword(generated);
    setConfirmPassword(generated);
    setPasswordError('');
  };

  // Submit Direct Password Change
  const handleSaveDirectPassword = (e: React.FormEvent) => {
    e.preventDefault();
    if (!customPassword || customPassword.length < 8) {
      setPasswordError('Password must be at least 8 characters long.');
      return;
    }
    if (customPassword !== confirmPassword) {
      setPasswordError('Passwords do not match.');
      return;
    }

    if (selectedStaffForAction) {
      // If user was locked, unlock them too
      setStaffList(prev => prev.map(u => u.id === selectedStaffForAction.id ? { ...u, status: 'Active', failedLogins: 0 } : u));
      showToast(`Password successfully changed for ${selectedStaffForAction.name} (${selectedStaffForAction.email})! New credentials are now active.`);
      setShowDirectPasswordModal(false);
      setCustomPassword('');
      setConfirmPassword('');
    }
  };

  const handleResetPasswordLink = (user: StaffMember) => {
    showToast(`Password reset link dispatched via Email and SMS to ${user.name} (${user.email})!`);
    setShowEmergencyModal(false);
  };

  const handleUnlockAccount = (userId: string) => {
    setStaffList(prev => prev.map(u => u.id === userId ? { ...u, status: 'Active', failedLogins: 0 } : u));
    showToast(`Account successfully unlocked! Failed login attempts reset to 0.`);
    setShowEmergencyModal(false);
  };

  const handleReset2FA = (user: StaffMember) => {
    setStaffList(prev => prev.map(u => u.id === user.id ? { ...u, is2FAEnabled: false } : u));
    showToast(`2FA disabled for ${user.name}. One-time emergency bypass token sent to verified phone.`);
    setShowEmergencyModal(false);
  };

  const handleRevokeSessions = (user: StaffMember) => {
    showToast(`All active sessions & refresh JWTs revoked for ${user.name}. Immediate re-login required.`);
    setShowEmergencyModal(false);
  };

  return (
    <div className={`flex-1 scrollbar-hide p-6 md:p-8 animate-in fade-in duration-300 bg-[#F8FAFC] ${hasOpenModal ? 'overflow-hidden' : 'overflow-y-auto'}`}>
      {/* Toast Notification */}
      {notificationToast && (
        <div className="fixed top-5 right-5 z-50 bg-[#0F172A] text-white text-[13px] font-medium px-4 py-3 rounded-xl shadow-2xl border border-gray-700 flex items-center gap-3 animate-in slide-in-from-top-3">
          <div className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
          <span>{notificationToast}</span>
          <button onClick={() => setNotificationToast(null)} className="text-gray-400 hover:text-white ml-2">✕</button>
        </div>
      )}

      {/* Top Banner */}
      <div className="mb-5 flex flex-wrap items-center justify-between gap-3 px-4 py-2.5 bg-[#EFF6FF] border border-[#BFDBFE] rounded-xl text-[#2563EB]">
        <div className="flex items-center gap-2">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"></path>
            <line x1="12" y1="8" x2="12" y2="12"></line>
            <line x1="12" y1="16" x2="12.01" y2="16"></line>
          </svg>
          <span className="text-[12px] font-bold uppercase tracking-wider">
            MANAGING SECURE PLATFORM TENANT: SMILE DENTAL CLINIC (ID: {params.id || 'b-1'})
          </span>
        </div>
        <div className="flex items-center gap-3 text-[12px]">
          <span className="text-blue-700 font-semibold">Onboarded: Jan 4, 2026</span>
          <span className="text-blue-300">|</span>
          <span className="text-emerald-700 font-bold bg-emerald-100/80 px-2 py-0.5 rounded">All Microservices Healthy</span>
        </div>
      </div>

      {/* Business Header & Primary Actions */}
      <div className="mb-6 flex flex-wrap items-start justify-between gap-4">
        <div>
          <div className="flex flex-wrap items-center gap-2.5">
            <h1 className="text-[26px] md:text-[28px] font-bold text-[#0F172A] tracking-tight">
              Smile Dental Clinic
            </h1>
            <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-md text-[12px] font-semibold ${
              businessStatus === 'Active' ? 'bg-[#D1FAE5] text-[#065F46]' : 'bg-red-100 text-red-800'
            }`}>
              ● {businessStatus}
            </span>
            <span className="inline-flex items-center px-2 py-0.5 rounded border border-[#E2E8F0] bg-white text-[11px] font-semibold text-[#475569]">
              Netherlands
            </span>
            <span className="inline-flex items-center px-2 py-0.5 rounded-md border border-[#BFDBFE] bg-[#EFF6FF] text-[11px] font-bold text-[#2563EB]">
              Dental Clinic
            </span>
            {isEmergencyForwardingActive && (
              <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-md bg-amber-100 text-amber-900 text-[11px] font-bold border border-amber-200">
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"></path>
                  <line x1="12" y1="9" x2="12" y2="13"></line>
                  <line x1="12" y1="17" x2="12.01" y2="17"></line>
                </svg>
                Emergency Call Forwarding Active
              </span>
            )}
          </div>
          <p className="text-[13px] text-[#475569] mt-1.5 font-normal flex flex-wrap items-center gap-3">
            <span>Owner: <strong className="text-[#0F172A]">Dr. Sarah Wilson</strong></span>
            <span className="text-gray-300">•</span>
            <span>Direct: <strong className="text-[#0F172A] font-mono">+31 6 2345 6789</strong></span>
            <span className="text-gray-300">•</span>
            <span>Clinic: <strong className="text-[#0F172A] font-mono">+31 20 894 3400</strong></span>
            <span className="text-gray-300">•</span>
            <span>Email: <strong className="text-[#0F172A]">sarah@smileclinic.com</strong></span>
          </p>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Direct Set Password */}
          <button
            onClick={() => openDirectPasswordModal(staffList[0])}
            className="px-3.5 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-[13px] font-bold shadow-sm transition-colors flex items-center gap-1.5"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect>
              <path d="M7 11V7a5 5 0 0 1 10 0v4"></path>
            </svg>
            Set New Password
          </button>

          {/* Contact Owner */}
          <button
            onClick={() => setShowContactModal(true)}
            className="px-3.5 py-2 bg-white border border-[#E2E8F0] rounded-lg text-[13px] font-semibold text-[#0F172A] hover:bg-gray-50 shadow-sm transition-colors flex items-center gap-1.5"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"></path>
            </svg>
            Contact Owner
          </button>

          {/* Emergency Operations */}
          <button
            onClick={() => {
              setSelectedStaffForAction(staffList[0]);
              setShowEmergencyModal(true);
            }}
            className="px-3.5 py-2 bg-amber-50 border border-amber-300 rounded-lg text-[13px] font-bold text-amber-900 hover:bg-amber-100 shadow-sm transition-colors flex items-center gap-1.5"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"></path>
              <line x1="12" y1="8" x2="12" y2="12"></line>
              <line x1="12" y1="16" x2="12.01" y2="16"></line>
            </svg>
            Emergency Access Tools
          </button>

          {/* Impersonate / Login as Tenant */}
          <button
            onClick={() => setShowImpersonateModal(true)}
            className="px-3.5 py-2 bg-white border border-[#CBD5E1] rounded-lg text-[13px] font-semibold text-[#334155] hover:bg-gray-50 shadow-sm transition-colors flex items-center gap-1.5"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4"></path>
              <polyline points="10 17 15 12 10 7"></polyline>
              <line x1="15" y1="12" x2="3" y2="12"></line>
            </svg>
            Login as Tenant
          </button>

          {/* Suspend / Resume Business */}
          <button
            onClick={() => {
              if (businessStatus === 'Active') {
                if (confirm('Are you sure you want to SUSPEND Smile Dental Clinic? All AI call handling and patient bookings will halt immediately.')) {
                  setBusinessStatus('Suspended');
                  showToast('Smile Dental Clinic has been suspended.');
                }
              } else {
                setBusinessStatus('Active');
                showToast('Smile Dental Clinic has been reinstated.');
              }
            }}
            className={`px-3.5 py-2 rounded-lg text-[13px] font-semibold shadow-sm transition-colors ${
              businessStatus === 'Active'
                ? 'bg-white border border-[#EF4444] text-[#EF4444] hover:bg-red-50'
                : 'bg-emerald-600 text-white hover:bg-emerald-700'
            }`}
          >
            {businessStatus === 'Active' ? 'Suspend Business' : 'Reactivate Business'}
          </button>
        </div>
      </div>

      {/* Tabs Navigation */}
      <div className="mb-6 border-b border-[#E2E8F0] overflow-x-auto scrollbar-hide">
        <div className="flex items-center gap-1.5 pb-2.5 min-w-max">
          {tabs.map((tab) => {
            const isActive = activeTab === tab;
            return (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`px-3.5 py-2 rounded-lg text-[13px] font-semibold transition-all relative ${
                  isActive
                    ? 'bg-[#2563EB] text-white shadow-sm'
                    : 'text-[#475569] hover:bg-gray-100/80 hover:text-[#0F172A]'
                }`}
              >
                {tab}
                {tab === 'Users & Roles' && (
                  <span className={`ml-1.5 px-1.5 py-0.2 rounded-full text-[10px] font-bold ${isActive ? 'bg-blue-400 text-white' : 'bg-gray-200 text-gray-700'}`}>
                    5
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* TAB CONTENT AREA */}

      {/* 1. OVERVIEW TAB */}
      {activeTab === 'Overview' && (
        <div className="space-y-5">
          {/* 4 Mini Stat Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-3.5">
            <div className="bg-white border border-[#E2E8F0] rounded-xl p-4 shadow-sm flex flex-col justify-between">
              <div className="text-[12px] font-semibold text-[#94A3B8] uppercase tracking-wider mb-2">Total Customers</div>
              <div className="flex items-end justify-between">
                <div className="text-[22px] font-bold text-[#0F172A] leading-none">2,847</div>
                <span className="text-[12px] font-semibold text-[#10B981]">+42 this week</span>
              </div>
            </div>

            <div className="bg-white border border-[#E2E8F0] rounded-xl p-4 shadow-sm flex flex-col justify-between">
              <div className="text-[12px] font-semibold text-[#94A3B8] uppercase tracking-wider mb-2">Calls Answered</div>
              <div className="flex items-end justify-between">
                <div className="text-[22px] font-bold text-[#0F172A] leading-none">3,892</div>
                <span className="text-[12px] font-semibold text-[#10B981]">+128 today</span>
              </div>
            </div>

            <div className="bg-white border border-[#E2E8F0] rounded-xl p-4 shadow-sm flex flex-col justify-between">
              <div className="text-[12px] font-semibold text-[#94A3B8] uppercase tracking-wider mb-2">Appointments Booked</div>
              <div className="flex items-end justify-between">
                <div className="text-[22px] font-bold text-[#0F172A] leading-none">1,284</div>
                <span className="text-[12px] font-semibold text-[#10B981]">+34 today</span>
              </div>
            </div>

            <div className="bg-white border border-[#E2E8F0] rounded-xl p-4 shadow-sm flex flex-col justify-between">
              <div className="text-[12px] font-semibold text-[#94A3B8] uppercase tracking-wider mb-2">AI Resolution Rate</div>
              <div className="flex items-end justify-between">
                <div className="text-[22px] font-bold text-[#0F172A] leading-none">84%</div>
                <span className="text-[12px] font-semibold text-[#10B981]">Target 85%</span>
              </div>
            </div>
          </div>

          {/* Detailed Onboarding & Profile Specifications */}
          <div className="bg-white border border-[#E2E8F0] rounded-xl p-6 shadow-sm">
            <div className="flex flex-wrap items-center justify-between pb-4 border-b border-gray-100 gap-3">
              <div>
                <h3 className="text-[16px] font-bold text-gray-900 flex items-center gap-2">
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#2563EB" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <rect x="4" y="2" width="16" height="20" rx="2" ry="2"></rect>
                    <path d="M9 22v-4h6v4"></path>
                    <path d="M8 6h.01"></path>
                    <path d="M16 6h.01"></path>
                    <path d="M12 6h.01"></path>
                    <path d="M12 10h.01"></path>
                    <path d="M12 14h.01"></path>
                    <path d="M16 10h.01"></path>
                    <path d="M16 14h.01"></path>
                    <path d="M8 10h.01"></path>
                    <path d="M8 14h.01"></path>
                  </svg>
                  <span>Onboarding Profile & Practice Specifications</span>
                  <span className="text-[11px] font-semibold bg-blue-50 text-blue-700 px-2 py-0.5 rounded border border-blue-200">
                    Verified Tenant
                  </span>
                </h3>
                <p className="text-[12px] text-gray-500 mt-0.5">
                  Complete metadata collected during practice onboarding (address, owner cell, public contact, operating schedule).
                </p>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => openDirectPasswordModal(staffList[0])}
                  className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-[12px] font-bold transition-colors flex items-center gap-1.5"
                >
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect>
                    <path d="M7 11V7a5 5 0 0 1 10 0v4"></path>
                  </svg>
                  Reset Owner Password
                </button>
                <button
                  onClick={() => setShowContactModal(true)}
                  className="px-3 py-1.5 bg-blue-50 hover:bg-blue-100 text-blue-700 rounded-lg text-[12px] font-bold transition-colors"
                >
                  View Contact Card
                </button>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 pt-5">
              {/* Practice Identity */}
              <div className="space-y-3">
                <span className="text-[11px] font-bold uppercase tracking-wider text-gray-400">Practice Identity</span>
                <div>
                  <div className="text-[11px] text-gray-400">Legal Business Name</div>
                  <div className="text-[13px] font-bold text-gray-900">Smile Dental Clinic B.V.</div>
                </div>
                <div>
                  <div className="text-[11px] text-gray-400">Vertical & Specialty</div>
                  <div className="text-[13px] font-semibold text-gray-900">Healthcare / Dental Clinic</div>
                </div>
                <div>
                  <div className="text-[11px] text-gray-400">Website</div>
                  <a href="https://www.smiledentalclinic.com" target="_blank" rel="noreferrer" className="text-[13px] font-semibold text-blue-600 hover:underline">
                    www.smiledentalclinic.com
                  </a>
                </div>
                <div>
                  <div className="text-[11px] text-gray-400">Timezone</div>
                  <div className="text-[13px] font-semibold text-gray-900">Europe/Amsterdam (CET / GMT+1)</div>
                </div>
              </div>

              {/* Physical Location */}
              <div className="space-y-3">
                <span className="text-[11px] font-bold uppercase tracking-wider text-gray-400">Physical Location</span>
                <div>
                  <div className="text-[11px] text-gray-400">Street Address</div>
                  <div className="text-[13px] font-bold text-gray-900">456 Medical Parkway, Suite 100</div>
                </div>
                <div>
                  <div className="text-[11px] text-gray-400">City & Postal Code</div>
                  <div className="text-[13px] font-semibold text-gray-900">Amsterdam, 1012 AB</div>
                </div>
                <div>
                  <div className="text-[11px] text-gray-400">Country & Region</div>
                  <div className="text-[13px] font-semibold text-gray-900">Netherlands (North Holland)</div>
                </div>
                <div>
                  <div className="text-[11px] text-gray-400">Parking & Accessibility</div>
                  <div className="text-[13px] font-semibold text-gray-900">Wheelchair Accessible, Dedicated Lot</div>
                </div>
              </div>

              {/* Owner Direct Contact */}
              <div className="space-y-3 bg-amber-50/50 p-4 rounded-xl border border-amber-200">
                <span className="text-[11px] font-bold uppercase tracking-wider text-amber-900 flex items-center justify-between">
                  <span>Owner Contact</span>
                  <span className="px-1.5 py-0.5 bg-amber-200/80 rounded text-[10px] font-mono">CONFIDENTIAL</span>
                </span>
                <div>
                  <div className="text-[11px] text-amber-800 font-medium">Practice Owner</div>
                  <div className="text-[14px] font-bold text-gray-900">Dr. Sarah Wilson, DDS</div>
                </div>
                <div>
                  <div className="text-[11px] text-amber-800 font-medium">Direct Cell / WhatsApp</div>
                  <div className="text-[13px] font-mono font-bold text-blue-700">+31 6 2345 6789</div>
                </div>
                <div>
                  <div className="text-[11px] text-amber-800 font-medium">Primary Personal Email</div>
                  <div className="text-[13px] font-mono text-gray-900">sarah@smileclinic.com</div>
                </div>
                <div>
                  <div className="text-[11px] text-amber-800 font-medium">Emergency Call Forwarding</div>
                  <div className="text-[12px] font-mono text-gray-700">+31 6 9988 1122 (Front Desk Cell)</div>
                </div>
              </div>

              {/* Public & Telephony Specs */}
              <div className="space-y-3">
                <span className="text-[11px] font-bold uppercase tracking-wider text-gray-400">Telephony & AI Routing</span>
                <div>
                  <div className="text-[11px] text-gray-400">Business Public Number</div>
                  <div className="text-[13px] font-mono font-bold text-gray-900">+31 20 894 3400</div>
                </div>
                <div>
                  <div className="text-[11px] text-gray-400">AI Receptionist Number (Twilio)</div>
                  <div className="text-[13px] font-mono font-bold text-gray-900">+31 20 808 1922</div>
                  <div className="text-[11px] text-gray-400 mt-0.5">MVP: business number call-forwards here. Future: business number moves directly to this number.</div>
                </div>
                <div>
                  <div className="text-[11px] text-gray-400">Reception General Email</div>
                  <div className="text-[13px] font-mono text-gray-900">reception@smiledental.com</div>
                </div>
                <div>
                  <div className="text-[11px] text-gray-400">Clinic Hours (Mon-Fri)</div>
                  <div className="text-[13px] font-semibold text-gray-900">09:00 - 13:00 & 14:00 - 18:00</div>
                </div>
                <div>
                  <div className="text-[11px] text-gray-400">Saturday Schedule</div>
                  <div className="text-[13px] font-semibold text-gray-900">09:00 - 13:00 (Sunday Closed)</div>
                </div>
              </div>
            </div>
          </div>

          {/* Main 2-Col Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
            {/* Left Col (2 Cols) */}
            <div className="lg:col-span-2 space-y-5">
              {/* AI Receptionist Status Card */}
              <div className="bg-white border border-[#E2E8F0] rounded-xl p-5 shadow-sm space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-[16px] font-bold text-[#0F172A]">AI Receptionist Status</h3>
                    <p className="text-[12px] text-gray-500">Autonomous voice call triage and appointment scheduler.</p>
                  </div>
                  <span className={`inline-flex items-center px-2.5 py-1 rounded-md text-[12px] font-semibold ${
                    isAiPaused ? 'bg-amber-100 text-amber-800' : 'bg-[#D1FAE5] text-[#065F46]'
                  }`}>
                    ● {isAiPaused ? 'Sarah is Paused' : 'Sarah is Active'}
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-1">
                  <div>
                    <div className="text-[11px] font-semibold text-[#94A3B8] uppercase tracking-wider mb-1">VOICE PROVIDER</div>
                    <div className="text-[13px] font-bold text-[#0F172A]">ElevenLabs - Sarah (Multilingual)</div>
                    <div className="text-[11px] text-gray-400 mt-0.5">Dutch & English Fluent</div>
                  </div>

                  <div>
                    <div className="text-[11px] font-semibold text-[#94A3B8] uppercase tracking-wider mb-1">LAST CONVERSATION</div>
                    <div className="text-[13px] font-bold text-[#0F172A]">2 min ago</div>
                    <div className="text-[11px] text-emerald-600 mt-0.5">Rescheduled Appointment (200 OK)</div>
                  </div>

                  <div>
                    <div className="text-[11px] font-semibold text-[#94A3B8] uppercase tracking-wider mb-1">LATENCY BENCHMARK</div>
                    <div className="text-[13px] font-mono font-bold text-emerald-600">485ms</div>
                    <div className="text-[11px] text-gray-400 mt-0.5">STT: 140ms | LLM: 195ms | TTS: 150ms</div>
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-2.5 pt-2">
                  <button
                    onClick={() => {
                      setIsAiPaused(!isAiPaused);
                      showToast(isAiPaused ? 'AI Receptionist resumed.' : 'AI Receptionist paused. Inbound calls will roll to fallback voicemail.');
                    }}
                    className="px-3.5 py-2 bg-white border border-[#E2E8F0] rounded-lg text-[12px] font-semibold text-[#0F172A] hover:bg-gray-50 transition-colors shadow-sm"
                  >
                    {isAiPaused ? 'Resume AI Agent' : 'Pause AI Agent'}
                  </button>

                  <button
                    onClick={() => {
                      setIsEmergencyForwardingActive(!isEmergencyForwardingActive);
                      showToast(
                        !isEmergencyForwardingActive
                          ? 'EMERGENCY: All calls now actively forwarded to Dr. Sarah Wilson (+31 6 2345 6789)!'
                          : 'Emergency forwarding disabled. Calls routed back to AI Receptionist.'
                      );
                    }}
                    className={`px-3.5 py-2 rounded-lg text-[12px] font-semibold shadow-sm transition-colors border ${
                      isEmergencyForwardingActive
                        ? 'bg-amber-500 text-white border-amber-600 hover:bg-amber-600'
                        : 'bg-white border-amber-300 text-amber-800 hover:bg-amber-50'
                    }`}
                  >
                    {isEmergencyForwardingActive ? 'Disable Emergency Forwarding' : 'Forward Calls to Owner Cell'}
                  </button>

                  <Link
                    href="/receptionists"
                    className="px-3.5 py-2 bg-[#2563EB] hover:bg-blue-700 text-white rounded-lg text-[12px] font-semibold transition-colors shadow-sm inline-flex items-center gap-1 ml-auto"
                  >
                    View Voice Console →
                  </Link>
                </div>
              </div>

              {/* Disaster Recovery / Worst Scenario Controls */}
              <div className="bg-white border border-amber-200 rounded-xl p-5 shadow-sm space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-lg bg-amber-100 text-amber-800 flex items-center justify-center">
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <circle cx="12" cy="12" r="3"></circle>
                        <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"></path>
                      </svg>
                    </div>
                    <div>
                      <h4 className="text-[14px] font-bold text-gray-900">Tenant Disaster Recovery & Credential Management</h4>
                      <p className="text-[12px] text-gray-500">Fast operator resolutions for locked accounts, lost 2FA tokens, and password reset requests.</p>
                    </div>
                  </div>
                  <span className="text-[11px] font-bold px-2 py-0.5 bg-amber-100 text-amber-800 rounded">
                    Operator Privileges
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2">
                  {/* Card 1: Direct Set Password */}
                  <div className="p-3.5 bg-gray-50 border border-gray-200 rounded-xl space-y-2 flex flex-col justify-between">
                    <div>
                      <div className="flex items-center gap-1.5 text-[12px] font-bold text-gray-900">
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#2563EB" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect>
                          <path d="M7 11V7a5 5 0 0 1 10 0v4"></path>
                        </svg>
                        <span>Direct Password Reset</span>
                      </div>
                      <p className="text-[11px] text-gray-500 leading-relaxed mt-1">
                        Directly enter a custom password for the Owner or any staff member.
                      </p>
                    </div>
                    <button
                      onClick={() => openDirectPasswordModal(staffList[0])}
                      className="text-[12px] font-bold text-blue-600 hover:text-blue-800 hover:underline flex items-center gap-1 pt-1"
                    >
                      Set Password Now →
                    </button>
                  </div>

                  {/* Card 2: Unlock Account */}
                  <div className="p-3.5 bg-gray-50 border border-gray-200 rounded-xl space-y-2 flex flex-col justify-between">
                    <div>
                      <div className="flex items-center gap-1.5 text-[12px] font-bold text-gray-900">
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#10B981" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect>
                          <path d="M7 11V7a5 5 0 0 1 9.9-1"></path>
                        </svg>
                        <span>Locked Out (5+ tries)</span>
                      </div>
                      <p className="text-[11px] text-gray-500 leading-relaxed mt-1">
                        Dr. Emily Carter is currently locked. Instantly unlock with 1-click.
                      </p>
                    </div>
                    <button
                      onClick={() => handleUnlockAccount('usr-003')}
                      className="text-[12px] font-bold text-emerald-600 hover:text-emerald-800 hover:underline flex items-center gap-1 pt-1"
                    >
                      Unlock Dr. Emily Carter →
                    </button>
                  </div>

                  {/* Card 3: 2FA Recovery */}
                  <div className="p-3.5 bg-gray-50 border border-gray-200 rounded-xl space-y-2 flex flex-col justify-between">
                    <div>
                      <div className="flex items-center gap-1.5 text-[12px] font-bold text-gray-900">
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#D97706" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <rect x="5" y="2" width="14" height="20" rx="2" ry="2"></rect>
                          <line x1="12" y1="18" x2="12.01" y2="18"></line>
                        </svg>
                        <span>Lost 2FA / Phone Stolen</span>
                      </div>
                      <p className="text-[11px] text-gray-500 leading-relaxed mt-1">
                        Reset authenticator hardware token and issue one-time bypass code.
                      </p>
                    </div>
                    <button
                      onClick={() => {
                        setSelectedStaffForAction(staffList[0]);
                        setShowEmergencyModal(true);
                      }}
                      className="text-[12px] font-bold text-amber-700 hover:text-amber-900 hover:underline flex items-center gap-1 pt-1"
                    >
                      Open 2FA Recovery Tool →
                    </button>
                  </div>
                </div>
              </div>
            </div>

            {/* Right Column (1 Col) */}
            <div className="space-y-4">
              {/* Subscription Details */}
              <div className="bg-white border border-[#E2E8F0] rounded-xl p-5 shadow-sm space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="text-[14px] font-bold text-[#0F172A]">Subscription Details</h3>
                  <span className="text-[10px] font-bold bg-blue-100 text-blue-800 px-2 py-0.5 rounded">STRIPE LIVE</span>
                </div>

                <div className="space-y-2.5 pt-1">
                  <div className="flex items-center justify-between text-[13px]">
                    <span className="text-[#475569]">Active Plan</span>
                    <span className="font-bold text-[#2563EB]">Enterprise Multi-Doctor</span>
                  </div>
                  <div className="flex items-center justify-between text-[13px]">
                    <span className="text-[#475569]">Monthly Fee</span>
                    <span className="font-bold text-[#0F172A]">€299.00 / mo</span>
                  </div>
                  <div className="flex items-center justify-between text-[13px]">
                    <span className="text-[#475569]">Billing Cycle</span>
                    <span className="text-gray-500">Feb 12, 2026 (Auto-renew)</span>
                  </div>
                  <div className="flex items-center justify-between text-[13px]">
                    <span className="text-[#475569]">Payment Method</span>
                    <span className="font-mono text-gray-700">Mastercard •••• 4022</span>
                  </div>
                </div>

                <div className="pt-2 border-t border-gray-100 flex items-center justify-between">
                  <span className="text-[11px] text-gray-400">Invoice: #INV-2026-0104</span>
                  <button onClick={() => showToast('Downloading invoice PDF...')} className="text-[11px] font-bold text-blue-600 hover:underline">
                    Download VAT Invoice
                  </button>
                </div>
              </div>

              {/* Platform Resources */}
              <div className="bg-white border border-[#E2E8F0] rounded-xl p-5 shadow-sm space-y-3.5">
                <h3 className="text-[14px] font-bold text-[#0F172A]">Platform Resource Limits</h3>

                <div className="space-y-3">
                  {/* API Usage */}
                  <div>
                    <div className="flex justify-between text-[12px] text-[#475569] mb-1.5 font-medium">
                      <span>Inbound Calls (7,892 / 10,000)</span>
                      <span className="font-bold text-gray-900">79%</span>
                    </div>
                    <div className="w-full h-2 bg-[#E2E8F0] rounded-full overflow-hidden">
                      <div className="h-full bg-[#2563EB] rounded-full" style={{ width: '79%' }} />
                    </div>
                  </div>

                  {/* Storage */}
                  <div>
                    <div className="flex justify-between text-[12px] text-[#475569] mb-1.5 font-medium">
                      <span>Audio Recording Storage (1.2 / 5 GB)</span>
                      <span className="font-bold text-gray-900">24%</span>
                    </div>
                    <div className="w-full h-2 bg-[#E2E8F0] rounded-full overflow-hidden">
                      <div className="h-full bg-emerald-500 rounded-full" style={{ width: '24%' }} />
                    </div>
                  </div>

                  {/* ElevenLabs Characters */}
                  <div>
                    <div className="flex justify-between text-[12px] text-[#475569] mb-1.5 font-medium">
                      <span>TTS Voice Characters (320k / 500k)</span>
                      <span className="font-bold text-gray-900">64%</span>
                    </div>
                    <div className="w-full h-2 bg-[#E2E8F0] rounded-full overflow-hidden">
                      <div className="h-full bg-purple-500 rounded-full" style={{ width: '64%' }} />
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 2. USERS & ROLES TAB (WITH DIRECT PASSWORD RESET & SECURITY TOOLS) */}
      {activeTab === 'Users & Roles' && (
        <div className="space-y-5">
          <div className="bg-white border border-gray-200 rounded-xl p-5 shadow-sm flex flex-wrap items-center justify-between gap-4">
            <div>
              <h3 className="text-[16px] font-bold text-gray-900">Practice Staff, Roles & Access Security</h3>
              <p className="text-[12px] text-gray-500">
                Directly reset passwords, manage 2FA status, and resolve locked accounts for all 5 onboarded clinic staff members.
              </p>
            </div>

            <div className="flex items-center gap-2.5">
              <button
                onClick={() => showToast('Invite modal opened. A new staff invitation link can be dispatched via email.')}
                className="px-3.5 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-[12px] font-bold transition-colors shadow-sm flex items-center gap-1.5"
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="12" y1="5" x2="12" y2="19"></line>
                  <line x1="5" y1="12" x2="19" y2="12"></line>
                </svg>
                Invite New Staff Member
              </button>
            </div>
          </div>

          {/* Staff Table */}
          <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-gray-100 bg-[#F9FAFB]">
                    <th className="py-3 px-5 text-[11px] font-bold text-gray-500 uppercase tracking-wider">Staff Member</th>
                    <th className="py-3 px-5 text-[11px] font-bold text-gray-500 uppercase tracking-wider">Role & Permissions</th>
                    <th className="py-3 px-5 text-[11px] font-bold text-gray-500 uppercase tracking-wider">Contact Details</th>
                    <th className="py-3 px-5 text-[11px] font-bold text-gray-500 uppercase tracking-wider">Security & 2FA</th>
                    <th className="py-3 px-5 text-[11px] font-bold text-gray-500 uppercase tracking-wider">Account Status</th>
                    <th className="py-3 px-5 text-[11px] font-bold text-gray-500 uppercase tracking-wider text-right">Password & Auth Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 text-[13px]">
                  {staffList.map((user) => (
                    <tr key={user.id} className="hover:bg-gray-50/75 transition-colors">
                      {/* Name & Avatar */}
                      <td className="py-3.5 px-5">
                        <div className="flex items-center gap-3">
                          <div className={`w-9 h-9 rounded-full flex items-center justify-center font-bold text-[12px] flex-shrink-0 ${
                            user.role === 'Owner'
                              ? 'bg-amber-100 text-amber-800 border border-amber-200'
                              : user.role === 'Doctor'
                              ? 'bg-blue-100 text-blue-800 border border-blue-200'
                              : 'bg-gray-100 text-gray-700 border border-gray-200'
                          }`}>
                            {user.name.split(' ').map(n => n[0]).join('').slice(0, 2)}
                          </div>
                          <div>
                            <span className="font-bold text-gray-900 block leading-tight">{user.name}</span>
                            <span className="text-[11px] text-gray-400">{user.specialty}</span>
                          </div>
                        </div>
                      </td>

                      {/* Role */}
                      <td className="py-3.5 px-5">
                        <span className={`inline-flex items-center px-2 py-0.5 rounded text-[11px] font-bold ${
                          user.role === 'Owner'
                            ? 'bg-amber-100 text-amber-800'
                            : user.role === 'Doctor'
                            ? 'bg-blue-100 text-blue-800'
                            : user.role === 'Practice Manager'
                            ? 'bg-purple-100 text-purple-800'
                            : 'bg-emerald-100 text-emerald-800'
                        }`}>
                          {user.role}
                        </span>
                        <div className="text-[10px] text-gray-400 mt-0.5">
                          {user.role === 'Owner' ? 'Full SuperAdmin Privileges' : user.role === 'Doctor' ? 'Manage Schedule & Patients' : 'Front Desk Desk Operator'}
                        </div>
                      </td>

                      {/* Contact Details */}
                      <td className="py-3.5 px-5">
                        <div className="font-mono text-[12px] text-gray-800">{user.email}</div>
                        <div className="font-mono text-[11px] text-gray-400">{user.phone}</div>
                      </td>

                      {/* Security & 2FA */}
                      <td className="py-3.5 px-5">
                        <div className="flex items-center gap-1.5">
                          <span className={`w-2 h-2 rounded-full ${user.is2FAEnabled ? 'bg-emerald-500' : 'bg-red-400'}`}></span>
                          <span className="text-[12px] font-semibold text-gray-700">
                            {user.is2FAEnabled ? '2FA Active' : '2FA Not Configured'}
                          </span>
                        </div>
                        <div className="text-[11px] text-gray-400">Last login: {user.lastLogin}</div>
                      </td>

                      {/* Status */}
                      <td className="py-3.5 px-5">
                        <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold ${
                          user.status === 'Active'
                            ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                            : 'bg-red-50 text-red-700 border border-red-200'
                        }`}>
                          ● {user.status}
                        </span>
                        {user.failedLogins > 0 && (
                          <div className="text-[10px] text-red-600 font-bold mt-0.5">
                            {user.failedLogins} failed attempts
                          </div>
                        )}
                      </td>

                      {/* Password & Auth Actions */}
                      <td className="py-3.5 px-5 text-right">
                        <div className="flex items-center justify-end gap-2 text-[12px]">
                          {/* Direct Set Password */}
                          <button
                            onClick={() => openDirectPasswordModal(user)}
                            className="px-2.5 py-1 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-lg transition-colors text-[11px] shadow-sm flex items-center gap-1"
                          >
                            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                              <rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect>
                              <path d="M7 11V7a5 5 0 0 1 10 0v4"></path>
                            </svg>
                            Set Password
                          </button>

                          {/* Manage Auth / Emergency Tools */}
                          <button
                            onClick={() => {
                              setSelectedStaffForAction(user);
                              setShowEmergencyModal(true);
                            }}
                            className="px-2.5 py-1 bg-gray-100 hover:bg-gray-200 text-gray-800 font-bold rounded-lg transition-colors text-[11px] flex items-center gap-1"
                          >
                            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                              <circle cx="12" cy="12" r="3"></circle>
                              <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"></path>
                            </svg>
                            Manage Auth
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Role Permissions Matrix */}
          <div className="bg-white border border-gray-200 rounded-xl p-5 shadow-sm">
            <h4 className="text-[14px] font-bold text-gray-900 mb-2 flex items-center gap-2">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"></path>
              </svg>
              <span>Practice Role Permissions Hierarchy</span>
            </h4>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 text-[12px]">
              <div className="p-3 bg-gray-50 rounded-lg border border-gray-200">
                <div className="font-bold text-amber-900 mb-1 flex items-center gap-1.5">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path>
                    <circle cx="12" cy="7" r="4"></circle>
                  </svg>
                  <span>Owner (Dr. Sarah Wilson)</span>
                </div>
                <p className="text-gray-600 text-[11px]">Unrestricted access: Billing, PMS integrations, API keys, AI voice model tuning, staff hiring/firing.</p>
              </div>
              <div className="p-3 bg-gray-50 rounded-lg border border-gray-200">
                <div className="font-bold text-blue-900 mb-1 flex items-center gap-1.5">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="22 12 18 12 15 21 9 3 6 12 2 12"></polyline>
                  </svg>
                  <span>Doctor (Dentist)</span>
                </div>
                <p className="text-gray-600 text-[11px]">View assigned appointments, manage chair availability, treatment logs, clinical patient notes.</p>
              </div>
              <div className="p-3 bg-gray-50 rounded-lg border border-gray-200">
                <div className="font-bold text-purple-900 mb-1 flex items-center gap-1.5">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <rect x="2" y="7" width="20" height="14" rx="2" ry="2"></rect>
                    <path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16"></path>
                  </svg>
                  <span>Practice Manager</span>
                </div>
                <p className="text-gray-600 text-[11px]">Financial receipts, Stripe subscriptions, office schedule overrides, compliance audits.</p>
              </div>
              <div className="p-3 bg-gray-50 rounded-lg border border-gray-200">
                <div className="font-bold text-emerald-900 mb-1 flex items-center gap-1.5">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"></path>
                  </svg>
                  <span>Receptionist</span>
                </div>
                <p className="text-gray-600 text-[11px]">Call logs, manual patient bookings, warm transfer pickup, WhatsApp notifications.</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 3. AI RECEPTIONIST TAB */}
      {activeTab === 'AI Receptionist' && (
        <div className="space-y-5">
          <div className="bg-white border border-gray-200 rounded-xl p-6 shadow-sm space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-gray-100">
              <div>
                <h3 className="text-[16px] font-bold text-gray-900">AI Voice Receptionist Configuration</h3>
                <p className="text-[12px] text-gray-500">Twilio SIP inbound voice agent powered by Deepgram STT, Groq LLaMA, and ElevenLabs.</p>
              </div>
              <Link
                href="/receptionists"
                className="px-3.5 py-1.5 bg-blue-600 hover:bg-blue-700 text-white font-bold text-[12px] rounded-lg shadow-sm"
              >
                Launch Voice Simulation Modal →
              </Link>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="p-4 bg-gray-50 rounded-xl border border-gray-200">
                <div className="text-[11px] font-bold text-gray-400 uppercase">Assigned Voice</div>
                <div className="text-[15px] font-bold text-gray-900 mt-1">ElevenLabs - Sarah (Professional Medical)</div>
                <div className="text-[11px] text-gray-500 mt-1">Pitch: Neutral | Speed: 1.05x | Stability: 85%</div>
              </div>
              <div className="p-4 bg-gray-50 rounded-xl border border-gray-200">
                <div className="text-[11px] font-bold text-gray-400 uppercase">Language Fallback</div>
                <div className="text-[15px] font-bold text-gray-900 mt-1">Auto-Detect (Dutch + English)</div>
                <div className="text-[11px] text-gray-500 mt-1">Switches dynamically based on caller speech</div>
              </div>
              <div className="p-4 bg-gray-50 rounded-xl border border-gray-200">
                <div className="text-[11px] font-bold text-gray-400 uppercase">Average Latency</div>
                <div className="text-[15px] font-bold text-emerald-600 mt-1">485ms (P95: 620ms)</div>
                <div className="text-[11px] text-gray-500 mt-1">Barge-in VAD threshold: 220ms</div>
              </div>
            </div>

            <div className="p-4 bg-blue-50 border border-blue-200 rounded-xl">
              <div className="text-[12px] font-bold text-blue-900 mb-1">Standard Greeting Message:</div>
              <p className="text-[13px] text-blue-800 italic">
                &ldquo;Hello and thank you for calling Smile Dental Clinic. My name is Sarah, an AI assistant. How may I help you book or reschedule an appointment today?&rdquo;
              </p>
            </div>
          </div>
        </div>
      )}

      {/* 4. APPOINTMENTS TAB */}
      {activeTab === 'Appointments' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between bg-white p-4 rounded-xl border border-gray-200">
            <div>
              <h3 className="text-[15px] font-bold text-gray-900">Practice Appointments</h3>
              <p className="text-[12px] text-gray-500">Upcoming and completed bookings scheduled via AI and front desk staff.</p>
            </div>
            <Link href="/appointments" className="text-[12px] font-bold text-blue-600 hover:underline">
              View All Platform Appointments →
            </Link>
          </div>

          <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
            <table className="w-full text-left text-[13px]">
              <thead className="bg-gray-50 text-[11px] font-bold uppercase text-gray-400 border-b border-gray-100">
                <tr>
                  <th className="py-3 px-4">Patient</th>
                  <th className="py-3 px-4">Treatment</th>
                  <th className="py-3 px-4">Doctor</th>
                  <th className="py-3 px-4">Scheduled Slot</th>
                  <th className="py-3 px-4">Channel</th>
                  <th className="py-3 px-4 text-right">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                <tr className="hover:bg-gray-50">
                  <td className="py-3 px-4 font-bold text-gray-900">Mark de J.••••</td>
                  <td className="py-3 px-4">Dental Cleaning (45 min)</td>
                  <td className="py-3 px-4 text-gray-700">Dr. John Miller</td>
                  <td className="py-3 px-4 font-mono text-gray-600">Feb 14, 2026 - 10:30 AM</td>
                  <td className="py-3 px-4"><span className="px-2 py-0.5 rounded bg-blue-50 text-blue-700 text-[11px] font-bold">AI Voice</span></td>
                  <td className="py-3 px-4 text-right"><span className="px-2 py-0.5 rounded bg-emerald-50 text-emerald-700 text-[11px] font-bold">Confirmed</span></td>
                </tr>
                <tr className="hover:bg-gray-50">
                  <td className="py-3 px-4 font-bold text-gray-900">Sarah W.••••</td>
                  <td className="py-3 px-4">Teeth Whitening (60 min)</td>
                  <td className="py-3 px-4 text-gray-700">Dr. Emily Carter</td>
                  <td className="py-3 px-4 font-mono text-gray-600">Feb 15, 2026 - 02:00 PM</td>
                  <td className="py-3 px-4"><span className="px-2 py-0.5 rounded bg-purple-50 text-purple-700 text-[11px] font-bold">Web Booking</span></td>
                  <td className="py-3 px-4 text-right"><span className="px-2 py-0.5 rounded bg-emerald-50 text-emerald-700 text-[11px] font-bold">Confirmed</span></td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* 5. CALLS TAB */}
      {activeTab === 'Calls' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between bg-white p-4 rounded-xl border border-gray-200">
            <div>
              <h3 className="text-[15px] font-bold text-gray-900">Inbound Call Logs (Twilio Media Stream)</h3>
              <p className="text-[12px] text-gray-500">All calls received at +31 20 894 3400 handled by AI Receptionist.</p>
            </div>
            <Link href="/calls" className="text-[12px] font-bold text-blue-600 hover:underline">
              Open Full Call Monitor →
            </Link>
          </div>

          <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
            <table className="w-full text-left text-[13px]">
              <thead className="bg-gray-50 text-[11px] font-bold uppercase text-gray-400 border-b border-gray-100">
                <tr>
                  <th className="py-3 px-4">Caller</th>
                  <th className="py-3 px-4">Duration</th>
                  <th className="py-3 px-4">Intent</th>
                  <th className="py-3 px-4">Resolution</th>
                  <th className="py-3 px-4 text-right">Timestamp</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                <tr className="hover:bg-gray-50">
                  <td className="py-3 px-4 font-mono text-gray-800">+31 6 •••••• 42</td>
                  <td className="py-3 px-4 font-mono">1m 45s</td>
                  <td className="py-3 px-4 font-semibold text-gray-900">Reschedule Cleaning</td>
                  <td className="py-3 px-4"><span className="px-2 py-0.5 rounded bg-emerald-50 text-emerald-700 text-[11px] font-bold">Resolved (AI)</span></td>
                  <td className="py-3 px-4 text-right text-gray-500">2 min ago</td>
                </tr>
                <tr className="hover:bg-gray-50">
                  <td className="py-3 px-4 font-mono text-gray-800">+31 6 •••••• 89</td>
                  <td className="py-3 px-4 font-mono">3m 12s</td>
                  <td className="py-3 px-4 font-semibold text-gray-900">Insurance Coverage Query</td>
                  <td className="py-3 px-4"><span className="px-2 py-0.5 rounded bg-blue-50 text-blue-700 text-[11px] font-bold">RAG Answered</span></td>
                  <td className="py-3 px-4 text-right text-gray-500">18 min ago</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* 6. CUSTOMERS TAB */}
      {activeTab === 'Customers' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between bg-white p-4 rounded-xl border border-gray-200">
            <div>
              <h3 className="text-[15px] font-bold text-gray-900">Smile Dental Registered Patients</h3>
              <p className="text-[12px] text-gray-500">HIPAA/GDPR compliant masked caller and patient records.</p>
            </div>
            <Link href="/customers" className="text-[12px] font-bold text-blue-600 hover:underline">
              Platform Customer Master List →
            </Link>
          </div>

          <div className="bg-white rounded-xl border border-gray-200 p-4 space-y-2">
            <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
              <div>
                <span className="font-bold text-gray-900">Sarah W.••••</span>
                <div className="text-[11px] text-gray-400 font-mono">sa••••@gmail.com · +31 6 •••••• 42</div>
              </div>
              <div className="text-right">
                <span className="text-[12px] font-bold text-gray-900">4 Appointments</span>
                <div className="text-[11px] text-emerald-600">Last visited Jan 12, 2026</div>
              </div>
            </div>
            <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
              <div>
                <span className="font-bold text-gray-900">Mark de J.••••</span>
                <div className="text-[11px] text-gray-400 font-mono">ma••••@hotmail.com · +31 6 •••••• 89</div>
              </div>
              <div className="text-right">
                <span className="text-[12px] font-bold text-gray-900">2 Appointments</span>
                <div className="text-[11px] text-emerald-600">Last visited Jan 05, 2026</div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 7. SERVICES TAB */}
      {activeTab === 'Services' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between bg-white p-4 rounded-xl border border-gray-200">
            <div>
              <h3 className="text-[15px] font-bold text-gray-900">Configured Dental Treatments (from Onboarding)</h3>
              <p className="text-[12px] text-gray-500">Treatments that Sarah AI is permitted to book slots for.</p>
            </div>
            <Link href="/services" className="text-[12px] font-bold text-blue-600 hover:underline">
              All Platform Services →
            </Link>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-white border border-gray-200 p-4 rounded-xl shadow-sm space-y-2">
              <div className="flex items-center justify-between">
                <h4 className="font-bold text-gray-900">Dental Consultation</h4>
                <span className="font-bold text-blue-600">€50</span>
              </div>
              <p className="text-[12px] text-gray-500">Standard initial oral exam slot.</p>
              <div className="text-[11px] font-semibold text-gray-700">Duration: 30 min · Assigned: Dr. Sarah Wilson</div>
            </div>

            <div className="bg-white border border-gray-200 p-4 rounded-xl shadow-sm space-y-2">
              <div className="flex items-center justify-between">
                <h4 className="font-bold text-gray-900">Dental Cleaning</h4>
                <span className="font-bold text-blue-600">€80</span>
              </div>
              <p className="text-[12px] text-gray-500">Full hygiene prophylaxis and scaling.</p>
              <div className="text-[11px] font-semibold text-gray-700">Duration: 45 min · Assigned: Dr. John Miller</div>
            </div>

            <div className="bg-white border border-gray-200 p-4 rounded-xl shadow-sm space-y-2">
              <div className="flex items-center justify-between">
                <h4 className="font-bold text-gray-900">Teeth Whitening</h4>
                <span className="font-bold text-blue-600">€150</span>
              </div>
              <p className="text-[12px] text-gray-500">Cosmetic in-clinic whitening procedure.</p>
              <div className="text-[11px] font-semibold text-gray-700">Duration: 60 min · Assigned: Dr. Emily Carter</div>
            </div>
          </div>
        </div>
      )}

      {/* 8. KNOWLEDGE BASE TAB */}
      {activeTab === 'Knowledge Base' && (
        <div className="bg-white border border-gray-200 rounded-xl p-6 shadow-sm space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-gray-100">
            <div>
              <h3 className="text-[16px] font-bold text-gray-900">Clinic RAG Knowledge Embeddings</h3>
              <p className="text-[12px] text-gray-500">Policies and FAQ documents indexed in Vector DB for instant caller answers.</p>
            </div>
            <button onClick={() => showToast('Syncing RAG vector database...')} className="px-3 py-1.5 bg-blue-50 text-blue-700 rounded-lg text-[12px] font-bold">
              Re-index Vectors
            </button>
          </div>

          <div className="space-y-3">
            <div className="p-3 bg-gray-50 rounded-lg border border-gray-200 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#2563EB" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
                  <polyline points="14 2 14 8 20 8"></polyline>
                  <line x1="16" y1="13" x2="8" y2="13"></line>
                  <line x1="16" y1="17" x2="8" y2="17"></line>
                  <polyline points="10 9 9 9 8 9"></polyline>
                </svg>
                <div>
                  <span className="font-bold text-gray-900 text-[13px]">clinic_policies_2026.pdf</span>
                  <div className="text-[11px] text-gray-400">Indexed: Jan 4, 2026 · 14 Chunks · Cancellation fee €25</div>
                </div>
              </div>
              <span className="text-[11px] font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded">Indexed</span>
            </div>

            <div className="p-3 bg-gray-50 rounded-lg border border-gray-200 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#2563EB" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
                  <polyline points="14 2 14 8 20 8"></polyline>
                  <line x1="16" y1="13" x2="8" y2="13"></line>
                  <line x1="16" y1="17" x2="8" y2="17"></line>
                  <polyline points="10 9 9 9 8 9"></polyline>
                </svg>
                <div>
                  <span className="font-bold text-gray-900 text-[13px]">insurance_networks_netherlands.docx</span>
                  <div className="text-[11px] text-gray-400">Indexed: Jan 10, 2026 · 22 Chunks · Covers Zilveren Kruis & CZ</div>
                </div>
              </div>
              <span className="text-[11px] font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded">Indexed</span>
            </div>
          </div>
        </div>
      )}

      {/* 9. INTEGRATIONS TAB */}
      {activeTab === 'Integrations' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="bg-white border border-gray-200 p-5 rounded-xl shadow-sm space-y-2">
            <div className="flex items-center justify-between">
              <span className="font-bold text-gray-900">PMS / Dental Practice Software</span>
              <span className="px-2 py-0.5 bg-emerald-50 text-emerald-700 rounded text-[11px] font-bold">Connected</span>
            </div>
            <p className="text-[12px] text-gray-500">Curve Dental Sync (Direct slot bi-directional bridge).</p>
          </div>

          <div className="bg-white border border-gray-200 p-5 rounded-xl shadow-sm space-y-2">
            <div className="flex items-center justify-between">
              <span className="font-bold text-gray-900">Google Calendar Sync</span>
              <span className="px-2 py-0.5 bg-emerald-50 text-emerald-700 rounded text-[11px] font-bold">Connected</span>
            </div>
            <p className="text-[12px] text-gray-500">Synced to reception@smiledental.com master calendar.</p>
          </div>

          <div className="bg-white border border-gray-200 p-5 rounded-xl shadow-sm space-y-2">
            <div className="flex items-center justify-between">
              <span className="font-bold text-gray-900">Twilio SIP Trunk Gateway</span>
              <span className="px-2 py-0.5 bg-emerald-50 text-emerald-700 rounded text-[11px] font-bold">Active</span>
            </div>
            <p className="text-[12px] text-gray-500">AI Number: +31 20 808 1922 (Media Stream WebSocket live) — forwarded from business number +31 20 894 3400.</p>
          </div>

          <div className="bg-white border border-gray-200 p-5 rounded-xl shadow-y-2">
            <div className="flex items-center justify-between">
              <span className="font-bold text-gray-900">WhatsApp Business API</span>
              <span className="px-2 py-0.5 bg-emerald-50 text-emerald-700 rounded text-[11px] font-bold">Active</span>
            </div>
            <p className="text-[12px] text-gray-500">Dispatches appointment confirmation and SMS reminders.</p>
          </div>
        </div>
      )}

      {/* 10. USAGE TAB */}
      {activeTab === 'Usage' && (
        <div className="bg-white border border-gray-200 rounded-xl p-6 shadow-sm space-y-4">
          <h3 className="text-[16px] font-bold text-gray-900">Detailed Telephony & Inference Usage</h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="p-4 bg-gray-50 rounded-xl border border-gray-200">
              <div className="text-[11px] text-gray-400 font-bold">Twilio Voice Minutes</div>
              <div className="text-[20px] font-bold text-gray-900 mt-1">4,280 mins</div>
            </div>
            <div className="p-4 bg-gray-50 rounded-xl border border-gray-200">
              <div className="text-[11px] text-gray-400 font-bold">Deepgram STT Audio</div>
              <div className="text-[20px] font-bold text-gray-900 mt-1">71.3 hrs</div>
            </div>
            <div className="p-4 bg-gray-50 rounded-xl border border-gray-200">
              <div className="text-[11px] text-gray-400 font-bold">Groq LLM Tokens</div>
              <div className="text-[20px] font-bold text-gray-900 mt-1">1.84M tok</div>
            </div>
            <div className="p-4 bg-gray-50 rounded-xl border border-gray-200">
              <div className="text-[11px] text-gray-400 font-bold">ElevenLabs Chars</div>
              <div className="text-[20px] font-bold text-gray-900 mt-1">320,400</div>
            </div>
          </div>
        </div>
      )}

      {/* 11. BILLING TAB */}
      {activeTab === 'Billing' && (
        <div className="bg-white border border-gray-200 rounded-xl p-6 shadow-sm space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-gray-100">
            <div>
              <h3 className="text-[16px] font-bold text-gray-900">Subscription & Invoices</h3>
              <p className="text-[12px] text-gray-500">Billed monthly via Stripe to Dr. Sarah Wilson.</p>
            </div>
            <button onClick={() => showToast('Opening Stripe customer portal...')} className="px-3.5 py-1.5 bg-blue-600 text-white rounded-lg text-[12px] font-bold">
              Manage in Stripe →
            </button>
          </div>

          <div className="divide-y divide-gray-100 text-[13px]">
            <div className="py-3 flex items-center justify-between">
              <div>
                <span className="font-bold text-gray-900">INV-2026-001 (Jan 4, 2026)</span>
                <div className="text-[11px] text-gray-400">Enterprise Multi-Doctor Plan (€299.00)</div>
              </div>
              <div className="flex items-center gap-3">
                <span className="px-2 py-0.5 rounded bg-emerald-50 text-emerald-700 text-[11px] font-bold">Paid</span>
                <button onClick={() => showToast('PDF downloaded')} className="text-blue-600 hover:underline text-[12px]">Download</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 12. ACTIVITY TAB */}
      {activeTab === 'Activity' && (
        <div className="bg-white border border-gray-200 rounded-xl p-6 shadow-sm space-y-3">
          <h3 className="text-[16px] font-bold text-gray-900 mb-2">Practice Security Audit Trail</h3>
          <div className="space-y-3">
            <div className="p-3 bg-gray-50 rounded-lg border border-gray-100 text-[12px] flex items-center justify-between">
              <div>
                <span className="font-bold text-gray-900">Dr. Sarah Wilson logged in from 82.161.42.19 (Amsterdam)</span>
                <div className="text-[11px] text-gray-400">2FA Verified · Session active</div>
              </div>
              <span className="text-[11px] text-gray-400">Today, 09:14 AM</span>
            </div>
            <div className="p-3 bg-red-50/50 rounded-lg border border-red-200 text-[12px] flex items-center justify-between">
              <div>
                <span className="font-bold text-red-900">Dr. Emily Carter account LOCKED after 5 failed password attempts</span>
                <div className="text-[11px] text-red-600">IP: 145.109.11.20 · Locked by security guardrail</div>
              </div>
              <span className="text-[11px] text-gray-400">Feb 6, 2026</span>
            </div>
            <div className="p-3 bg-gray-50 rounded-lg border border-gray-100 text-[12px] flex items-center justify-between">
              <div>
                <span className="font-bold text-gray-900">AI Receptionist updated greeting configuration</span>
                <div className="text-[11px] text-gray-400">Updated by Super Admin Parikshit Arora</div>
              </div>
              <span className="text-[11px] text-gray-400">Jan 28, 2026</span>
            </div>
          </div>
        </div>
      )}

      {/* ================= MODALS ================= */}

      {/* 1. DIRECT PASSWORD SET / OVERRIDE MODAL */}
      {showDirectPasswordModal && selectedStaffForAction && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-start sm:items-center justify-center p-4 transition-opacity animate-in fade-in overflow-y-auto">
          <div className="w-full max-w-md max-h-[calc(100vh-2rem)] overflow-y-auto bg-white rounded-2xl shadow-2xl border border-gray-200 p-6 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-gray-100">
              <div className="flex items-center gap-2.5">
                <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center">
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect>
                    <path d="M7 11V7a5 5 0 0 1 10 0v4"></path>
                  </svg>
                </div>
                <div>
                  <h3 className="text-[16px] font-bold text-gray-900">Set New Password</h3>
                  <div className="text-[12px] text-gray-500">
                    For: <strong className="text-gray-900">{selectedStaffForAction.name}</strong> ({selectedStaffForAction.email})
                  </div>
                </div>
              </div>
              <button
                onClick={() => setShowDirectPasswordModal(false)}
                className="w-8 h-8 rounded-lg border border-gray-200 flex items-center justify-center text-gray-500 hover:bg-gray-50"
              >
                ✕
              </button>
            </div>

            {passwordError && (
              <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-[12px] text-red-700 font-medium">
                {passwordError}
              </div>
            )}

            <form onSubmit={handleSaveDirectPassword} className="space-y-4 pt-1">
              {/* Password Input */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <label className="text-[12px] font-bold text-gray-800">New Password</label>
                  <button
                    type="button"
                    onClick={handleGenerateStrongPassword}
                    className="text-[11px] font-bold text-blue-600 hover:underline flex items-center gap-1"
                  >
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M21.5 2v6h-6M21.34 15.57a10 10 0 1 1-.57-8.38l5.67-5.67"></path>
                    </svg>
                    Generate Strong Password
                  </button>
                </div>
                <div className="relative">
                  <input
                    type={showPasswordText ? "text" : "password"}
                    placeholder="Enter new strong password"
                    value={customPassword}
                    onChange={(e) => {
                      setCustomPassword(e.target.value);
                      setPasswordError('');
                    }}
                    className="w-full px-3.5 py-2.5 text-[13px] bg-gray-50 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white text-gray-900 font-mono"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowPasswordText(!showPasswordText)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                  >
                    {showPasswordText ? (
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"></path>
                        <line x1="1" y1="1" x2="23" y2="23"></line>
                      </svg>
                    ) : (
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path>
                        <circle cx="12" cy="12" r="3"></circle>
                      </svg>
                    )}
                  </button>
                </div>
              </div>

              {/* Confirm Password Input */}
              <div className="space-y-1.5">
                <label className="text-[12px] font-bold text-gray-800">Confirm Password</label>
                <input
                  type={showPasswordText ? "text" : "password"}
                  placeholder="Repeat new password"
                  value={confirmPassword}
                  onChange={(e) => {
                    setConfirmPassword(e.target.value);
                    setPasswordError('');
                  }}
                  className="w-full px-3.5 py-2.5 text-[13px] bg-gray-50 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white text-gray-900 font-mono"
                  required
                />
              </div>

              {/* Options */}
              <div className="space-y-2 pt-1">
                <label className="flex items-center gap-2 text-[12px] text-gray-700 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={requireChangeOnLogin}
                    onChange={(e) => setRequireChangeOnLogin(e.target.checked)}
                    className="w-4 h-4 rounded text-blue-600 focus:ring-blue-500 border-gray-300"
                  />
                  <span>Require user to change password on next sign-in</span>
                </label>

                <label className="flex items-center gap-2 text-[12px] text-gray-700 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={notifyUserViaEmail}
                    onChange={(e) => setNotifyUserViaEmail(e.target.checked)}
                    className="w-4 h-4 rounded text-blue-600 focus:ring-blue-500 border-gray-300"
                  />
                  <span>Send email notification with login confirmation</span>
                </label>
              </div>

              {/* Action Buttons */}
              <div className="pt-3 border-t border-gray-100 flex items-center justify-end gap-2.5">
                <button
                  type="button"
                  onClick={() => setShowDirectPasswordModal(false)}
                  className="px-4 py-2 border border-gray-200 hover:bg-gray-50 text-gray-700 font-bold text-[13px] rounded-lg"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold text-[13px] rounded-lg shadow-sm transition-colors"
                >
                  Update Password Now
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 2. CONTACT OWNER MODAL */}
      {showContactModal && (
        <div className="fixed inset-0 z-50 bg-black/40 flex items-start sm:items-center justify-center p-4 transition-opacity overflow-y-auto">
          <div className="w-full max-w-md max-h-[calc(100vh-2rem)] overflow-y-auto bg-white rounded-2xl shadow-2xl border border-gray-200 p-6 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-gray-100">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center font-bold text-[14px]">
                  SW
                </div>
                <div>
                  <h3 className="text-[15px] font-bold text-gray-900">Contact Dr. Sarah Wilson</h3>
                  <span className="text-[11px] text-gray-400">Owner & Medical Director</span>
                </div>
              </div>
              <button onClick={() => setShowContactModal(false)} className="w-8 h-8 rounded-lg border border-gray-200 flex items-center justify-center text-gray-500 hover:bg-gray-50">
                ✕
              </button>
            </div>

            <div className="space-y-3 pt-1">
              <div className="p-3 bg-gray-50 rounded-xl border border-gray-200 flex items-center justify-between">
                <div>
                  <div className="text-[11px] text-gray-400 font-semibold uppercase">Personal Mobile</div>
                  <div className="text-[14px] font-mono font-bold text-gray-900">+31 6 2345 6789</div>
                </div>
                <button
                  onClick={() => {
                    navigator.clipboard?.writeText('+31623456789');
                    showToast('Cell phone copied to clipboard!');
                  }}
                  className="px-3 py-1 bg-white border border-gray-200 text-gray-700 rounded-lg text-[12px] font-semibold hover:bg-gray-100"
                >
                  Copy
                </button>
              </div>

              <div className="p-3 bg-gray-50 rounded-xl border border-gray-200 flex items-center justify-between">
                <div>
                  <div className="text-[11px] text-gray-400 font-semibold uppercase">Personal Email</div>
                  <div className="text-[14px] font-mono text-gray-900">sarah@smileclinic.com</div>
                </div>
                <button
                  onClick={() => {
                    navigator.clipboard?.writeText('sarah@smileclinic.com');
                    showToast('Email copied to clipboard!');
                  }}
                  className="px-3 py-1 bg-white border border-gray-200 text-gray-700 rounded-lg text-[12px] font-semibold hover:bg-gray-100"
                >
                  Copy
                </button>
              </div>

              <div className="p-3 bg-gray-50 rounded-xl border border-gray-200 flex items-center justify-between">
                <div>
                  <div className="text-[11px] text-gray-400 font-semibold uppercase">Clinic Landline</div>
                  <div className="text-[14px] font-mono text-gray-900">+31 20 894 3400</div>
                </div>
                <button
                  onClick={() => {
                    navigator.clipboard?.writeText('+31208943400');
                    showToast('Clinic phone copied to clipboard!');
                  }}
                  className="px-3 py-1 bg-white border border-gray-200 text-gray-700 rounded-lg text-[12px] font-semibold hover:bg-gray-100"
                >
                  Copy
                </button>
              </div>
            </div>

            <div className="pt-2 flex justify-end">
              <button
                onClick={() => setShowContactModal(false)}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold text-[13px] rounded-lg shadow-sm"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 3. EMERGENCY OPERATOR / WORST SCENARIOS MODAL */}
      {showEmergencyModal && selectedStaffForAction && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-start sm:items-center justify-center p-4 transition-opacity overflow-y-auto">
          <div className="w-full max-w-lg max-h-[calc(100vh-2rem)] overflow-y-auto bg-white rounded-2xl shadow-2xl border border-amber-300 p-6 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-gray-100">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-amber-100 text-amber-800 flex items-center justify-center">
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"></path>
                    <line x1="12" y1="8" x2="12" y2="12"></line>
                    <line x1="12" y1="16" x2="12.01" y2="16"></line>
                  </svg>
                </div>
                <div>
                  <h3 className="text-[16px] font-bold text-gray-900">Security & Credential Recovery Tool</h3>
                  <div className="text-[12px] text-gray-500">
                    Target: <strong className="text-gray-900">{selectedStaffForAction.name}</strong> ({selectedStaffForAction.role})
                  </div>
                </div>
              </div>
              <button onClick={() => setShowEmergencyModal(false)} className="w-8 h-8 rounded-lg border border-gray-200 flex items-center justify-center text-gray-500 hover:bg-gray-50">
                ✕
              </button>
            </div>

            <p className="text-[12px] text-gray-600">
              Select an emergency remediation procedure. All actions are cryptographically logged in the security audit trail.
            </p>

            <div className="space-y-2.5">
              {/* Option 1: Direct Set Password */}
              <div className="p-3.5 bg-blue-50/50 border border-blue-200 rounded-xl flex items-center justify-between hover:bg-blue-50 transition-colors">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-lg bg-blue-100 text-blue-700 flex items-center justify-center">
                    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect>
                      <path d="M7 11V7a5 5 0 0 1 10 0v4"></path>
                    </svg>
                  </div>
                  <div>
                    <div className="text-[13px] font-bold text-gray-900">Directly Set Custom Password</div>
                    <div className="text-[11px] text-gray-500">Admin types a custom or auto-generated password right now.</div>
                  </div>
                </div>
                <button
                  onClick={() => {
                    setShowEmergencyModal(false);
                    openDirectPasswordModal(selectedStaffForAction);
                  }}
                  className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-[12px] font-bold shadow-sm"
                >
                  Set Password
                </button>
              </div>

              {/* Option 2: Send Password Reset Link */}
              <div className="p-3.5 bg-gray-50 border border-gray-200 rounded-xl flex items-center justify-between hover:bg-gray-100/75 transition-colors">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-lg bg-gray-100 text-gray-700 flex items-center justify-center">
                    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"></path>
                      <polyline points="22,6 12,13 2,6"></polyline>
                    </svg>
                  </div>
                  <div>
                    <div className="text-[13px] font-bold text-gray-900">Send Reset Email Link</div>
                    <div className="text-[11px] text-gray-500">Dispatches an email & SMS with a 15-minute token.</div>
                  </div>
                </div>
                <button
                  onClick={() => handleResetPasswordLink(selectedStaffForAction)}
                  className="px-3 py-1.5 bg-white border border-gray-300 hover:bg-gray-50 text-gray-800 rounded-lg text-[12px] font-bold shadow-sm"
                >
                  Send Link
                </button>
              </div>

              {/* Option 3: Unlock Locked Account */}
              <div className="p-3.5 bg-gray-50 border border-gray-200 rounded-xl flex items-center justify-between hover:bg-gray-100/75 transition-colors">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-lg bg-emerald-100 text-emerald-800 flex items-center justify-center">
                    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect>
                      <path d="M7 11V7a5 5 0 0 1 9.9-1"></path>
                    </svg>
                  </div>
                  <div>
                    <div className="text-[13px] font-bold text-gray-900">Unlock Locked Account</div>
                    <div className="text-[11px] text-gray-500">Clears lockout counter (currently {selectedStaffForAction.failedLogins} failed attempts).</div>
                  </div>
                </div>
                <button
                  onClick={() => handleUnlockAccount(selectedStaffForAction.id)}
                  className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-[12px] font-bold shadow-sm"
                >
                  Unlock
                </button>
              </div>

              {/* Option 4: Reset 2FA Token */}
              <div className="p-3.5 bg-gray-50 border border-gray-200 rounded-xl flex items-center justify-between hover:bg-gray-100/75 transition-colors">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-lg bg-purple-100 text-purple-800 flex items-center justify-center">
                    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <rect x="5" y="2" width="14" height="20" rx="2" ry="2"></rect>
                      <line x1="12" y1="18" x2="12.01" y2="18"></line>
                    </svg>
                  </div>
                  <div>
                    <div className="text-[13px] font-bold text-gray-900">Reset Lost 2FA / Authenticator</div>
                    <div className="text-[11px] text-gray-500">Disables 2FA and forces caller verification re-setup upon next login.</div>
                  </div>
                </div>
                <button
                  onClick={() => handleReset2FA(selectedStaffForAction)}
                  className="px-3 py-1.5 bg-purple-600 hover:bg-purple-700 text-white rounded-lg text-[12px] font-bold shadow-sm"
                >
                  Reset 2FA
                </button>
              </div>

              {/* Option 5: Invalidate All Active Sessions */}
              <div className="p-3.5 bg-gray-50 border border-gray-200 rounded-xl flex items-center justify-between hover:bg-gray-100/75 transition-colors">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-lg bg-red-100 text-red-800 flex items-center justify-center">
                    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"></path>
                      <polyline points="16 17 21 12 16 7"></polyline>
                      <line x1="21" y1="12" x2="9" y2="12"></line>
                    </svg>
                  </div>
                  <div>
                    <div className="text-[13px] font-bold text-gray-900">Revoke All Active Sessions</div>
                    <div className="text-[11px] text-gray-500">Kills all active JWT tokens across all laptops & mobile devices.</div>
                  </div>
                </div>
                <button
                  onClick={() => handleRevokeSessions(selectedStaffForAction)}
                  className="px-3 py-1.5 bg-red-600 hover:bg-red-700 text-white rounded-lg text-[12px] font-bold shadow-sm"
                >
                  Kill Sessions
                </button>
              </div>
            </div>

            <div className="pt-2 flex justify-end">
              <button
                onClick={() => setShowEmergencyModal(false)}
                className="px-4 py-2 border border-gray-200 hover:bg-gray-50 text-gray-700 font-bold text-[13px] rounded-lg"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 4. IMPERSONATE TENANT MODAL */}
      {showImpersonateModal && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-start sm:items-center justify-center p-4 transition-opacity overflow-y-auto">
          <div className="w-full max-w-md max-h-[calc(100vh-2rem)] overflow-y-auto bg-white rounded-2xl shadow-2xl border border-gray-200 p-6 space-y-4">
            <div className="w-12 h-12 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path>
                <circle cx="12" cy="7" r="4"></circle>
              </svg>
            </div>
            <div>
              <h3 className="text-[17px] font-bold text-gray-900">Impersonate Smile Dental Clinic</h3>
              <p className="text-[12px] text-gray-600 mt-1 leading-relaxed">
                You are about to enter the <strong>Smile Dental Clinic Tenant Portal</strong> under the identity of <strong>Dr. Sarah Wilson</strong>.
                All changes you make will appear in the practice activity log.
              </p>
            </div>

            <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-[11px] text-amber-900">
              <strong>SuperAdmin Notice:</strong> Impersonation sessions expire automatically after 30 minutes.
            </div>

            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                onClick={() => setShowImpersonateModal(false)}
                className="px-4 py-2 border border-gray-200 hover:bg-gray-50 text-gray-700 font-bold text-[13px] rounded-lg"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  setShowImpersonateModal(false);
                  showToast('Redirecting to tenant dashboard under simulated session...');
                  window.open('http://localhost:3000/dashboard', '_blank');
                }}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold text-[13px] rounded-lg shadow-sm"
              >
                Start Impersonation Session
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
