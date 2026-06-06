"use client";

import { useRouter } from "next/navigation";
import { Pagination } from "@heroui/react";

import {
  buildPaginatedPath,
  getPageItemRange,
  getPaginationPageNumbers,
  getTotalPages,
  TABLE_PAGE_SIZE,
} from "@/lib/table-pagination";

export function TablePagination({
  basePath,
  page,
  totalCount,
  queryParams,
  pageSize = TABLE_PAGE_SIZE,
}: {
  basePath: string;
  page: number;
  totalCount: number;
  queryParams: URLSearchParams;
  pageSize?: number;
}) {
  const router = useRouter();
  const totalPages = getTotalPages(totalCount, pageSize);

  if (totalPages <= 1) return null;

  const { start, end } = getPageItemRange(page, totalCount, pageSize);
  const pageNumbers = getPaginationPageNumbers(page, totalPages);

  const goToPage = (nextPage: number) => {
    router.push(buildPaginatedPath(basePath, queryParams, nextPage));
  };

  return (
    <Pagination className="w-full pt-4" size="sm">
      <Pagination.Summary>
        Showing {start}–{end} of {totalCount} results
      </Pagination.Summary>
      <Pagination.Content>
        <Pagination.Item>
          <Pagination.Previous
            isDisabled={page <= 1}
            onPress={() => goToPage(page - 1)}
          >
            <Pagination.PreviousIcon />
            <span>Previous</span>
          </Pagination.Previous>
        </Pagination.Item>
        {pageNumbers.map((pageNumber, index) =>
          pageNumber === "ellipsis" ? (
            <Pagination.Item key={`ellipsis-${index}`}>
              <Pagination.Ellipsis />
            </Pagination.Item>
          ) : (
            <Pagination.Item key={pageNumber}>
              <Pagination.Link
                isActive={pageNumber === page}
                onPress={() => goToPage(pageNumber)}
              >
                {pageNumber}
              </Pagination.Link>
            </Pagination.Item>
          ),
        )}
        <Pagination.Item>
          <Pagination.Next
            isDisabled={page >= totalPages}
            onPress={() => goToPage(page + 1)}
          >
            <span>Next</span>
            <Pagination.NextIcon />
          </Pagination.Next>
        </Pagination.Item>
      </Pagination.Content>
    </Pagination>
  );
}
