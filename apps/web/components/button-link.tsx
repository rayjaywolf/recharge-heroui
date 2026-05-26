import NextLink from "next/link";
import { buttonVariants } from "@heroui/styles";
import type { ComponentProps, ReactNode } from "react";

import { cn } from "@/lib/utils";

type ButtonLinkProps = {
  href: string;
  variant?: "primary" | "secondary" | "tertiary" | "ghost" | "danger";
  size?: "sm" | "md" | "lg";
  fullWidth?: boolean;
  className?: string;
  children: ReactNode;
} & Omit<ComponentProps<typeof NextLink>, "href" | "className" | "children">;

export function ButtonLink({
  href,
  variant = "primary",
  size = "md",
  fullWidth,
  className,
  children,
  ...props
}: ButtonLinkProps) {
  return (
    <NextLink
      href={href}
      className={cn(buttonVariants({ variant, size, fullWidth }), className)}
      {...props}
    >
      {children}
    </NextLink>
  );
}
