"use client";

import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
import { useSession } from "@/contexts/session-context";
import Link from "next/link";

export default function DashboardBreadcrumb(): React.JSX.Element {
  const { currentSession } = useSession();

  return (
    <Breadcrumb>
      <BreadcrumbList>
        <BreadcrumbItem>
          <BreadcrumbLink
            render={
              <Link href={`/dashboard/${currentSession.id}`}>
                {currentSession.name}
              </Link>
            }
          />
        </BreadcrumbItem>
      </BreadcrumbList>
    </Breadcrumb>
  );
}
