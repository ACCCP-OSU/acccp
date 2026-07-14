"use client";

import { useState, useTransition } from "react";

import { approveUser, rejectUser } from "@/lib/actions/admin-users";
import { Button } from "./button";
import {
  Table,
  TableBody,
  TableCaption,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "./table";

export interface PendingUser {
  id: string;
  email: string;
  displayName: string;
  createdAt: Date;
}

interface PendingUsersTableProps {
  users: PendingUser[];
}

function formatRequestedAt(date: Date): string {
  return new Intl.DateTimeFormat("en-US", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date);
}

export default function PendingUsersTable({
  users,
}: PendingUsersTableProps): React.JSX.Element {
  const [rows, setRows] = useState(users);
  const [pendingId, setPendingId] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const handleApprove = (id: string) => {
    setPendingId(id);
    startTransition(async () => {
      await approveUser(id);
      setRows((prev) => prev.filter((row) => row.id !== id));
      setPendingId(null);
    });
  };

  const handleReject = (id: string) => {
    setPendingId(id);
    startTransition(async () => {
      await rejectUser(id);
      setRows((prev) => prev.filter((row) => row.id !== id));
      setPendingId(null);
    });
  };

  return (
    <Table className="w-full max-w-xl">
      <TableCaption>
        {rows.length === 0
          ? "No users pending approval."
          : "Users pending approval."}
      </TableCaption>
      <TableHeader>
        <TableRow>
          <TableHead>Name</TableHead>
          <TableHead>Email</TableHead>
          <TableHead>Requested</TableHead>
          <TableHead className="w-32" />
        </TableRow>
      </TableHeader>
      <TableBody>
        {rows.map((row) => {
          const rowPending = isPending && pendingId === row.id;
          return (
            <TableRow key={row.id}>
              <TableCell>{row.displayName}</TableCell>
              <TableCell>{row.email}</TableCell>
              <TableCell>{formatRequestedAt(row.createdAt)}</TableCell>
              <TableCell className="flex gap-2">
                <Button
                  size="sm"
                  disabled={rowPending}
                  onClick={() => handleApprove(row.id)}
                >
                  Approve
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  className="text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
                  disabled={rowPending}
                  onClick={() => handleReject(row.id)}
                >
                  Reject
                </Button>
              </TableCell>
            </TableRow>
          );
        })}
      </TableBody>
    </Table>
  );
}
