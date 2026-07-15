import { redirect } from "next/navigation";

import { listSessionsEnsuringDefault } from "@/lib/actions/sessions";

/**
 * Session ids are database uuids, so nothing can link to a known dashboard url.
 * This is the stable entry point: land here and get sent to your first session.
 */
export default async function DashboardIndexPage(): Promise<never> {
  const sessions = await listSessionsEnsuringDefault();
  redirect(`/dashboard/${sessions[0].id}`);
}
