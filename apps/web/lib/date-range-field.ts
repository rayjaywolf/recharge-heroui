import type { DateValue } from "@internationalized/date";
import { parseDate } from "@internationalized/date";
import type { RangeValue } from "@heroui/react";

/** Day-first date entry (dd/mm/yyyy). */
export const DATE_INPUT_LOCALE = "en-GB";

export function toDateRange(
  dateFrom: string,
  dateTo: string,
): RangeValue<DateValue> | null {
  try {
    const start = dateFrom ? parseDate(dateFrom) : null;
    const end = dateTo ? parseDate(dateTo) : null;
    if (start && end) return { start, end };
    if (start) return { start, end: start };
    if (end) return { start: end, end };
    return null;
  } catch {
    return null;
  }
}

export function rangeToQueryStrings(range: RangeValue<DateValue> | null): {
  dateFrom: string;
  dateTo: string;
} {
  return {
    dateFrom: range?.start?.toString() ?? "",
    dateTo: range?.end?.toString() ?? "",
  };
}
