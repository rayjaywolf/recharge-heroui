import { jsPDF } from "jspdf";

import type { AdminTransactionRow } from "@/components/admin/transactions-table";
import { getDisplayEmail, getDisplayPhone } from "@/lib/phone";
import { formatRechargeProvider } from "@/lib/recharge-provider";

function formatInr(amount: number): string {
  return `Rs. ${amount.toLocaleString("en-IN")}`;
}

function formatDateTime(value: string | Date): string {
  return new Date(value).toLocaleString("en-IN", {
    dateStyle: "medium",
    timeStyle: "short",
  });
}

function addField(
  doc: jsPDF,
  y: number,
  label: string,
  value: string,
  margin = 14,
): number {
  const lineHeight = 6;
  const labelWidth = 52;
  const valueX = margin + labelWidth;
  const maxWidth = doc.internal.pageSize.getWidth() - valueX - margin;

  doc.setFont("helvetica", "bold");
  doc.setFontSize(10);
  doc.text(label, margin, y);

  doc.setFont("helvetica", "normal");
  const lines = doc.splitTextToSize(value || "—", maxWidth);
  doc.text(lines, valueX, y);

  return y + lineHeight * Math.max(lines.length, 1) + 2;
}

function addSectionTitle(doc: jsPDF, y: number, title: string): number {
  doc.setFont("helvetica", "bold");
  doc.setFontSize(11);
  doc.text(title, 14, y);
  return y + 8;
}

export function downloadTransactionPdf(tx: AdminTransactionRow): void {
  const doc = new jsPDF({ unit: "mm", format: "a4" });
  const pageHeight = doc.internal.pageSize.getHeight();
  let y = 18;

  doc.setFont("helvetica", "bold");
  doc.setFontSize(16);
  doc.text("Transaction receipt", 14, y);
  y += 10;

  doc.setFontSize(10);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(100);
  doc.text(`Generated ${formatDateTime(new Date())}`, 14, y);
  doc.setTextColor(0);
  y += 10;

  y = addField(doc, y, "Transaction ID", tx.id);
  y = addField(doc, y, "Status", tx.status);
  y = addField(doc, y, "Amount", formatInr(tx.amount));
  y = addField(doc, y, "Date & time", formatDateTime(tx.createdAt));
  y = addField(doc, y, "Carrier", tx.operator);
  y = addField(doc, y, "Recharge phone", tx.targetPhone);
  y = addField(doc, y, "Circle", tx.circleCode ?? "—");
  y = addField(doc, y, "API gateway", formatRechargeProvider(tx.provider));
  y = addField(doc, y, "Reference ID", tx.apiReferenceId ?? "—");

  if (y > pageHeight - 40) {
    doc.addPage();
    y = 18;
  }

  y = addSectionTitle(doc, y, "Retailer");
  y = addField(doc, y, "Name", tx.user.name);
  y = addField(doc, y, "Phone", getDisplayPhone(tx.user) ?? "—");
  y = addField(doc, y, "Email", getDisplayEmail(tx.user.email) ?? "—");
  y = addField(doc, y, "User ID", tx.userId);

  if (y > pageHeight - 40) {
    doc.addPage();
    y = 18;
  }

  y = addSectionTitle(doc, y, "Commissions");
  y = addField(doc, y, "Retailer", formatInr(tx.retailerCommission));
  y = addField(doc, y, "Distributor", formatInr(tx.distributorCommission));
  y = addField(doc, y, "Admin", formatInr(tx.adminCommission));

  if (y > pageHeight - 40) {
    doc.addPage();
    y = 18;
  }

  y = addSectionTitle(doc, y, "Additional details");
  y = addField(doc, y, "API message", tx.apiMessage ?? "—");
  y = addField(doc, y, "Idempotency key", tx.idempotencyKey ?? "—");
  y = addField(doc, y, "Last updated", formatDateTime(tx.updatedAt));

  const safeId = tx.id.replace(/[^a-zA-Z0-9_-]/g, "").slice(0, 12);
  doc.save(`transaction-${safeId || "receipt"}.pdf`);
}

export type RechargeReceiptInput = {
  transactionId: string;
  status: string;
  phone: string;
  operator: string;
  amount: number;
  referenceId?: string;
  apiMessage?: string;
  provider?: string;
  circleCode?: string;
  createdAt?: string;
};

export function downloadRechargeReceiptPdf(input: RechargeReceiptInput): void {
  const doc = new jsPDF({ unit: "mm", format: "a4" });
  let y = 18;

  doc.setFont("helvetica", "bold");
  doc.setFontSize(16);
  doc.text("Recharge receipt", 14, y);
  y += 10;

  doc.setFontSize(10);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(100);
  doc.text(`Generated ${formatDateTime(new Date())}`, 14, y);
  doc.setTextColor(0);
  y += 10;

  y = addField(doc, y, "Transaction ID", input.transactionId);
  y = addField(doc, y, "Status", input.status);
  y = addField(doc, y, "Amount", formatInr(input.amount));
  y = addField(
    doc,
    y,
    "Date & time",
    input.createdAt ? formatDateTime(input.createdAt) : formatDateTime(new Date()),
  );
  y = addField(doc, y, "Carrier", input.operator);
  y = addField(doc, y, "Recharge phone", input.phone);
  y = addField(doc, y, "Circle", input.circleCode ?? "—");
  y = addField(
    doc,
    y,
    "API gateway",
    input.provider ? formatRechargeProvider(input.provider) : "—",
  );
  y = addField(doc, y, "Reference ID", input.referenceId ?? "—");
  y = addField(doc, y, "API message", input.apiMessage ?? "—");

  const safeId = input.transactionId.replace(/[^a-zA-Z0-9_-]/g, "").slice(0, 12);
  doc.save(`recharge-${safeId || "receipt"}.pdf`);
}
