export const TABLE_PAGE_SIZE = 50;

export const EXPORT_MAX_ROWS = 10_000;

export function parsePageParam(pageParam: string | undefined): number {
  const parsed = Number.parseInt(pageParam ?? "1", 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : 1;
}

export function getTotalPages(
  totalCount: number,
  pageSize = TABLE_PAGE_SIZE,
): number {
  if (totalCount === 0) return 0;
  return Math.ceil(totalCount / pageSize);
}

export function clampPage(
  page: number,
  totalCount: number,
  pageSize = TABLE_PAGE_SIZE,
): number {
  const totalPages = getTotalPages(totalCount, pageSize);
  if (totalPages === 0) return 1;
  return Math.min(page, totalPages);
}

export function getPageItemRange(
  page: number,
  totalCount: number,
  pageSize = TABLE_PAGE_SIZE,
): { start: number; end: number } {
  if (totalCount === 0) return { start: 0, end: 0 };
  const start = (page - 1) * pageSize + 1;
  const end = Math.min(page * pageSize, totalCount);
  return { start, end };
}

export function getPaginationPageNumbers(
  page: number,
  totalPages: number,
): (number | "ellipsis")[] {
  if (totalPages <= 7) {
    return Array.from({ length: totalPages }, (_, i) => i + 1);
  }

  const pages: (number | "ellipsis")[] = [1];

  if (page > 3) {
    pages.push("ellipsis");
  }

  const start = Math.max(2, page - 1);
  const end = Math.min(totalPages - 1, page + 1);

  for (let i = start; i <= end; i++) {
    pages.push(i);
  }

  if (page < totalPages - 2) {
    pages.push("ellipsis");
  }

  pages.push(totalPages);
  return pages;
}

export function searchParamsToQueryString(
  params: Record<string, string | undefined>,
): URLSearchParams {
  const searchParams = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value) searchParams.set(key, value);
  }
  return searchParams;
}

export function buildPaginatedPath(
  basePath: string,
  params: URLSearchParams,
  page: number,
): string {
  const next = new URLSearchParams(params);
  if (page <= 1) {
    next.delete("page");
  } else {
    next.set("page", String(page));
  }
  const qs = next.toString();
  return qs ? `${basePath}?${qs}` : basePath;
}
