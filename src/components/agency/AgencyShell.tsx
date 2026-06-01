import { useEffect, useState } from "react";
import { Outlet } from "react-router-dom";

import { AgencyChatDock } from "@/components/agency/AgencyChatDock";
import { AgencySidebar } from "@/components/agency/AgencySidebar";
import { AgencyTopbar } from "@/components/agency/AgencyTopbar";
import { InternalChatSocketProvider } from "@/context/internal-chat-socket-context";
import { getCurrentOrganizationId } from "@/lib/agencyAuth";

const CHAT_OPEN_STORAGE_KEY = "mudhro_agency_chat_open";
const SIDEBAR_COLLAPSE_STORAGE_KEY = "mudhro_agency_sidebar_collapsed";

export function AgencyShell() {
  const orgId = getCurrentOrganizationId();

  const [sidebarCollapsed, setSidebarCollapsed] = useState<boolean>(() => localStorage.getItem(SIDEBAR_COLLAPSE_STORAGE_KEY) === "true");
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);
  const [chatOpen, setChatOpen] = useState<boolean>(() => localStorage.getItem(CHAT_OPEN_STORAGE_KEY) === "true");

  useEffect(() => {
    localStorage.setItem(SIDEBAR_COLLAPSE_STORAGE_KEY, String(sidebarCollapsed));
  }, [sidebarCollapsed]);

  useEffect(() => {
    localStorage.setItem(CHAT_OPEN_STORAGE_KEY, String(chatOpen));
  }, [chatOpen]);

  return (
    <InternalChatSocketProvider orgId={orgId}>
      <div className="min-h-dvh bg-background">
        <div className="flex min-h-dvh">
          <AgencySidebar collapsed={sidebarCollapsed} mobileOpen={mobileSidebarOpen} onCloseMobile={() => setMobileSidebarOpen(false)} />

          <div className="flex min-w-0 flex-1 flex-col">
            <AgencyTopbar onOpenMobileMenu={() => setMobileSidebarOpen(true)} onToggleCollapse={() => setSidebarCollapsed((prev) => !prev)} />

            <main className="flex-1 p-4 sm:p-6">
              <Outlet />
            </main>
          </div>
        </div>

        <AgencyChatDock isOpen={chatOpen} onToggle={() => setChatOpen((prev) => !prev)} />
      </div>
    </InternalChatSocketProvider>
  );
}
