"use client";

import { useState } from "react";
import {
  SidebarMenuAction,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from "./sidebar";
import { MoreVertical } from "lucide-react";
import type { ActionResult } from "@/lib/actions/sessions";
import type { Session } from "@/lib/types/document";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "./dropdown-menu";
import RenameDialog from "./rename-dialog";

interface SessionButtonProps {
  session: Session;
  currentSession: Session;
  setCurrentSession: (session: Session) => void;
  onRenameSession: (sessionId: string, title: string) => Promise<ActionResult>;
  onDeleteSession: (sessionId: string) => void;
  canDelete: boolean;
}

export default function SessionButton({
  session,
  currentSession,
  setCurrentSession,
  onRenameSession,
  onDeleteSession,
  canDelete,
}: SessionButtonProps): React.JSX.Element {
  const { isMobile } = useSidebar();
  const [renameOpen, setRenameOpen] = useState(false);

  return (
    <SidebarMenuItem>
      <SidebarMenuButton
        isActive={currentSession.id === session.id}
        onClick={() => setCurrentSession(session)}
      >
        <span>{session.title}</span>
      </SidebarMenuButton>
      <DropdownMenu>
        <DropdownMenuTrigger render={<SidebarMenuAction showOnHover />}>
          <MoreVertical />
          <span className="sr-only">Session options</span>
        </DropdownMenuTrigger>
        <DropdownMenuContent
          side={isMobile ? "bottom" : "right"}
          align={isMobile ? "end" : "start"}
        >
          <DropdownMenuItem onClick={() => setRenameOpen(true)}>
            <span>Rename</span>
          </DropdownMenuItem>
          <DropdownMenuItem
            variant="destructive"
            disabled={!canDelete}
            onClick={() => onDeleteSession(session.id)}
          >
            <span>Delete</span>
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
      <RenameDialog
        open={renameOpen}
        onOpenChange={setRenameOpen}
        session={session}
        onRename={(title) => onRenameSession(session.id, title)}
      />
    </SidebarMenuItem>
  );
}
