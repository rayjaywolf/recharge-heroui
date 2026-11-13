export type RetailerFundingReportRow = {
  id: string;
  createdAt: string;
  amount: number;
  operator: string;
  status: string;
  apiMessage: string | null;
  openingBalance: number;
  closingBalance: number;
  retailerId: string;
  retailerName: string;
  retailerStoreName: string | null;
  retailerEmail: string | null;
  retailerPhoneNumber: string | null;
  distributorId: string | null;
  distributorName: string | null;
  distributorStoreName: string | null;
};

export type RetailerOption = {
  id: string;
  name: string;
  storeName: string | null;
  phoneNumber: string | null;
};

export type DatePreset = "all" | "today" | "week" | "month" | "year" | "custom";

export type RetailerFundingFilters = {
  dateFrom?: string;
  dateTo?: string;
  retailerId?: string;
  source?: "ALL" | "ADMIN" | "DISTRIBUTOR";
  search?: string;
  sort?: "date_desc" | "date_asc" | "amount_desc" | "amount_asc" | "retailer_asc";
};

export function formatIsoDateOnly(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

export function getDatePresetRange(
  preset: "all" | "today" | "week" | "month" | "year",
  now: Date = new Date(),
): { dateFrom: string; dateTo: string } {
  const todayStr = formatIsoDateOnly(now);

  if (preset === "today") {
    return { dateFrom: todayStr, dateTo: todayStr };
  }

  if (preset === "week") {
    // Current week: Monday of current week through today
    const day = now.getDay();
    const diff = now.getDate() - (day === 0 ? 6 : day - 1);
    const monday = new Date(now.getFullYear(), now.getMonth(), diff);
    return { dateFrom: formatIsoDateOnly(monday), dateTo: todayStr };
  }

  if (preset === "month") {
    // Current month: 1st of month through today
    const firstOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    return { dateFrom: formatIsoDateOnly(firstOfMonth), dateTo: todayStr };
  }

  if (preset === "year") {
    // Current year: Jan 1 through today
    const firstOfYear = new Date(now.getFullYear(), 0, 1);
    return { dateFrom: formatIsoDateOnly(firstOfYear), dateTo: todayStr };
  }

  return { dateFrom: "", dateTo: "" };
}

export function detectActivePreset(
  dateFrom: string | undefined,
  dateTo: string | undefined,
  now: Date = new Date(),
): DatePreset {
  if (!dateFrom && !dateTo) return "all";

  const today = getDatePresetRange("today", now);
  if (dateFrom === today.dateFrom && dateTo === today.dateTo) return "today";

  const week = getDatePresetRange("week", now);
  if (dateFrom === week.dateFrom && dateTo === week.dateTo) return "week";

  const month = getDatePresetRange("month", now);
  if (dateFrom === month.dateFrom && dateTo === month.dateTo) return "month";

  const year = getDatePresetRange("year", now);
  if (dateFrom === year.dateFrom && dateTo === year.dateTo) return "year";

  return "custom";
}

export function filterRetailerFundingRows(
  rows: RetailerFundingReportRow[],
  filters: RetailerFundingFilters,
): RetailerFundingReportRow[] {
  const {
    dateFrom,
    dateTo,
    retailerId,
    source = "ALL",
    search = "",
    sort = "date_desc",
  } = filters;

  const q = search.trim().toLowerCase();

  const filtered = rows.filter((row) => {
    // 1. Retailer ID filter
    if (retailerId && retailerId !== "ALL" && row.retailerId !== retailerId) {
      return false;
    }

    // 2. Funding source filter (Admin vs Distributor)
    if (source === "ADMIN" && row.operator !== "MANUAL_CREDIT") {
      return false;
    }
    if (source === "DISTRIBUTOR" && row.operator !== "FUNDS_RECEIVED") {
      return false;
    }

    // 3. Date range filter
    const rowDate = new Date(row.createdAt);
    if (dateFrom) {
      const from = new Date(`${dateFrom}T00:00:00`);
      if (rowDate < from) return false;
    }
    if (dateTo) {
      const to = new Date(`${dateTo}T23:59:59.999`);
      if (rowDate > to) return false;
    }

    // 4. Text search
    if (q) {
      const name = (row.retailerStoreName || row.retailerName || "").toLowerCase();
      const rawName = (row.retailerName || "").toLowerCase();
      const phone = (row.retailerPhoneNumber || "").toLowerCase();
      const email = (row.retailerEmail || "").toLowerCase();
      const dist = (
        row.distributorStoreName ||
        row.distributorName ||
        ""
      ).toLowerCase();
      const remarks = (row.apiMessage || "").toLowerCase();
      const id = row.id.toLowerCase();

      const matches =
        name.includes(q) ||
        rawName.includes(q) ||
        phone.includes(q) ||
        email.includes(q) ||
        dist.includes(q) ||
        remarks.includes(q) ||
        id.includes(q);

      if (!matches) return false;
    }

    return true;
  });

  // Sort
  return filtered.sort((a, b) => {
    if (sort === "date_asc") {
      return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
    }
    if (sort === "amount_desc") {
      return b.amount - a.amount;
    }
    if (sort === "amount_asc") {
      return a.amount - b.amount;
    }
    if (sort === "retailer_asc") {
      const nameA = a.retailerStoreName || a.retailerName;
      const nameB = b.retailerStoreName || b.retailerName;
      return nameA.localeCompare(nameB);
    }
    // Default: date_desc
    return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
  });
}
