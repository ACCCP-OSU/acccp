"use client";

import { Info } from "lucide-react";
import { useState } from "react";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "./accordion";
import { Button } from "./button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "./dialog";
import type { UploadedDocument } from "@/lib/types/document";

interface ConversionResultDialogProps {
  document: UploadedDocument | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export default function ConversionResultDialog({
  document,
  open,
  onOpenChange,
}: ConversionResultDialogProps): React.JSX.Element | null {
  const [copied, setCopied] = useState(false);

  if (!document) return null;

  const isSuccess = document.status === "success";
  const isError = document.status === "error";

  const handleCopy = async () => {
    if (!document.html) return;
    await navigator.clipboard.writeText(document.html);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownload = () => {
    if (!document.html) return;
    const blob = new Blob([document.html], { type: "text/html" });
    const url = URL.createObjectURL(blob);
    const anchor = window.document.createElement("a");
    anchor.href = url;
    anchor.download = `${document.name.replace(/\.docx$/i, "")}.html`;
    anchor.click();
    URL.revokeObjectURL(url);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>{document.name}</DialogTitle>
          <DialogDescription>
            Conversion result for this document.
          </DialogDescription>
        </DialogHeader>

        <div className="flex items-start gap-2 rounded-2xl border border-primary/30 bg-primary/5 p-3 text-sm">
          <Info className="mt-0.5 size-4 shrink-0 text-primary" />
          <p>
            <span className="font-semibold text-primary">
              HTML output should be reviewed
            </span>{" "}
            before pasting into Canvas. Verify headings, links, tables, and
            accessibility before publishing.
          </p>
        </div>

        {isError && document.errorMessage && (
          <p className="text-sm text-destructive">{document.errorMessage}</p>
        )}

        {isSuccess && document.html && (
          <div className="flex flex-col gap-4">
            <div className="flex flex-wrap gap-2">
              <Button onClick={handleCopy}>
                {copied ? "Copied!" : "Copy HTML"}
              </Button>
              <Button variant="outline" onClick={handleDownload}>
                Download HTML
              </Button>
            </div>

            <Accordion>
              <AccordionItem value="html-output">
                <AccordionTrigger>View HTML output</AccordionTrigger>
                <AccordionContent>
                  <pre className="max-h-64 overflow-auto rounded-xl bg-muted p-3 text-xs whitespace-pre-wrap">
                    {document.html}
                  </pre>
                </AccordionContent>
              </AccordionItem>
            </Accordion>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
