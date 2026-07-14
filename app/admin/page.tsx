import { eq } from "drizzle-orm";

import PendingUsersTable from "@/components/ui/pending-users-table";
import { verifyRoleOrRedirect } from "@/lib/auth";
import { db } from "@/lib/db";
import { users } from "@/lib/db/schema";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

export default async function AdminPage(): Promise<React.JSX.Element> {
  await verifyRoleOrRedirect(["admin"]);

  const pendingUsers = await db
    .select({
      id: users.id,
      email: users.email,
      displayName: users.displayName,
      createdAt: users.createdAt,
    })
    .from(users)
    .where(eq(users.role, "pending"))
    .orderBy(users.createdAt);

  return (
    <main className="flex min-h-full items-center justify-center">
      <Tabs>
        <TabsList>
          <TabsTrigger value="users">Users</TabsTrigger>
          <TabsTrigger value="metrics">Metrics</TabsTrigger>
        </TabsList>
        <TabsContent value="users">
          <PendingUsersTable users={pendingUsers} />
        </TabsContent>
        <TabsContent value="metrics">
          <div>TODO</div>
        </TabsContent>
      </Tabs>
    </main>
  );
}
