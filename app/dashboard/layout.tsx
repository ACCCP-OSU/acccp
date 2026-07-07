import DashboardBreadcrumb from "@/components/ui/dashboard-breadcrumb";
import DashboardSidebar from "@/components/ui/dashboard-sidebar";
import {
  SidebarInset,
  SidebarProvider,
  SidebarTrigger,
} from "@/components/ui/sidebar";
import { SessionProvider } from "@/contexts/session-context";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}): React.JSX.Element {
  return (
    <SessionProvider>
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
