import React from "react";
import Link from "next/link";

import { Button } from "@/components/ui/button";

export default function UnauthorizedPage(): React.JSX.Element {
  // TODO: Logged in users should be redirected to the dashboard
  // if they open this page.
  return (
    <main className="flex flex-col items-center justify-center h-screen">
      <h1 className="text-foreground text-lg font-bold">
        You are unauthorized to use this application.
      </h1>
      <p className="text-muted-foreground">
        If you believe this is an error, please contact a CarmenCanvas administrator.
      </p>
      <Button
        nativeButton={false}
        render={<Link href="/">Back to login</Link>}
        size="lg"
        className="mt-6"
      />
    </main>
  )
}