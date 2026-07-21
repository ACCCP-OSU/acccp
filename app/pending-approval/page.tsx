"use client";

import React from "react";
import { useRouter } from "next/navigation";

import { Button } from "@/components/ui/button";
import { authClient } from "@/lib/auth-client";

export default function PendingApprovalPage(): React.JSX.Element {
  const router = useRouter();

  async function handleSignOut(): Promise<void> {
    await authClient.signOut();
    router.push("/");
  }

  return (
    <main className="flex h-screen flex-col items-center justify-center gap-2 px-4 text-center">
      <h1 className="text-lg font-bold text-foreground">
        Account pending approval
      </h1>
      <p className="max-w-sm text-muted-foreground">
        Your account has been created but hasn&apos;t been approved yet. It may
        take some time for an administrator to grant you access, so please check
        back later.
      </p>
      <Button onClick={handleSignOut} size="lg" className="mt-6">
        Sign out
      </Button>
    </main>
  );
}
