export function startOfDay(d: Date): Date {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
}

export function endOfDay(d: Date): Date {
  const x = new Date(d);
  x.setHours(23, 59, 59, 999);
  return x;
}

export function resolveDateRange(searchParams: URLSearchParams): {
  start: Date;
  end: Date;
  scope: string;
} {
  const scope = searchParams.get("scope") ?? "today";
  const fromParam = searchParams.get("from");
  const toParam = searchParams.get("to");
  const now = new Date();

  if (scope === "custom") {
    if (!fromParam || !toParam) {
      throw new Error("INVALID_CUSTOM_RANGE");
    }
    const start = startOfDay(new Date(`${fromParam}T00:00:00.000`));
    const end = endOfDay(new Date(`${toParam}T00:00:00.000`));
    if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) {
      throw new Error("INVALID_CUSTOM_RANGE");
    }
    if (start > end) {
      throw new Error("INVALID_CUSTOM_RANGE");
    }
    return { start, end, scope: "custom" };
  }

  if (scope === "yesterday") {
    const y = new Date(now);
    y.setDate(y.getDate() - 1);
    return { start: startOfDay(y), end: endOfDay(y), scope };
  }

  if (scope === "last7" || scope === "last30" || scope === "last90") {
    const days = scope === "last7" ? 7 : scope === "last30" ? 30 : 90;
    const start = startOfDay(new Date(now));
    start.setDate(start.getDate() - (days - 1));
    return { start, end: endOfDay(now), scope };
  }

  if (scope === "today") {
    return { start: startOfDay(now), end: endOfDay(now), scope };
  }

  return { start: new Date(0), end: endOfDay(now), scope: "all" };
}
