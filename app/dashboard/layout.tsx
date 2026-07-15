import { headers } from "next/headers";
import { redirect } from "next/navigation";

import DashboardBreadcrumb from "@/components/ui/dashboard-breadcrumb";
import DashboardSidebar from "@/components/ui/dashboard-sidebar";
import {
  SidebarInset,
  SidebarProvider,
  SidebarTrigger,
} from "@/components/ui/sidebar";
import { SessionProvider } from "@/contexts/session-context";
import { listSessionsEnsuringDefault } from "@/lib/actions/sessions";
import { auth } from "@/lib/auth";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}): Promise<React.JSX.Element> {
  const session = await auth.api.getSession({ headers: await headers() });

  if (!session) {
    redirect("/");
  }
  // Must precede the session fetch, which sends a pending user to /unauthorized.
  if (session.user.role === "pending") {
    redirect("/pending-approval");
  }

  const sessions = await listSessionsEnsuringDefault();

  return (
    <SessionProvider sessions={sessions}>
      <SidebarProvider>
        <DashboardSidebar />
        <SidebarInset>
          <header className="flex h-14 shrink-0 items-center gap-2 border-b px-4">
            <SidebarTrigger />
            <DashboardBreadcrumb />
          </header>
          <div className="flex flex-1 flex-col gap-4 p-4">{children}</div>
        </SidebarInset>
      </SidebarProvider>
    </SessionProvider>
  );
}
