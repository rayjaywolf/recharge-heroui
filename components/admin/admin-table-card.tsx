import type { ReactNode } from "react";
import { Card } from "@heroui/react";

import { cn } from "@/lib/utils";

export function AdminTableEmpty({ message }: { message: string }) {
  return (
    <p className="py-10 text-center text-sm text-muted">{message}</p>
  );
}

export function AdminTableCard({
  children,
  className,
  title,
  description,
  headerAction,
}: {
  children: ReactNode;
  className?: string;
  title?: ReactNode;
  description?: ReactNode;
  headerAction?: ReactNode;
}) {
  const hasHeader = title != null || description != null || headerAction != null;

  return (
    <Card className={cn("w-full", className)}>
      {hasHeader ? (
        <Card.Header className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div>
            {title != null ? (
              typeof title === "string" ? (
                <Card.Title>{title}</Card.Title>
              ) : (
                title
              )
            ) : null}
            {description != null ? (
              typeof description === "string" ? (
                <Card.Description className="mt-1">
                  {description}
                </Card.Description>
              ) : (
                description
              )
            ) : null}
          </div>
          {headerAction}
        </Card.Header>
      ) : null}
      <Card.Content>{children}</Card.Content>
    </Card>
  );
}
