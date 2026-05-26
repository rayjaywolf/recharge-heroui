import type { LucideIcon } from "lucide-react";
import { Card } from "@heroui/react";

import { StatTrendBadge } from "@/components/admin/stat-trend-badge";

type StatCardProps = {
  title: string;
  value: string;
  description?: string;
  icon?: LucideIcon;
  highlight?: "default" | "danger";
  /** Day-over-day % change vs yesterday; shown as pill next to value. */
  trendPercent?: number | null;
};

export function StatCard({
  title,
  value,
  description,
  icon: Icon,
  highlight = "default",
  trendPercent,
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
        <div className="flex items-center justify-between gap-3">
          <p
            className={`text-2xl font-semibold tracking-tight tabular-nums text-foreground ${highlight === "danger" ? "text-danger" : ""}`}
          >
            {value}
          </p>
          {trendPercent != null ? (
            <StatTrendBadge className="self-center" percentChange={trendPercent} />
          ) : null}
        </div>
        {description ? (
          <p className="mt-1 text-xs text-muted">{description}</p>
        ) : null}
      </Card.Content>
    </Card>
  );
}
