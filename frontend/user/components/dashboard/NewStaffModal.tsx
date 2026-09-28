"use client";
import React, { useState, useEffect } from 'react';
import { ServiceItem } from '../../controllers/dashboard.controller';

export interface StaffFormData {
  id?: string;
  name: string;
  role: string;
  specialty?: string;
  email?: string;
  phone?: string;
  service_ids?: string[];
}

interface NewStaffModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (payload: StaffFormData) => Promise<void>;
  onDelete?: (staffId: string) => Promise<void>;
  initialData?: StaffFormData | null;
  availableServices?: ServiceItem[];
}

export function NewStaffModal({
  isOpen,
  onClose,
  onSubmit,
  onDelete,
  initialData,
  availableServices = [],
}: NewStaffModalProps) {
  const isEditing = Boolean(initialData?.id);
  const [name, setName] = useState('');
  const [role, setRole] = useState('Doctor');
  const [specialty, setSpecialty] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [selectedServiceIds, setSelectedServiceIds] = useState<string[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Sync state when modal opens or initialData changes
  useEffect(() => {
    if (isOpen) {
      if (initialData) {
        setName(initialData.name || '');
        setRole(initialData.role || 'Doctor');
        setSpecialty(initialData.specialty || '');
        setEmail(initialData.email || '');
        setPhone(initialData.phone || '');
        setSelectedServiceIds(initialData.service_ids || []);
      } else {
        setName('');
        setRole('Doctor');
        setSpecialty('');
        setEmail('');
        setPhone('');
        setSelectedServiceIds([]);
      }
      setError(null);
    }
  }, [isOpen, initialData]);

  if (!isOpen) return null;

  const toggleService = (serviceId: string) => {
    setSelectedServiceIds((prev) =>
      prev.includes(serviceId) ? prev.filter((id) => id !== serviceId) : [...prev, serviceId]
    );
  };

  const selectAllServices = () => {
    setSelectedServiceIds(availableServices.map((s) => s.id));
  };

  const clearAllServices = () => {
    setSelectedServiceIds([]);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setError('Please provide staff / doctor name.');
      return;
    }

    try {
      setIsSubmitting(true);
      setError(null);
      await onSubmit({
        id: initialData?.id,
        name: name.trim(),
        role: role,
        specialty: specialty.trim() || 'General Practice',
        email: email.trim() || undefined,
        phone: phone.trim() || undefined,
        service_ids: selectedServiceIds,
      });
      onClose();
    } catch (err: any) {
      setError(err?.message || 'Failed to save staff member');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (!initialData?.id || !onDelete) return;
    if (!window.confirm(`Are you sure you want to remove ${initialData.name} from the staff directory?`)) {
      return;
    }
    try {
      setIsDeleting(true);
      setError(null);
      await onDelete(initialData.id);
      onClose();
    } catch (err: any) {
      setError(err?.message || 'Failed to delete staff member');
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/45 backdrop-blur-xs p-4 animate-in fade-in duration-200">
      <div
        className="bg-white rounded-2xl shadow-2xl border border-gray-100 w-full max-w-lg overflow-hidden max-h-[90vh] flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 bg-gray-50/70">
          <div>
            <h2 className="text-base font-bold text-gray-900">
              {isEditing ? 'Edit Doctor / Staff' : 'Add Doctor / Staff'}
            </h2>
            <p className="text-xs text-gray-500 mt-0.5">
              {isEditing
                ? 'Update member profile, role, and assigned clinical services'
                : 'Register staff member for AI appointment matching'}
            </p>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 p-1.5 rounded-lg hover:bg-gray-100 transition-colors cursor-pointer"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="18" y1="6" x2="6" y2="18"></line>
              <line x1="6" y1="6" x2="18" y2="18"></line>
            </svg>
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4 overflow-y-auto flex-1">
          {error && (
            <div className="p-3 bg-red-50 border border-red-200 text-red-700 text-xs rounded-lg animate-shake">
              {error}
            </div>
          )}

          {/* Full Name */}
          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-1">
              Full Name <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Dr. Sarah Wilson"
              className="w-full text-xs px-3 py-2 border border-gray-200 rounded-lg outline-none focus:border-[#0066FF] focus:ring-1 focus:ring-[#0066FF] transition-colors"
            />
          </div>

          {/* Role & Specialty */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1">Role</label>
              <select
                value={role}
                onChange={(e) => setRole(e.target.value)}
                className="w-full text-xs px-3 py-2 border border-gray-200 rounded-lg outline-none focus:border-[#0066FF] focus:ring-1 focus:ring-[#0066FF] bg-white transition-colors"
              >
                <option value="Doctor">Doctor / Specialist</option>
                <option value="Surgeon">Surgeon</option>
                <option value="Nurse">Nurse / Practitioner</option>
                <option value="Receptionist">Receptionist / Front Desk</option>
                <option value="Therapist">Therapist</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1">Specialty / Department</label>
              <input
                type="text"
                value={specialty}
                onChange={(e) => setSpecialty(e.target.value)}
                placeholder="e.g. Orthodontics, Cardiology"
                className="w-full text-xs px-3 py-2 border border-gray-200 rounded-lg outline-none focus:border-[#0066FF] focus:ring-1 focus:ring-[#0066FF] transition-colors"
              />
            </div>
          </div>

          {/* Contact: Phone & Email */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1">Phone Number</label>
              <input
                type="text"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="e.g. +91 98765 43210"
                className="w-full text-xs px-3 py-2 border border-gray-200 rounded-lg outline-none focus:border-[#0066FF] focus:ring-1 focus:ring-[#0066FF] font-mono transition-colors"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1">Email Address</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="e.g. doctor@clinic.com"
                className="w-full text-xs px-3 py-2 border border-gray-200 rounded-lg outline-none focus:border-[#0066FF] focus:ring-1 focus:ring-[#0066FF] transition-colors"
              />
            </div>
          </div>

          {/* Assigned Services Selection */}
          <div className="pt-2 border-t border-gray-100">
            <div className="flex items-center justify-between mb-2">
              <div>
                <label className="block text-xs font-bold text-gray-800">
                  Assigned Services ({selectedServiceIds.length} selected)
                </label>
                <span className="text-[11px] text-gray-400">
                  Patients booking these services will be matched with this doctor.
                </span>
              </div>
              {availableServices.length > 0 && (
                <div className="flex items-center gap-2 text-[11px]">
                  <button
                    type="button"
                    onClick={selectAllServices}
                    className="text-[#0066FF] hover:underline font-semibold cursor-pointer"
                  >
                    Select All
                  </button>
                  <span className="text-gray-300">|</span>
                  <button
                    type="button"
                    onClick={clearAllServices}
                    className="text-gray-500 hover:underline font-semibold cursor-pointer"
                  >
                    Clear
                  </button>
                </div>
              )}
            </div>

            {availableServices.length === 0 ? (
              <div className="p-3 bg-gray-50 border border-gray-200 rounded-lg text-xs text-gray-500 text-center">
                No services created in clinic catalog yet. Go to Services tab to create treatments.
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-48 overflow-y-auto pr-1">
                {availableServices.map((service) => {
                  const isChecked = selectedServiceIds.includes(service.id);
                  return (
                    <div
                      key={service.id}
                      onClick={() => toggleService(service.id)}
                      className={`p-2.5 rounded-lg border text-xs flex items-center justify-between cursor-pointer transition-all select-none ${
                        isChecked
                          ? 'border-[#0066FF] bg-[#F0F7FF] text-[#0066FF] shadow-2xs'
                          : 'border-gray-200 bg-white text-gray-700 hover:border-gray-300'
                      }`}
                    >
                      <div className="flex items-center gap-2 min-w-0 flex-1">
                        <div
                          className={`w-4 h-4 rounded border flex items-center justify-center flex-shrink-0 transition-colors ${
                            isChecked
                              ? 'bg-[#0066FF] border-[#0066FF] text-white'
                              : 'border-gray-300 bg-white'
                          }`}
                        >
                          {isChecked && (
                            <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
                              <polyline points="20 6 9 17 4 12"></polyline>
                            </svg>
                          )}
                        </div>
                        <span className="font-semibold truncate">{service.title}</span>
                      </div>
                      {service.price_amount !== null && service.price_amount !== undefined && (
                        <span className="text-[10px] text-gray-400 font-mono ml-1 flex-shrink-0">
                          ₹{service.price_amount}
                        </span>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Footer Actions */}
          <div className="flex items-center justify-between pt-4 border-t border-gray-100">
            {isEditing && onDelete ? (
              <button
                type="button"
                onClick={handleDelete}
                disabled={isDeleting || isSubmitting}
                className="px-3 py-1.5 text-xs font-bold text-red-600 hover:bg-red-50 rounded-lg transition-colors cursor-pointer disabled:opacity-50"
              >
                {isDeleting ? 'Removing...' : 'Delete Staff'}
              </button>
            ) : (
              <div></div>
            )}

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={onClose}
                className="px-3.5 py-1.5 text-xs font-semibold text-gray-600 hover:bg-gray-100 rounded-lg transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isSubmitting || !name.trim()}
                className="px-4 py-1.5 bg-[#0066FF] text-white rounded-lg text-xs font-semibold hover:bg-[#0052cc] transition-colors shadow-2xs disabled:opacity-50 flex items-center gap-1.5 cursor-pointer"
              >
                {isSubmitting && <div className="w-3 h-3 border-2 border-white/20 border-t-white rounded-full animate-spin"></div>}
                <span>{isEditing ? 'Save Changes' : 'Add Member'}</span>
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}
