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

const TARGET_PHONE_LABELS: Record<string, string> = {
  DIST_FUNDS_TRANSFER: "Funds transfer",
  RECEIVED_FUNDS: "Funds received",
  WALLET: "Wallet",
};

function isInternalTargetPhone(value: string): boolean {
  return /^[A-Z][A-Z0-9_]*$/.test(value);
}

export function targetPhoneLabel(value: string | null | undefined): string {
  if (!value?.trim()) return "—";
  const trimmed = value.trim();
  if (isInternalTargetPhone(trimmed)) {
    return TARGET_PHONE_LABELS[trimmed] ?? formatEnumLabel(trimmed);
  }
  return trimmed;
}
