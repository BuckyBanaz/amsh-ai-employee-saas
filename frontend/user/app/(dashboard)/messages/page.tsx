"use client";
import React from 'react';
import { MessagesWorkspace } from '../../../components/dashboard/messages/MessagesWorkspace';

export default function MessagesPage() {
  return (
    <div className="flex-1 overflow-y-auto scrollbar-hide p-4 sm:p-6 animate-in fade-in duration-500">
      <header className="mb-4">
        <h1 className="text-lg font-bold tracking-tight text-gray-900">Messages</h1>
        <p className="mt-0.5 text-xs text-gray-500">The SMS and email messages your AI receptionist and clinic send to patients and staff: wording, channel order and quiet hours.</p>
      </header>
      <MessagesWorkspace />
    </div>
  );
}
