"use server";

import { revalidatePath } from "next/cache";
import { and, asc, eq, isNull } from "drizzle-orm";

import { verifyRoleOrRedirect } from "@/lib/auth";
import { db } from "@/lib/db";
import { isUniqueViolation } from "@/lib/db/errors";
import { sessions } from "@/lib/db/schema";
import type { Session } from "@/lib/types/document";

export type ActionResult<T = undefined> =
  | { ok: true; data: T }
  | { ok: false; error: string };

const DEFAULT_SESSION_TITLE = "Session 1";

// RLS is enabled on `sessions` but no policies exist, so the database will not
// filter by owner. Every query here must constrain owner_user_id itself.
async function requireUserId(): Promise<string> {
  const session = await verifyRoleOrRedirect(["instructor", "admin"]);
  return session.user.id;
}

function selectActiveSessions(userId: string): Promise<Session[]> {
  return db
    .select({ id: sessions.id, title: sessions.title })
    .from(sessions)
    .where(and(eq(sessions.ownerUserId, userId), isNull(sessions.archivedAt)))
    .orderBy(asc(sessions.createdAt));
}

/**
 * `uq_active_session_title_per_user` rejects a duplicate case-insensitive title
 * among a user's active sessions, so derive the suffix from the highest existing
 * "Session N" rather than the session count, which repeats after an archive.
 */
function nextSessionTitle(existing: Session[]): string {
  let highest = 0;
  for (const session of existing) {
    const match = /^session (\d+)$/i.exec(session.title.trim());
    if (match) highest = Math.max(highest, Number(match[1]));
  }
  return `Session ${highest + 1}`;
}

export async function listSessions(): Promise<Session[]> {
  return selectActiveSessions(await requireUserId());
}

/**
 * The dashboard assumes at least one session exists (it resolves the current
 * session to sessions[0] and blocks deleting the last one), but a new user owns
 * none. Provision a default so that invariant holds on first visit.
 */
export async function listSessionsEnsuringDefault(): Promise<Session[]> {
  const userId = await requireUserId();

  const existing = await selectActiveSessions(userId);
  if (existing.length > 0) return existing;

  // Concurrent first requests race here; the unique index picks one winner.
  await db
    .insert(sessions)
    .values({ ownerUserId: userId, title: DEFAULT_SESSION_TITLE })
    .onConflictDoNothing();

  return selectActiveSessions(userId);
}

export async function createSession(): Promise<ActionResult<Session>> {
  const userId = await requireUserId();

  // Retry rather than fail when a concurrent create takes the title first.
  for (let attempt = 0; attempt < 3; attempt++) {
    const title = nextSessionTitle(await selectActiveSessions(userId));
    try {
      const [created] = await db
        .insert(sessions)
        .values({ ownerUserId: userId, title })
        .returning({ id: sessions.id, title: sessions.title });

      revalidatePath("/dashboard", "layout");
      return { ok: true, data: created };
    } catch (error) {
      if (!isUniqueViolation(error)) throw error;
    }
  }

  return { ok: false, error: "Could not create a session. Please try again." };
}

export async function renameSession(
  sessionId: string,
  title: string
): Promise<ActionResult> {
  const userId = await requireUserId();

  // Mirrors the sessions_title_not_blank_chk constraint.
  const trimmed = title.trim();
  if (!trimmed) return { ok: false, error: "Session name cannot be empty." };

  try {
    const updated = await db
      .update(sessions)
      .set({ title: trimmed, updatedAt: new Date().toISOString() })
      .where(
        and(
          eq(sessions.id, sessionId),
          eq(sessions.ownerUserId, userId),
          isNull(sessions.archivedAt)
        )
      )
      .returning({ id: sessions.id });

    if (updated.length === 0) return { ok: false, error: "Session not found." };
  } catch (error) {
    if (isUniqueViolation(error)) {
      return {
        ok: false,
        error: `You already have a session named "${trimmed}".`,
      };
    }
    throw error;
  }

  revalidatePath("/dashboard", "layout");
  return { ok: true, data: undefined };
}

/**
 * Archives rather than deletes: `documents` cascades from `sessions`, so a hard
 * delete would take the user's uploads with it.
 */
export async function archiveSession(sessionId: string): Promise<ActionResult> {
  const userId = await requireUserId();

  const active = await selectActiveSessions(userId);
  if (active.length <= 1) {
    return { ok: false, error: "You must keep at least one session." };
  }

  const archived = await db
    .update(sessions)
    .set({
      archivedAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    })
    .where(
      and(
        eq(sessions.id, sessionId),
        eq(sessions.ownerUserId, userId),
        isNull(sessions.archivedAt)
      )
    )
    .returning({ id: sessions.id });

  if (archived.length === 0) return { ok: false, error: "Session not found." };

  revalidatePath("/dashboard", "layout");
  return { ok: true, data: undefined };
}
