import { Chip } from "@heroui/react";
import { ArrowDown, ArrowUp } from "lucide-react";

import { cn } from "@/lib/utils";

export function StatTrendBadge({
  percentChange,
  className,
}: {
  percentChange: number;
  className?: string;
}) {
  const isUp = percentChange > 0;
  const isDown = percentChange < 0;
  const label = `${Math.abs(percentChange).toFixed(1)}%`;

  return (
    <Chip
      className={cn("shrink-0 tabular-nums", className)}
      color={isUp ? "success" : isDown ? "danger" : "default"}
      size="sm"
      variant="soft"
      title="Compared to yesterday"
    >
      {isUp ? (
        <ArrowUp className="size-3" aria-hidden />
      ) : isDown ? (
        <ArrowDown className="size-3" aria-hidden />
      ) : null}
      {label}
    </Chip>
  );
}
