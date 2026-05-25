import { Zap } from "lucide-react";

import { cn } from "@/lib/utils";

type BrandMarkProps = {
  collapsed?: boolean;
  className?: string;
};

export function BrandMark({ collapsed = false, className }: BrandMarkProps) {
  return (
    <div
      className={cn(
        "flex min-w-0 items-center gap-2.5",
        collapsed && "justify-center",
        className
      )}
    >
      <span
        className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-accent text-accent-foreground"
        aria-hidden
      >
        <Zap className="size-4 fill-current" />
      </span>
      {!collapsed ? (
        <span className="truncate text-base font-semibold tracking-tight text-foreground">
          RechargePro
        </span>
      ) : null}
    </div>
  );
}
