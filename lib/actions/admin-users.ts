"use server";

import { revalidatePath } from "next/cache";
import { eq } from "drizzle-orm";

import { verifyRoleOrRedirect } from "@/lib/auth";
import { db } from "@/lib/db";
import { users } from "@/lib/db/schema";

export async function approveUser(userId: string): Promise<void> {
  await verifyRoleOrRedirect(["admin"]);
  await db
    .update(users)
    .set({ role: "instructor" })
    .where(eq(users.id, userId));
  revalidatePath("/admin");
}

export async function rejectUser(userId: string): Promise<void> {
  await verifyRoleOrRedirect(["admin"]);
  await db.delete(users).where(eq(users.id, userId));
  // TODO: Email user letting them know they've been rejected.
  revalidatePath("/admin");
}
