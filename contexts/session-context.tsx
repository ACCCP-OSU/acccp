"use client";

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { useParams, useRouter } from "next/navigation";
import {
  archiveSession,
  createSession,
  renameSession as renameSessionAction,
  type ActionResult,
} from "@/lib/actions/sessions";
import type { Session, UploadedDocument } from "@/lib/types/document";

interface SessionContextValue {
  sessions: Session[];
  currentSession: Session;
  documents: UploadedDocument[];
  addSession: () => Promise<void>;
  selectSession: (session: Session) => void;
  renameSession: (sessionId: string, title: string) => Promise<ActionResult>;
  deleteSession: (sessionId: string) => Promise<void>;
  addDocuments: (files: File[]) => void;
  toggleDocumentLock: (docId: string) => void;
  removeDocument: (docId: string) => void;
  updateDocument: (docId: string, patch: Partial<UploadedDocument>) => void;
}

const SessionContext = createContext<SessionContextValue | null>(null);

function filesToDocuments(files: File[]): UploadedDocument[] {
  return files.map((file) => ({
    id: crypto.randomUUID(),
    name: file.name,
    size: file.size,
    uploadedAt: new Date(),
    status: "idle" as const,
    locked: false,
  }));
}

function resolveSession(sessions: Session[], paramId: string | undefined): Session {
  return sessions.find((s) => s.id === paramId) ?? sessions[0];
}

/**
 * `sessions` is server state owned by the dashboard layout. Every mutation here
 * goes through an action that revalidates that layout, so the refreshed prop is
 * the single source of truth — copying it into local state would only let the
 * two drift.
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

  // Documents are still client-only; persisting them is the next piece of work.
  const [documentsBySessionId, setDocumentsBySessionId] = useState<
    Record<string, UploadedDocument[]>
  >({});

  const currentSession = useMemo(
    () => resolveSession(sessions, params.id),
    [sessions, params.id],
  );

  const documents = useMemo(
    () => documentsBySessionId[currentSession.id] ?? [],
    [documentsBySessionId, currentSession.id],
  );

  const updateDocumentsForSession = useCallback(
    (sessionId: string, updater: (docs: UploadedDocument[]) => UploadedDocument[]) => {
      setDocumentsBySessionId((prev) => ({
        ...prev,
        [sessionId]: updater(prev[sessionId] ?? []),
      }));
    },
    [],
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

      setDocumentsBySessionId((docs) => {
        const nextDocs = { ...docs };
        delete nextDocs[sessionId];
        return nextDocs;
      });

      // The archived session is gone from the refreshed list, so the [id] route
      // would fall back to an arbitrary session; pick the neighbour explicitly.
      if (currentSession.id === sessionId) {
        const next = sessions.find((s) => s.id !== sessionId);
        if (next) router.push(`/dashboard/${next.id}`);
      }
    },
    [sessions, currentSession.id, router],
  );

  const addDocuments = useCallback(
    (files: File[]) => {
      if (files.length === 0) return;
      updateDocumentsForSession(currentSession.id, (docs) => [
        ...docs,
        ...filesToDocuments(files),
      ]);
    },
    [currentSession.id, updateDocumentsForSession],
  );

  const toggleDocumentLock = useCallback(
    (docId: string) => {
      updateDocumentsForSession(currentSession.id, (docs) =>
        docs.map((doc) =>
          doc.id === docId ? { ...doc, locked: !doc.locked } : doc,
        ),
      );
    },
    [currentSession.id, updateDocumentsForSession],
  );

  const removeDocument = useCallback(
    (docId: string) => {
      updateDocumentsForSession(currentSession.id, (docs) =>
        docs.filter((doc) => doc.id !== docId),
      );
    },
    [currentSession.id, updateDocumentsForSession],
  );

  const updateDocument = useCallback(
    (docId: string, patch: Partial<UploadedDocument>) => {
      updateDocumentsForSession(currentSession.id, (docs) =>
        docs.map((doc) => (doc.id === docId ? { ...doc, ...patch } : doc)),
      );
    },
    [currentSession.id, updateDocumentsForSession],
  );

  const value = useMemo(
    () => ({
      sessions,
      currentSession,
      documents,
      addSession,
      selectSession,
      renameSession,
      deleteSession,
      addDocuments,
      toggleDocumentLock,
      removeDocument,
      updateDocument,
    }),
    [
      sessions,
      currentSession,
      documents,
      addSession,
      selectSession,
      renameSession,
      deleteSession,
      addDocuments,
      toggleDocumentLock,
      removeDocument,
      updateDocument,
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
