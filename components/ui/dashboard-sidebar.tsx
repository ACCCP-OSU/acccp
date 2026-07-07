"use client";

import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar";
import { useSession } from "@/contexts/session-context";
import { LucideSquarePlus } from "lucide-react";
import SessionButton from "./session-button";

export default function DashboardSidebar(): React.JSX.Element {
  const {
    sessions,
    currentSession,
    addSession,
    selectSession,
    renameSession,
    deleteSession,
  } = useSession();

  return (
    <Sidebar>
      <SidebarHeader>
        <div className="flex items-center gap-2 font-bold">
          <span className="bg-sidebar-primary text-primary-foreground p-1 rounded-md select-none">O</span>
          <span>ACCCP</span>
        </div>
        <SidebarGroup>
          <SidebarGroupLabel>
            <span>Sessions</span>
          </SidebarGroupLabel>
          <SidebarMenu>
            <SidebarMenuItem>
              <SidebarMenuButton onClick={addSession}>
                <LucideSquarePlus />
                <span>New Session</span>
              </SidebarMenuButton>
            </SidebarMenuItem>
            {sessions.map((session) => (
              <SessionButton
                key={session.id}
                session={session}
                currentSession={currentSession}
                setCurrentSession={selectSession}
                onRenameSession={renameSession}
                onDeleteSession={deleteSession}
                canDelete={sessions.length > 1}
              />
            ))}
          </SidebarMenu>
        </SidebarGroup>
      </SidebarHeader>
      <SidebarContent />
      <SidebarFooter />
    </Sidebar>
  );
}
