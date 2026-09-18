"use client";

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { STRINGS } from '../../../utils/strings/en';

const initialStaffMembers = [
  {
    id: 1,
    initials: 'DSW',
    name: 'Dr. Sarah Wilson',
    role: 'Doctor',
    specialty: 'General Dentistry',
    email: 'sarah@smileclinic.com',
    phone: '+1 (555) 019-2831',
    treatments: ['Dental Consultation', 'Teeth Whitening'],
  },
  {
    id: 2,
    initials: 'DJM',
    name: 'Dr. John Miller',
    role: 'Doctor',
    specialty: 'Orthodontics',
    email: 'john@smileclinic.com',
    phone: '+1 (555) 019-2831',
    treatments: ['Dental Cleaning', 'Braces Check'],
  },
  {
    id: 3,
    initials: 'DEC',
    name: 'Dr. Emily Carter',
    role: 'Doctor',
    specialty: 'Cosmetic Dentistry',
    email: 'emily@smileclinic.com',
    phone: '+1 (555) 019-2831',
    treatments: ['Teeth Whitening', 'Veneers Consultation'],
  },
];

export default function StaffOnboardingPage() {
  const router = useRouter();
  const [staffList, setStaffList] = useState(initialStaffMembers);
  const [isAdding, setIsAdding]   = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);

  type StaffForm = { name: string; role: string; specialty: string; email: string; phone: string; treatments: string[] };
  const emptyForm: StaffForm = { name: '', role: 'Doctor', specialty: '', email: '', phone: '', treatments: [] };

  const [newStaff,  setNewStaff]  = useState<StaffForm>(emptyForm);
  const [editForm,  setEditForm]  = useState<StaffForm>(emptyForm);

  const mockServices = ['Dental Consultation', 'Dental Cleaning', 'Teeth Whitening', 'Root Canal'];

  // ── Add ──────────────────────────────────────────────────────────────
  const handleAddStaff = () => {
    if (!newStaff.name.trim()) return;
    const initials = newStaff.name.split(' ').map(n => n[0]).join('').substring(0, 3).toUpperCase();
    setStaffList([...staffList, { ...newStaff, initials, id: Date.now() }]);
    setNewStaff(emptyForm);
    setIsAdding(false);
  };

  // ── Edit ─────────────────────────────────────────────────────────────
  const startEdit = (staff: typeof initialStaffMembers[0]) => {
    setEditingId(staff.id);
    setEditForm({ name: staff.name, role: staff.role, specialty: staff.specialty, email: staff.email, phone: staff.phone, treatments: staff.treatments });
    setIsAdding(false);
  };

  const handleSaveEdit = () => {
    if (!editForm.name.trim()) return;
    const initials = editForm.name.split(' ').map(n => n[0]).join('').substring(0, 3).toUpperCase();
    setStaffList(staffList.map(s =>
      s.id === editingId ? { ...s, ...editForm, initials } : s
    ));
    setEditingId(null);
  };

  const cancelEdit = () => setEditingId(null);

  // ── Delete ───────────────────────────────────────────────────────────
  const handleDelete = (id: number) => {
    setStaffList(staffList.filter(s => s.id !== id));
    if (editingId === id) setEditingId(null);
  };

  // ── Toggle treatment for a form ──────────────────────────────────────
  const toggleTreatment = (form: StaffForm, setter: (v: StaffForm) => void, t: string) => {
    setter({ ...form, treatments: form.treatments.includes(t) ? form.treatments.filter(x => x !== t) : [...form.treatments, t] });
  };

  // ── Shared Role Select Options ────────────────────────────────────────
  const ROLES = ['Doctor', 'Nurse', 'Hygienist', 'Specialist', 'Receptionist', 'Physiotherapist'];

  // ── Shared form fields ────────────────────────────────────────────────
  const StaffForm = ({ form, setForm, onSave, onCancel, saveLabel }: {
    form: StaffForm; setForm: (v: StaffForm) => void;
    onSave: () => void; onCancel: () => void; saveLabel: string;
  }) => (
    <>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-3">
        <div>
          <label className="text-[11px] font-semibold text-gray-700 mb-1 block">Full Name</label>
          <input type="text" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })}
            placeholder="e.g. Dr. Sarah Wilson" autoFocus
            className="w-full px-3 py-1.5 rounded-md border border-gray-200 focus:outline-none focus:ring-2 focus:ring-[#0066FF] text-xs" />
        </div>
        <div>
          <label className="text-[11px] font-semibold text-gray-700 mb-1 block">Role</label>
          <select value={form.role} onChange={e => setForm({ ...form, role: e.target.value })}
            className="w-full px-3 py-1.5 rounded-md border border-gray-200 focus:outline-none focus:ring-2 focus:ring-[#0066FF] text-xs bg-white">
            {ROLES.map(r => <option key={r}>{r}</option>)}
          </select>
        </div>
        <div>
          <label className="text-[11px] font-semibold text-gray-700 mb-1 block">Specialty</label>
          <input type="text" value={form.specialty} onChange={e => setForm({ ...form, specialty: e.target.value })}
            placeholder="e.g. Orthodontics"
            className="w-full px-3 py-1.5 rounded-md border border-gray-200 focus:outline-none focus:ring-2 focus:ring-[#0066FF] text-xs" />
        </div>
        <div>
          <label className="text-[11px] font-semibold text-gray-700 mb-1 block">Phone</label>
          <input type="tel" value={form.phone} onChange={e => setForm({ ...form, phone: e.target.value })}
            placeholder="+1 (555) 000-0000"
            className="w-full px-3 py-1.5 rounded-md border border-gray-200 focus:outline-none focus:ring-2 focus:ring-[#0066FF] text-xs" />
        </div>
        <div className="md:col-span-2">
          <label className="text-[11px] font-semibold text-gray-700 mb-1 block">Email</label>
          <input type="email" value={form.email} onChange={e => setForm({ ...form, email: e.target.value })}
            placeholder="sarah@clinic.com"
            className="w-full px-3 py-1.5 rounded-md border border-gray-200 focus:outline-none focus:ring-2 focus:ring-[#0066FF] text-xs" />
        </div>
        <div className="md:col-span-2">
          <label className="text-[11px] font-semibold text-gray-700 mb-1.5 block">Assign Treatments</label>
          <div className="flex flex-wrap gap-1.5">
            {mockServices.map(t => (
              <button key={t} type="button" onClick={() => toggleTreatment(form, setForm, t)}
                className={`text-xs font-medium px-2.5 py-1 rounded-full border transition-colors ${
                  form.treatments.includes(t) ? 'bg-[#0066FF] text-white border-[#0066FF]' : 'bg-white text-gray-600 border-gray-200 hover:border-[#0066FF] hover:text-[#0066FF]'
                }`}>{t}</button>
            ))}
          </div>
        </div>
      </div>
      <div className="flex justify-end gap-2">
        <button onClick={onCancel} className="px-3 py-1.5 text-xs font-medium text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-md transition-colors">Cancel</button>
        <button onClick={onSave} disabled={!form.name.trim()}
          className="px-4 py-1.5 text-xs font-medium text-white bg-[#0066FF] hover:bg-[#0052cc] rounded-md transition-colors disabled:opacity-50">{saveLabel}</button>
      </div>
    </>
  );

  return (
    <div className="w-full max-w-3xl bg-white rounded-xl shadow-sm border border-gray-100 p-4 sm:p-6 md:p-8">
      <div className="mb-5 sm:mb-6">
        <h1 className="text-2xl font-bold text-gray-900 tracking-tight mb-1.5">{STRINGS.ONBOARDING.STAFF.TITLE}</h1>
        <p className="text-sm text-gray-500 leading-relaxed">
          {STRINGS.ONBOARDING.STAFF.SUBTITLE}
        </p>
      </div>

      <div className="space-y-3 mb-6">
        {staffList.map((staff) => (
          <div key={staff.id} className="border border-gray-200 rounded-lg overflow-hidden hover:border-gray-300 transition-colors bg-white">

            {/* ── Edit mode ── */}
            {editingId === staff.id ? (
              <div className="border-2 border-[#0066FF] rounded-lg p-4 bg-blue-50/30">
                <h3 className="text-xs font-bold text-gray-900 mb-3">Edit Team Member</h3>
                <StaffForm form={editForm} setForm={setEditForm} onSave={handleSaveEdit} onCancel={cancelEdit} saveLabel="Save Changes" />
              </div>
            ) : (
              /* ── View mode ── */
              <div className="p-4">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-full bg-[#F0F7FF] flex items-center justify-center text-xs font-bold text-[#0066FF] shrink-0">
                      {staff.initials}
                    </div>
                    <div>
                      <div className="flex items-center gap-1.5 mb-0.5">
                        <h3 className="text-sm font-bold text-gray-900">{staff.name}</h3>
                        <span className="bg-[#F0F7FF] text-[#0066FF] text-[10px] font-semibold px-1.5 py-0.5 rounded">{staff.role}</span>
                      </div>
                      <p className="text-xs text-gray-500">{staff.specialty}</p>
                    </div>
                  </div>
                  {/* Actions */}
                  <div className="flex items-center gap-1">
                    <button onClick={() => startEdit(staff)} title="Edit"
                      className="p-1.5 text-gray-400 hover:text-[#0066FF] hover:bg-blue-50 rounded-lg transition-colors">
                      <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path>
                        <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path>
                      </svg>
                    </button>
                    <button onClick={() => handleDelete(staff.id)} title="Delete"
                      className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors">
                      <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <polyline points="3 6 5 6 21 6"></polyline>
                        <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
                      </svg>
                    </button>
                  </div>
                </div>

                <div className="h-px bg-gray-100 w-full my-3"></div>

                <div className="flex flex-col md:flex-row md:items-start gap-4 md:gap-8">
                  <div className="space-y-1.5">
                    <div className="flex items-center gap-2 text-xs text-gray-500">
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"></path>
                        <polyline points="22,6 12,13 2,6"></polyline>
                      </svg>
                      <span>{staff.email}</span>
                    </div>
                    <div className="flex items-center gap-2 text-xs text-gray-500">
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07A19.5 19.5 0 0 1 4.21 15a19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72c.127.96.361 1.903.7 2.81a2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0 1 22 16.92z"></path>
                      </svg>
                      <span>{staff.phone}</span>
                    </div>
                  </div>
                  <div>
                    <p className="text-[11px] font-semibold text-gray-900 uppercase tracking-wide mb-1.5">{STRINGS.ONBOARDING.STAFF.ASSIGNED_TREATMENTS}</p>
                    <div className="flex flex-wrap gap-1.5">
                      {staff.treatments.map((t, idx) => (
                        <span key={idx} className="bg-gray-50 text-gray-700 border border-gray-200 text-[10px] font-medium px-2 py-0.5 rounded">{t}</span>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        ))}


        {isAdding ? (
          <div className="border-2 border-[#0066FF] rounded-xl p-4 bg-blue-50/30">
            <h3 className="text-xs font-bold text-gray-900 mb-3">Add Team Member</h3>
            <StaffForm form={newStaff} setForm={setNewStaff} onSave={handleAddStaff} onCancel={() => { setIsAdding(false); setNewStaff(emptyForm); }} saveLabel="Save Member" />
          </div>

        ) : (
          <button 
            type="button" 
            onClick={() => setIsAdding(true)}
            className="w-full border-2 border-dashed border-gray-200 rounded-xl bg-[#FAFAFB] p-4 flex flex-col items-center justify-center hover:bg-gray-50 hover:border-[#0066FF] transition-colors group"
          >
            <div className="w-8 h-8 mb-2 bg-[#F0F7FF] rounded-full flex items-center justify-center group-hover:scale-110 transition-transform">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#0066FF" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <line x1="12" y1="5" x2="12" y2="19"></line>
                <line x1="5" y1="12" x2="19" y2="12"></line>
              </svg>
            </div>
            <p className="text-xs font-semibold text-[#0066FF]">{STRINGS.ONBOARDING.STAFF.ADD_TEAM_MEMBER}</p>
            <p className="text-[11px] text-gray-500 mt-0.5">{STRINGS.ONBOARDING.STAFF.ADD_TEAM_MEMBER_SUBTITLE}</p>
          </button>
        )}
      </div>

      {/* Footer Buttons */}
      <div className="pt-4 border-t border-gray-100 flex items-center justify-between">
        <button 
          type="button"
          onClick={() => router.push('/onboarding/services')}
          className="px-5 py-2 rounded-lg border border-gray-200 text-gray-700 text-sm font-medium hover:bg-gray-50 transition-colors shadow-sm"
        >
          {STRINGS.ONBOARDING.STAFF.BACK_BTN}
        </button>
        <button 
          type="button"
          onClick={() => router.push('/onboarding/hours')}
          className="px-6 py-2 rounded-lg bg-[#0066FF] text-white text-sm font-medium hover:bg-[#0052cc] transition-colors shadow-sm"
        >
          {STRINGS.ONBOARDING.STAFF.CONTINUE_BTN}
        </button>
      </div>
    </div>
  );
}
