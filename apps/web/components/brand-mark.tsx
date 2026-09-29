import Image from "next/image";

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
      <div className="relative size-8 shrink-0 overflow-hidden rounded-lg border border-separator/40 bg-surface shadow-xs">
        <Image
          src="/neo.jpg"
          alt="Logo"
          fill
          sizes="32px"
          className="object-cover"
          priority
        />
      </div>
      {!collapsed ? (
        <span className="truncate text-base font-semibold tracking-tight text-foreground">
          Neo Charge
        </span>
      ) : null}
    </div>
  );
}
