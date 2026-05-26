/** Day-over-day percent change; null when both periods are zero. */
export function computePercentChange(
  current: number,
  previous: number,
): number | null {
  if (previous === 0) {
    if (current === 0) return null;
    return 100;
  }
  return ((current - previous) / previous) * 100;
}

export function getDayBounds(now = new Date()) {
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const yesterdayStart = new Date(todayStart);
  yesterdayStart.setDate(yesterdayStart.getDate() - 1);
  return { todayStart, yesterdayStart };
}
