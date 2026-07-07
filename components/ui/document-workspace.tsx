"use client";

import { useCallback, useEffect, useRef } from "react";
import { runMockConversion } from "@/lib/mock/conversion";
import type { ConversionStatus } from "@/lib/types/document";
import { useSession } from "@/contexts/session-context";
import { Button } from "./button";
import DocumentTable from "./document-table";
import FileUpload from "./file-upload";

export default function DocumentWorkspace(): React.JSX.Element {
  const {
    documents,
    addDocuments,
    toggleDocumentLock,
    removeDocument,
    updateDocument,
  } = useSession();

  const conversionHandlesRef = useRef<Map<string, { cancel: () => void }>>(
    new Map(),
  );

  const isProcessing = documents.some((doc) => doc.status === "processing");
  const hasDocuments = documents.length > 0;
  const canConvert = hasDocuments && !isProcessing;

  useEffect(() => {
    const handles = conversionHandlesRef.current;
    return () => {
      handles.forEach((handle) => handle.cancel());
      handles.clear();
    };
  }, []);

  const handleStatusChange = useCallback(
    (docId: string, status: ConversionStatus) => {
      updateDocument(docId, { status });
    },
    [updateDocument],
  );

  const handleDeleteDocument = useCallback(
    (docId: string) => {
      conversionHandlesRef.current.get(docId)?.cancel();
      conversionHandlesRef.current.delete(docId);
      removeDocument(docId);
    },
    [removeDocument],
  );

  const runConversion = useCallback(() => {
    const targets = documents.filter((doc) => !doc.locked);
    if (targets.length === 0) return;

    targets.forEach((doc) => {
      conversionHandlesRef.current.get(doc.id)?.cancel();

      updateDocument(doc.id, {
        status: "queued",
        html: undefined,
        errorMessage: undefined,
      });

      const handle = runMockConversion(doc, (status) =>
        handleStatusChange(doc.id, status),
      );

      conversionHandlesRef.current.set(doc.id, handle);

      handle.promise.then((result) => {
        conversionHandlesRef.current.delete(doc.id);
        if (result.status === "success") {
          updateDocument(doc.id, {
            status: "success",
            html: result.html,
            errorMessage: undefined,
          });
        } else {
          updateDocument(doc.id, {
            status: "error",
            html: undefined,
            errorMessage: result.errorMessage,
          });
        }
      });
    });
  }, [documents, handleStatusChange, updateDocument]);

  return (
    <div className="mt-8 flex flex-col gap-6">
      <section className="flex flex-col gap-2">
        <h2 className="text-sm font-medium text-foreground">Upload documents</h2>
        <FileUpload
          onFilesSelected={addDocuments}
          disabled={isProcessing}
        />
      </section>

      <section>
        <Button
          size="lg"
          disabled={!canConvert}
          onClick={runConversion}
        >
          Convert
        </Button>
        {!hasDocuments && (
          <p className="mt-2 text-sm text-muted-foreground">
            Upload at least one document to enable conversion.
          </p>
        )}
        {hasDocuments && isProcessing && (
          <p className="mt-2 text-sm text-muted-foreground">
            Conversion in progress…
          </p>
        )}
      </section>

      <DocumentTable
        documents={documents}
        onToggleLock={toggleDocumentLock}
        onDeleteDocument={handleDeleteDocument}
      />
    </div>
  );
}
