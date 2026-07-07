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
import type { Session, UploadedDocument } from "@/lib/types/document";

interface SessionContextValue {
  sessions: Session[];
  currentSession: Session;
  documents: UploadedDocument[];
  addSession: () => void;
  selectSession: (session: Session) => void;
  renameSession: (sessionId: number, name: string) => void;
  deleteSession: (sessionId: number) => void;
  addDocuments: (files: File[]) => void;
  toggleDocumentLock: (docId: string) => void;
  removeDocument: (docId: string) => void;
  updateDocument: (
    docId: string,
    patch: Partial<UploadedDocument>,
  ) => void;
}

const SessionContext = createContext<SessionContextValue | null>(null);

const INITIAL_SESSIONS: Session[] = [
  { id: 1, name: "Session 1" },
  { id: 2, name: "Session 2" },
];

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

function resolveSession(sessions: Session[], paramId: number): Session {
  if (paramId && !Number.isNaN(paramId)) {
    const found = sessions.find((s) => s.id === paramId);
    if (found) return found;
  }
  return sessions[0];
}

export function SessionProvider({ children }: { children: ReactNode }) {
  const router = useRouter();
  const params = useParams<{ id?: string }>();
  const paramId = Number(params.id);

  const [sessions, setSessions] = useState<Session[]>(INITIAL_SESSIONS);
  const [documentsBySessionId, setDocumentsBySessionId] = useState<
    Record<number, UploadedDocument[]>
  >({
    1: [],
    2: [],
  });

  const currentSession = useMemo(
    () => resolveSession(sessions, paramId),
    [sessions, paramId],
  );

  const documents = useMemo(
    () => documentsBySessionId[currentSession.id] ?? [],
    [documentsBySessionId, currentSession.id],
  );

  const updateDocumentsForSession = useCallback(
    (
      sessionId: number,
      updater: (docs: UploadedDocument[]) => UploadedDocument[],
    ) => {
      setDocumentsBySessionId((prev) => ({
        ...prev,
        [sessionId]: updater(prev[sessionId] ?? []),
      }));
    },
    [],
  );

  const addSession = useCallback(() => {
    setSessions((prev) => {
      const newId = Math.max(0, ...prev.map((s) => s.id)) + 1;
      setDocumentsBySessionId((docs) => ({ ...docs, [newId]: [] }));
      router.push(`/dashboard/${newId}`);
      return [...prev, { id: newId, name: `Session ${newId}` }];
    });
  }, [router]);

  const selectSession = useCallback(
    (session: Session) => {
      router.push(`/dashboard/${session.id}`);
    },
    [router],
  );

  const renameSession = useCallback((sessionId: number, name: string) => {
    setSessions((prev) =>
      prev.map((s) => (s.id === sessionId ? { ...s, name } : s)),
    );
  }, []);

  const deleteSession = useCallback(
    (sessionId: number) => {
      setSessions((prev) => {
        const next = prev.filter((s) => s.id !== sessionId);
        if (next.length === 0) return prev;

        setDocumentsBySessionId((docs) => {
          const nextDocs = { ...docs };
          delete nextDocs[sessionId];
          return nextDocs;
        });

        if (currentSession.id === sessionId) {
          router.push(`/dashboard/${next[0].id}`);
        }

        return next;
      });
    },
    [currentSession.id, router],
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
