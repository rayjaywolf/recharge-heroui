import type { LucideIcon } from "lucide-react";
import { Card } from "@heroui/react";

type StatCardProps = {
  title: string;
  value: string;
  description?: string;
  icon?: LucideIcon;
  highlight?: "default" | "danger";
};

export function StatCard({
  title,
  value,
  description,
  icon: Icon,
  highlight = "default",
}: StatCardProps) {
  return (
    <Card variant="default">
      <Card.Header className="flex flex-row items-center justify-between gap-2 pb-0">
        <Card.Title className="text-sm font-medium text-muted">{title}</Card.Title>
        {Icon ? (
          <Icon
            className={`size-4 shrink-0 ${highlight === "danger" ? "text-danger" : "text-muted"}`}
            aria-hidden
          />
        ) : null}
      </Card.Header>
      <Card.Content className="pt-2">
        <p
          className={`text-3xl font-semibold tracking-tight tabular-nums text-foreground sm:text-4xl ${highlight === "danger" ? "text-danger" : ""}`}
        >
          {value}
        </p>
        {description ? (
          <p className="mt-1 text-xs text-muted">{description}</p>
        ) : null}
      </Card.Content>
    </Card>
  );
}
