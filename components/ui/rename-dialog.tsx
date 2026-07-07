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
import type { Session } from "@/lib/types/document";

interface RenameDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  session: Session;
  onRename: (name: string) => void;
}

export default function RenameDialog({
  open,
  onOpenChange,
  session,
  onRename,
}: RenameDialogProps): React.JSX.Element {
  const [name, setName] = useState(session.name);

  useEffect(() => {
    if (open) {
      setName(session.name);
    }
  }, [open, session.name]);

  const handleRename = (): void => {
    const trimmedName = name.trim();
    if (!trimmedName) {
      return;
    }
    onRename(trimmedName);
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
            <Label htmlFor={`session-name-${session.id}`}>Session name</Label>
            <Input
              id={`session-name-${session.id}`}
              type="text"
              placeholder="Session name"
              value={name}
              onChange={(event) => setName(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Enter") {
                  event.preventDefault();
                  handleRename();
                }
              }}
              autoFocus
            />
          </Field>
        </FieldGroup>
        <DialogFooter>
          <DialogClose render={<Button variant="outline" />}>Cancel</DialogClose>
          <Button onClick={handleRename}>Rename</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
