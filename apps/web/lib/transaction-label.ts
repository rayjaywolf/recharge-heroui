export function transactionLabel(operator: string, targetPhone: string) {
  if (operator === "MANUAL_CREDIT") {
    return { title: "Wallet top-up", sub: null as string | null };
  }
  if (operator === "MANUAL_DEBIT") {
    return { title: "Wallet debit", sub: null };
  }
  if (operator === "FUNDS_SENT") {
    return { title: "Funds sent", sub: null };
  }
  if (operator === "FUNDS_RECEIVED") {
    return { title: "Funds received", sub: null };
  }
  return { title: operator, sub: targetPhone };
}

export function formatEnumLabel(value: string): string {
  return value
    .toLowerCase()
    .split("_")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

export function operatorLabel(operator: string): string {
  const known = transactionLabel(operator, "").title;
  if (known !== operator) return known;
  return formatEnumLabel(operator);
}
