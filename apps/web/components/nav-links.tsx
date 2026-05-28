"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Chip, Tooltip } from "@heroui/react";

import {
  getDashboardNavLinks,
  isNavLinkActive,
  type NavLink,
} from "@/lib/nav-config";
import { cn } from "@/lib/utils";

export function NavLinksList({
  userRole,
  pendingApprovalsCount = 0,
  pendingSupportCount = 0,
  onNavigate,
  className,
  collapsed = false,
}: {
  userRole: string;
  pendingApprovalsCount?: number;
  pendingSupportCount?: number;
  onNavigate?: () => void;
  className?: string;
  collapsed?: boolean;
}) {
  const pathname = usePathname();
  const links = getDashboardNavLinks(userRole);

  return (
    <nav className={cn("flex flex-col gap-0.5", className)}>
      {links.map((link) => (
        <NavLinkItem
          key={link.href}
          link={link}
          isActive={isNavLinkActive(pathname, link.href, userRole)}
          badge={
            link.href === "/admin/approvals" && pendingApprovalsCount > 0
              ? pendingApprovalsCount > 99
                ? "99+"
                : String(pendingApprovalsCount)
              : (link.href === "/admin/support" ||
                    link.href === "/distributor/support" ||
                    link.href === "/retailer/support") &&
                  pendingSupportCount > 0
                ? pendingSupportCount > 99
                  ? "99+"
                  : String(pendingSupportCount)
                : undefined
          }
          collapsed={collapsed}
          onNavigate={onNavigate}
        />
      ))}
    </nav>
  );
}

function NavLinkItem({
  link,
  isActive,
  badge,
  onNavigate,
  collapsed = false,
}: {
  link: NavLink;
  isActive: boolean;
  badge?: string;
  onNavigate?: () => void;
  collapsed?: boolean;
}) {
  const Icon = link.icon;

  const linkClassName = cn(
    "flex items-center rounded-lg text-sm font-medium transition-colors",
    collapsed ? "justify-center px-2 py-2.5" : "gap-3 px-3 py-2.5",
    isActive
      ? "bg-accent text-accent-foreground"
      : "text-foreground hover:bg-default"
  );

  const linkContent = (
    <>
      <span className="relative shrink-0">
        <Icon className="size-[1.125rem] opacity-80" />
        {badge && collapsed ? (
          <span className="absolute -right-1 -top-1 size-2 rounded-full bg-accent" />
        ) : null}
      </span>
      {!collapsed ? (
        <>
          <span className="flex-1 truncate">{link.name}</span>
          {badge ? (
            <Chip size="sm" variant="primary">
              {badge}
            </Chip>
          ) : null}
        </>
      ) : null}
    </>
  );

  if (!collapsed) {
    return (
      <Link href={link.href} className={linkClassName} onClick={onNavigate}>
        {linkContent}
      </Link>
    );
  }

  return (
    <Tooltip delay={0}>
      <Tooltip.Trigger aria-label={link.name} className="block w-full">
        <Link href={link.href} className={linkClassName} onClick={onNavigate}>
          {linkContent}
        </Link>
      </Tooltip.Trigger>
      <Tooltip.Content placement="right" showArrow>
        <Tooltip.Arrow />
        <p className="text-xs">
          {link.name}
          {badge ? ` (${badge})` : ""}
        </p>
      </Tooltip.Content>
    </Tooltip>
  );
}
