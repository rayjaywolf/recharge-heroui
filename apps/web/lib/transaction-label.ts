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
