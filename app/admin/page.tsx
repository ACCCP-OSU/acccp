import AdminMetrics from "@/components/ui/admin-metrics";
import PendingUsersTable from "@/components/ui/pending-users-table";
import { listPendingUsersPage } from "@/lib/actions/admin-metrics";
import { verifyRoleOrRedirect } from "@/lib/auth";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

function parsePage(value: string | string[] | undefined): number {
  const raw = Array.isArray(value) ? value[0] : value;
  const parsed = raw ? Number.parseInt(raw, 10) : 1;
  return Number.isFinite(parsed) && parsed > 0 ? parsed : 1;
}

interface AdminPageProps {
  searchParams: Promise<{ usersPage?: string; jobsPage?: string }>;
}

export default async function AdminPage({
  searchParams,
}: AdminPageProps): Promise<React.JSX.Element> {
  await verifyRoleOrRedirect(["admin"]);

  const params = await searchParams;
  const usersPage = parsePage(params.usersPage);
  const jobsPage = parsePage(params.jobsPage);

  const pendingUsers = await listPendingUsersPage(usersPage);

  // Pagination is URL-driven (?usersPage=/?jobsPage=), which reloads the page
  // and would otherwise always reset the Tabs to the first tab. Seed the
  // uncontrolled Tabs' initial tab from whichever page param is present so
  // paginating the Metrics table doesn't kick the admin back to Users.
  const defaultTab = params.jobsPage ? "metrics" : "users";

  return (
    <main className="flex min-h-full items-center justify-center py-12">
      <Tabs defaultValue={defaultTab}>
        <TabsList>
          <TabsTrigger value="users">Users</TabsTrigger>
          <TabsTrigger value="metrics">Metrics</TabsTrigger>
        </TabsList>
        <TabsContent value="users">
          <PendingUsersTable
            key={pendingUsers.page}
            users={pendingUsers.rows}
            page={pendingUsers.page}
            totalPages={pendingUsers.totalPages}
          />
        </TabsContent>
        <TabsContent value="metrics">
          <AdminMetrics jobsPage={jobsPage} />
        </TabsContent>
      </Tabs>
    </main>
  );
}
