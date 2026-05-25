import Link from "next/link";
import { Card } from "@heroui/react";

import { ADMIN_REPORT_LINKS } from "@/lib/report-nav";

export default function AdminReportsHubPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-foreground">
          Reports
        </h1>
        <p className="mt-1 text-sm text-muted">
          Recharge and account reports from the legacy admin portal, organized
          in one place.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {ADMIN_REPORT_LINKS.map((report) => {
          const Icon = report.icon;
          return (
            <Link key={report.slug} href={report.href}>
              <Card
                className="h-full transition-colors hover:bg-default"
                variant="secondary"
              >
                <Card.Header className="flex-row items-start gap-3">
                  <span className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-accent-soft text-accent-soft-foreground">
                    <Icon className="size-5" strokeWidth={2.25} />
                  </span>
                  <div className="min-w-0">
                    <Card.Title className="text-base">{report.name}</Card.Title>
                    <Card.Description className="mt-1 line-clamp-2">
                      {report.description}
                    </Card.Description>
                  </div>
                </Card.Header>
              </Card>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
