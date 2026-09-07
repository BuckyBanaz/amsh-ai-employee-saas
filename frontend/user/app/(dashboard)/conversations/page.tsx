"use client";
import React from 'react';
import { ConversationsHeader } from '../../../components/dashboard/ConversationsHeader';
import { ConversationsSidebar } from '../../../components/dashboard/ConversationsSidebar';
import { ConversationThread } from '../../../components/dashboard/ConversationThread';

export default function ConversationsPage() {
  return (
    <div className="animate-in fade-in duration-500 pt-4 pb-6 flex flex-col h-full w-full">
      <ConversationsHeader />
      
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 flex-1 min-h-[500px]">
        {/* Sidebar takes 4 columns on large screens */}
        <div className="lg:col-span-5 xl:col-span-4 h-full min-w-0">
          <ConversationsSidebar />
        </div>
        
        {/* Thread takes 8 columns on large screens */}
        <div className="lg:col-span-7 xl:col-span-8 h-full min-w-0">
          <ConversationThread />
        </div>
      </div>
    </div>
  );
}
