"use client";

import { useEffect, useState } from "react";
import { Button } from "./button";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "./dialog";
import { Field, FieldGroup } from "./field";
import { Input } from "./input";
import { Label } from "./label";
import type { ActionResult } from "@/lib/actions/sessions";
import type { Session } from "@/lib/types/document";

interface RenameDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  session: Session;
  onRename: (title: string) => Promise<ActionResult>;
}

export default function RenameDialog({
  open,
  onOpenChange,
  session,
  onRename,
}: RenameDialogProps): React.JSX.Element {
  const [title, setTitle] = useState(session.title);
  const [error, setError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (open) {
      setTitle(session.title);
      setError(null);
    }
  }, [open, session.title]);

  const handleRename = async (): Promise<void> => {
    const trimmedTitle = title.trim();
    if (!trimmedTitle) {
      return;
    }

    setIsSaving(true);
    const result = await onRename(trimmedTitle);
    setIsSaving(false);

    // Titles are unique per user, so stay open and let them pick another.
    if (!result.ok) {
      setError(result.error);
      return;
    }
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Rename Session</DialogTitle>
          <DialogDescription>
            Rename the current session to a new name.
          </DialogDescription>
        </DialogHeader>
        <FieldGroup>
          <Field>
            <Label htmlFor={`session-title-${session.id}`}>Session name</Label>
            <Input
              id={`session-title-${session.id}`}
              type="text"
              placeholder="Session name"
              value={title}
              onChange={(event) => {
                setTitle(event.target.value);
                setError(null);
              }}
              onKeyDown={(event) => {
                if (event.key === "Enter") {
                  event.preventDefault();
                  void handleRename();
                }
              }}
              aria-invalid={error !== null}
              aria-describedby={error ? `session-title-error-${session.id}` : undefined}
              autoFocus
            />
            {error && (
              <p
                id={`session-title-error-${session.id}`}
                role="alert"
                className="text-destructive text-sm"
              >
                {error}
              </p>
            )}
          </Field>
        </FieldGroup>
        <DialogFooter>
          <DialogClose render={<Button variant="outline" />}>Cancel</DialogClose>
          <Button onClick={() => void handleRename()} disabled={isSaving}>
            {isSaving ? "Renaming..." : "Rename"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
