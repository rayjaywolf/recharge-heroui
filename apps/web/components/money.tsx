import type { ReactNode } from "react";

import { amountClassName, formatInr, type FormatInrOptions } from "@/lib/format-money";
import { cn } from "@/lib/utils";

type MoneyProps = FormatInrOptions & {
  amount: number;
  className?: string;
  sign?: "+" | "-";
};

export function Money({ amount, className, fractionDigits, sign }: MoneyProps) {
  return (
    <span className={cn(amountClassName, className)}>
      {sign}
      {formatInr(amount, { fractionDigits })}
    </span>
  );
}

type TabularNumberProps = {
  children: ReactNode;
  className?: string;
};

/** Wraps non-INR numeric text (counts, percentages) with tabular alignment. */
export function TabularNumber({ children, className }: TabularNumberProps) {
  return <span className={cn(amountClassName, className)}>{children}</span>;
}
