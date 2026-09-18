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
  const [isAdding, setIsAdding] = useState(false);
  const [newStaff, setNewStaff] = useState<{name: string, role: string, specialty: string, email: string, phone: string, treatments: string[]}>({ name: '', role: 'Doctor', specialty: '', email: '', phone: '', treatments: [] });

  const mockServices = ['Dental Consultation', 'Dental Cleaning', 'Teeth Whitening', 'Root Canal'];

  const handleAddStaff = () => {
    if (!newStaff.name) return;
    const initials = newStaff.name.split(' ').map(n => n[0]).join('').substring(0, 3).toUpperCase();
    setStaffList([...staffList, { ...newStaff, initials, id: Date.now() }]);
    setNewStaff({ name: '', role: 'Doctor', specialty: '', email: '', phone: '', treatments: [] });
    setIsAdding(false);
  };

  const toggleTreatment = (treatment: string) => {
    if (newStaff.treatments.includes(treatment)) {
      setNewStaff({ ...newStaff, treatments: newStaff.treatments.filter(t => t !== treatment) });
    } else {
      setNewStaff({ ...newStaff, treatments: [...newStaff.treatments, treatment] });
    }
  };

  return (
    <div className="w-full max-w-4xl bg-white rounded-2xl shadow-sm border border-gray-100 p-8 sm:p-12">
      <div className="mb-10">
        <h1 className="text-3xl font-bold text-gray-900 tracking-tight mb-3">{STRINGS.ONBOARDING.STAFF.TITLE}</h1>
        <p className="text-gray-500 leading-relaxed">
          {STRINGS.ONBOARDING.STAFF.SUBTITLE}
        </p>
      </div>

      <div className="space-y-4 mb-8">
        {staffList.map((staff) => (
          <div key={staff.id} className="border border-gray-200 rounded-xl p-6 hover:border-gray-300 transition-colors bg-white">
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-4">
                {/* Avatar */}
                <div className="w-12 h-12 rounded-full bg-[#F0F7FF] flex items-center justify-center text-sm font-bold text-[#0066FF] shrink-0">
                  {staff.initials}
                </div>
                
                {/* Info */}
                <div>
                  <div className="flex items-center gap-2 mb-0.5">
                    <h3 className="text-base font-bold text-gray-900">{staff.name}</h3>
                    <span className="bg-[#F0F7FF] text-[#0066FF] text-[11px] font-semibold px-2 py-0.5 rounded">
                      {staff.role}
                    </span>
                  </div>
                  <p className="text-sm text-gray-500">{staff.specialty}</p>
                </div>
              </div>

              {/* Edit Button */}
              <button className="p-2 text-gray-400 hover:text-[#0066FF] hover:bg-blue-50 rounded-lg transition-colors">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path>
                  <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path>
                </svg>
              </button>
            </div>

            <div className="h-px bg-gray-100 w-full my-5"></div>

            <div className="flex flex-col md:flex-row md:items-start gap-6 md:gap-12">
              {/* Contact Info */}
              <div className="space-y-2">
                <div className="flex items-center gap-2 text-sm text-gray-500">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"></path>
                    <polyline points="22,6 12,13 2,6"></polyline>
                  </svg>
                  <span>{staff.email}</span>
                </div>
                <div className="flex items-center gap-2 text-sm text-gray-500">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"></path>
                  </svg>
                  <span>{staff.phone}</span>
                </div>
              </div>

              {/* Treatments */}
              <div>
                <p className="text-xs font-semibold text-gray-900 uppercase tracking-wide mb-2">{STRINGS.ONBOARDING.STAFF.ASSIGNED_TREATMENTS}</p>
                <div className="flex flex-wrap gap-2">
                  {staff.treatments.map((treatment, idx) => (
                    <span key={idx} className="bg-gray-50 text-gray-700 border border-gray-200 text-[11px] font-medium px-2.5 py-1 rounded-md">
                      {treatment}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          </div>
        ))}

        {isAdding ? (
          <div className="border-2 border-[#0066FF] rounded-xl p-5 bg-blue-50/30">
            <h3 className="text-sm font-bold text-gray-900 mb-4">Add Team Member</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
              <div>
                <label className="text-xs font-semibold text-gray-700 mb-1 block">Full Name</label>
                <input 
                  type="text" 
                  value={newStaff.name}
                  onChange={(e) => setNewStaff({...newStaff, name: e.target.value})}
                  placeholder="e.g. Dr. Sarah Wilson"
                  className="w-full px-3 py-2 rounded-lg border border-gray-200 focus:outline-none focus:ring-2 focus:ring-[#0066FF] text-sm"
                  autoFocus
                />
              </div>
              <div>
                <label className="text-xs font-semibold text-gray-700 mb-1 block">Role</label>
                <select 
                  value={newStaff.role}
                  onChange={(e) => setNewStaff({...newStaff, role: e.target.value})}
                  className="w-full px-3 py-2 rounded-lg border border-gray-200 focus:outline-none focus:ring-2 focus:ring-[#0066FF] text-sm bg-white"
                >
                  <option>Doctor</option>
                  <option>Nurse</option>
                  <option>Hygienist</option>
                  <option>Specialist</option>
                </select>
              </div>
              <div>
                <label className="text-xs font-semibold text-gray-700 mb-1 block">Specialty</label>
                <input 
                  type="text" 
                  value={newStaff.specialty}
                  onChange={(e) => setNewStaff({...newStaff, specialty: e.target.value})}
                  placeholder="e.g. Orthodontics"
                  className="w-full px-3 py-2 rounded-lg border border-gray-200 focus:outline-none focus:ring-2 focus:ring-[#0066FF] text-sm"
                />
              </div>
              <div>
                <label className="text-xs font-semibold text-gray-700 mb-1 block">Phone</label>
                <input 
                  type="tel" 
                  value={newStaff.phone}
                  onChange={(e) => setNewStaff({...newStaff, phone: e.target.value})}
                  placeholder="+1 (555) 000-0000"
                  className="w-full px-3 py-2 rounded-lg border border-gray-200 focus:outline-none focus:ring-2 focus:ring-[#0066FF] text-sm"
                />
              </div>
              <div className="md:col-span-2">
                <label className="text-xs font-semibold text-gray-700 mb-1 block">Email</label>
                <input 
                  type="email" 
                  value={newStaff.email}
                  onChange={(e) => setNewStaff({...newStaff, email: e.target.value})}
                  placeholder="sarah@clinic.com"
                  className="w-full px-3 py-2 rounded-lg border border-gray-200 focus:outline-none focus:ring-2 focus:ring-[#0066FF] text-sm"
                />
              </div>
              <div className="md:col-span-2">
                <label className="text-xs font-semibold text-gray-700 mb-2 block">Assign Treatments</label>
                <div className="flex flex-wrap gap-2">
                  {mockServices.map((treatment) => {
                    const isSelected = newStaff.treatments.includes(treatment);
                    return (
                      <button
                        key={treatment}
                        type="button"
                        onClick={() => toggleTreatment(treatment)}
                        className={`text-xs font-medium px-3 py-1.5 rounded-full border transition-colors ${
                          isSelected 
                            ? 'bg-[#0066FF] text-white border-[#0066FF]' 
                            : 'bg-white text-gray-600 border-gray-200 hover:border-[#0066FF] hover:text-[#0066FF]'
                        }`}
                      >
                        {treatment}
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
            <div className="flex justify-end gap-2">
              <button 
                onClick={() => setIsAdding(false)}
                className="px-4 py-2 text-sm font-medium text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors"
              >
                Cancel
              </button>
              <button 
                onClick={handleAddStaff}
                disabled={!newStaff.name}
                className="px-4 py-2 text-sm font-medium text-white bg-[#0066FF] hover:bg-[#0052cc] rounded-lg transition-colors disabled:opacity-50"
              >
                Save Member
              </button>
            </div>
          </div>
        ) : (
          <button 
            type="button" 
            onClick={() => setIsAdding(true)}
            className="w-full border-2 border-dashed border-gray-200 rounded-xl bg-[#FAFAFB] p-8 flex flex-col items-center justify-center hover:bg-gray-50 hover:border-[#0066FF] transition-colors group"
          >
            <div className="w-10 h-10 mb-3 bg-[#F0F7FF] rounded-full flex items-center justify-center group-hover:scale-110 transition-transform">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#0066FF" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <line x1="12" y1="5" x2="12" y2="19"></line>
                <line x1="5" y1="12" x2="19" y2="12"></line>
              </svg>
            </div>
            <p className="text-sm font-semibold text-[#0066FF]">{STRINGS.ONBOARDING.STAFF.ADD_TEAM_MEMBER}</p>
            <p className="text-xs text-gray-500 mt-1">{STRINGS.ONBOARDING.STAFF.ADD_TEAM_MEMBER_SUBTITLE}</p>
          </button>
        )}
      </div>

      {/* Footer Buttons */}
      <div className="pt-6 border-t border-gray-100 flex items-center justify-between">
        <button 
          type="button"
          onClick={() => router.push('/onboarding/services')}
          className="px-6 py-2.5 rounded-lg border border-gray-200 text-gray-700 font-medium hover:bg-gray-50 transition-colors shadow-sm"
        >
          {STRINGS.ONBOARDING.STAFF.BACK_BTN}
        </button>
        <button 
          type="button"
          onClick={() => router.push('/onboarding/hours')}
          className="px-8 py-2.5 rounded-lg bg-[#0066FF] text-white font-medium hover:bg-[#0052cc] transition-colors shadow-sm"
        >
          {STRINGS.ONBOARDING.STAFF.CONTINUE_BTN}
        </button>
      </div>
    </div>
  );
}
