"use client";

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  type ReactNode,
} from "react";
import { useParams, useRouter } from "next/navigation";
import {
  archiveSession,
  createSession,
  renameSession as renameSessionAction,
  type ActionResult,
} from "@/lib/actions/sessions";
import type { Session } from "@/lib/types/document";

interface SessionContextValue {
  sessions: Session[];
  currentSession: Session;
  addSession: () => Promise<void>;
  selectSession: (session: Session) => void;
  renameSession: (sessionId: string, title: string) => Promise<ActionResult>;
  deleteSession: (sessionId: string) => Promise<void>;
}

const SessionContext = createContext<SessionContextValue | null>(null);

function resolveSession(sessions: Session[], paramId: string | undefined): Session {
  return sessions.find((s) => s.id === paramId) ?? sessions[0];
}

/**
 * `sessions` is server state owned by the dashboard layout. Every mutation here
 * goes through an action that revalidates that layout, so the refreshed prop is
 * the single source of truth — copying it into local state would only let the
 * two drift.
 *
 * Documents are deliberately not here: they belong to a single [id] route,
 * whereas this provider sits in the layout above it.
 */
export function SessionProvider({
  children,
  sessions,
}: {
  children: ReactNode;
  sessions: Session[];
}) {
  const router = useRouter();
  const params = useParams<{ id?: string }>();

  const currentSession = useMemo(
    () => resolveSession(sessions, params.id),
    [sessions, params.id],
  );

  const addSession = useCallback(async () => {
    const result = await createSession();
    if (!result.ok) return;

    router.push(`/dashboard/${result.data.id}`);
  }, [router]);

  const selectSession = useCallback(
    (session: Session) => {
      router.push(`/dashboard/${session.id}`);
    },
    [router],
  );

  const renameSession = useCallback(
    (sessionId: string, title: string): Promise<ActionResult> =>
      renameSessionAction(sessionId, title),
    [],
  );

  const deleteSession = useCallback(
    async (sessionId: string) => {
      const result = await archiveSession(sessionId);
      if (!result.ok) return;

      // The archived session is gone from the refreshed list, so the [id] route
      // would fall back to an arbitrary session; pick the neighbour explicitly.
      if (currentSession.id === sessionId) {
        const next = sessions.find((s) => s.id !== sessionId);
        if (next) router.push(`/dashboard/${next.id}`);
      }
    },
    [sessions, currentSession.id, router],
  );

  const value = useMemo(
    () => ({
      sessions,
      currentSession,
      addSession,
      selectSession,
      renameSession,
      deleteSession,
    }),
    [
      sessions,
      currentSession,
      addSession,
      selectSession,
      renameSession,
      deleteSession,
    ],
  );

  return (
    <SessionContext.Provider value={value}>{children}</SessionContext.Provider>
  );
}

export function useSession(): SessionContextValue {
  const context = useContext(SessionContext);
  if (!context) {
    throw new Error("useSession must be used within SessionProvider");
  }
  return context;
}

export type { Session };
