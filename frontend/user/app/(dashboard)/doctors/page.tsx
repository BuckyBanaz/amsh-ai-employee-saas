"use client";
import React from 'react';
import { DoctorsHeader } from '../../../components/dashboard/DoctorsHeader';
import { StaffCard, StaffCardProps } from '../../../components/dashboard/StaffCard';

const staffMembers: StaffCardProps[] = [
  {
    initials: 'SW',
    name: 'Dr. Sarah Wilson',
    specialty: 'General Dentistry',
    role: 'DOCTOR',
    status: 'Available',
    weeklySchedule: '12 appointments',
    rating: '4.9',
    contact: 'sarah@smileclinic.com',
    services: ['Consultation', 'Root Canal'],
  },
  {
    initials: 'JM',
    name: 'Dr. John Miller',
    specialty: 'Orthodontics Specialist',
    role: 'DOCTOR',
    status: 'Available',
    weeklySchedule: '10 appointments',
    rating: '4.8',
    contact: 'john@smileclinic.com',
    services: ['Dental Cleaning', 'Dental X-Ray'],
  },
  {
    initials: 'EC',
    name: 'Dr. Emily Carter',
    specialty: 'Cosmetic Dentistry',
    role: 'DOCTOR',
    status: 'On Leave',
    weeklySchedule: '0 appointments',
    rating: '4.9',
    contact: 'emily@smileclinic.com',
    services: ['Teeth Whitening', 'Consultation'],
  },
  {
    initials: 'LP',
    name: 'Lisa Park',
    specialty: 'Front Desk Coordinator',
    role: 'RECEPTIONIST',
    status: 'Available',
    weeklySchedule: '0 appointments',
    rating: '4.7',
    contact: 'lisa@smileclinic.com',
    services: ['Appointment Booking', 'Patient Onboarding'],
  },
];

export default function DoctorsPage() {
  return (
    <div className="animate-in fade-in duration-500 pt-6 pb-12">
      <DoctorsHeader />
      
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
        {staffMembers.map((staff, idx) => (
          <StaffCard key={idx} {...staff} />
        ))}
      </div>
    </div>
  );
}
