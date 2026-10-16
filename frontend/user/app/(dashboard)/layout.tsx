"use client";

import React, { useState } from 'react';
import { usePathname } from 'next/navigation';
import { Sidebar } from '../../components/dashboard/Sidebar';
import { StorageService } from '../../services/storage.service';
import { warmPreviewToken } from '../../services/voice_preview.service';
import { AnnouncementBanner } from '../../components/dashboard/AnnouncementBanner';
import { PolicyBanner } from '../../components/dashboard/PolicyBanner';
import { ASSET_BASE } from '../../utils/api_endpoints';

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const isConversationsPage = pathname?.includes('/conversations');
  const [mounted, setMounted] = useState(false);
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);
  const [businessName, setBusinessName] = useState<string>('');
  const [initials, setInitials] = useState<string>('');
  const [logo, setLogo] = useState<string | null>(null);

  React.useEffect(() => {
    setMounted(true);
    void warmPreviewToken(); // voice previews play from a URL, so they carry a short-lived token
    const refreshData = () => {
      const cachedB = StorageService.getBusiness();
      const localLogo = typeof window !== 'undefined' ? localStorage.getItem('business_logo') : null;
      if (cachedB?.name) setBusinessName(cachedB.name);
      if (cachedB?.logo_url || localLogo) {
        const raw = cachedB?.logo_url || localLogo;
        setLogo(raw?.startsWith('http') || raw?.startsWith('data:') ? raw : `${ASSET_BASE}${raw}`);
      }

      const cachedU = StorageService.getUser();
      if (cachedU) {
        const name = cachedU.full_name || cachedU.name || cachedU.email?.split('@')[0] || '';
        setInitials(name.slice(0, 2).toUpperCase() || 'BO');
      }
    };

    refreshData();
    window.addEventListener('business_updated', refreshData);
    return () => {
      window.removeEventListener('business_updated', refreshData);
    };
  }, []);

  return (
    <div className="flex h-screen bg-[#F9FAFB] font-sans antialiased text-gray-900 overflow-hidden">
      {/* Responsive Sidebar (Persistent on Desktop, Drawer on Mobile/Tablet) */}
      <Sidebar
        mobileOpen={mobileSidebarOpen}
        onMobileClose={() => setMobileSidebarOpen(false)}
      />

      <div className="flex-1 flex flex-col h-full min-h-0 overflow-hidden min-w-0">
        {/* Mobile & Tablet Top Bar (Visible only on < lg screens) */}
        <header className="lg:hidden flex items-center justify-between px-4 py-2.5 bg-white border-b border-gray-100 shadow-2xs flex-shrink-0 z-30">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setMobileSidebarOpen(true)}
              className="p-1.5 -ml-1 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors focus:outline-none"
              aria-label="Open sidebar menu"
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                <line x1="3" y1="12" x2="21" y2="12"></line>
                <line x1="3" y1="6" x2="21" y2="6"></line>
                <line x1="3" y1="18" x2="21" y2="18"></line>
              </svg>
            </button>

            <div className="flex items-center gap-2">
              <div className="w-6 h-6 bg-[#0066FF] rounded-md flex items-center justify-center">
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round">
                  <path d="M12 4v16m-4-10v4m8-8v12" />
                </svg>
              </div>
              <span className="text-sm font-bold text-gray-900 tracking-tight">Amsh</span>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {!mounted || !businessName ? (
              <span className="inline-block w-20 h-3.5 bg-gray-200 animate-pulse rounded" />
            ) : (
              <span className="text-xs font-semibold text-gray-600 truncate max-w-[120px] sm:max-w-[180px]">
                {businessName}
              </span>
            )}
            {mounted && logo ? (
              <img src={logo} alt="Logo" className="w-7 h-7 rounded-full object-cover border border-gray-200" />
            ) : (
              <div className="w-7 h-7 rounded-full bg-[#E0E7FF] text-[#0066FF] flex items-center justify-center text-xs font-bold">
                {initials || 'A'}
              </div>
            )}
          </div>
        </header>

        {/* Main Content Area */}
        <main className={`flex-1 flex flex-col min-h-0 ${isConversationsPage ? 'overflow-hidden' : 'overflow-y-auto'}`}>
          <PolicyBanner />
          <AnnouncementBanner />
          <div className={`w-full px-3.5 sm:px-6 lg:px-8 flex-1 flex flex-col max-w-[1600px] mx-auto min-w-0 min-h-0 ${
            isConversationsPage ? 'pt-2 pb-2 h-full overflow-hidden' : 'py-3 pb-10'
          }`}>
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}
