import type { LucideIcon } from "lucide-react";
import { Card } from "@heroui/react";

type StatCardProps = {
  title: string;
  value: string;
  description: string;
  icon: LucideIcon;
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
        <Icon
          className={`size-4 shrink-0 ${highlight === "danger" ? "text-danger" : "text-muted"}`}
          aria-hidden
        />
      </Card.Header>
      <Card.Content className="pt-2">
        <p
          className={`text-2xl font-semibold tracking-tight text-foreground ${highlight === "danger" ? "text-danger" : ""}`}
        >
          {value}
        </p>
        <p className="mt-1 text-xs text-muted">{description}</p>
      </Card.Content>
    </Card>
  );
}
