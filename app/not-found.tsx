import React from "react";
import Link from "next/link";

import { Button } from "@/components/ui/button";

export default function NotFoundPage(): React.JSX.Element {
  return (
    <main className="flex flex-col items-center justify-center h-screen">
      <h1 className="text-foreground text-lg font-bold">Page not found.</h1>
      <p className="text-muted-foreground">
        If you believe this is an error, please contact a CarmenCanvas administrator.
      </p>
      <Button render={<Link href="/">Back to login</Link>} size="lg" className="mt-6" />
    </main>
  )
}
