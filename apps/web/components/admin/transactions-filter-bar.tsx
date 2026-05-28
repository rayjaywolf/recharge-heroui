"use client";

import { useEffect, useState } from "react";
import type { DateValue } from "@internationalized/date";
import { parseDate } from "@internationalized/date";
import { FilterX } from "lucide-react";
import { useRouter } from "next/navigation";
import {
  Button,
  Card,
  DateField,
  DateRangePicker,
  Label,
  ListBox,
  RangeCalendar,
  SearchField,
  Select,
  type RangeValue,
} from "@heroui/react";

import type { TransactionsSort } from "@/lib/admin-transactions-query";
import type { AdminTransactionTypeFilter } from "@/lib/transaction-filters";

const STATUS_OPTIONS = [
  { id: "ALL", label: "All outcomes" },
  { id: "SUCCESS", label: "Success only" },
  { id: "PENDING", label: "Pending" },
  { id: "FAILED", label: "Failed" },
  { id: "REFUNDED", label: "Refunded" },
] as const;

const OPERATOR_OPTIONS = [
  { id: "ALL", label: "All carriers" },
  { id: "JIO", label: "Jio" },
  { id: "AIRTEL", label: "Airtel" },
  { id: "VI", label: "Vodafone Idea" },
  { id: "BSNL", label: "BSNL" },
] as const;

const CATEGORY_OPTIONS: { id: AdminTransactionTypeFilter; label: string }[] = [
  { id: "RECHARGE", label: "Recharges only" },
  { id: "FUNDS", label: "Funds transfer" },
];

const ALL_CATEGORY_OPTION: { id: AdminTransactionTypeFilter; label: string } = {
  id: "ALL",
  label: "All activity",
};

const SORT_OPTIONS: { id: TransactionsSort; label: string }[] = [
  { id: "date_desc", label: "Newest first" },
  { id: "date_asc", label: "Oldest first" },
  { id: "amount_desc", label: "Highest amount" },
  { id: "amount_asc", label: "Lowest amount" },
  { id: "retailer_asc", label: "Retailer A–Z" },
  { id: "operator_asc", label: "Carrier A–Z" },
];

function toDateRange(
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

function rangeToQueryStrings(range: RangeValue<DateValue> | null): {
  dateFrom: string;
  dateTo: string;
} {
  return {
    dateFrom: range?.start?.toString() ?? "",
    dateTo: range?.end?.toString() ?? "",
  };
}

export function TransactionsFilterBar({
  initialStatus,
  initialOperator,
  initialSearch,
  initialDateFrom,
  initialDateTo,
  initialType,
  initialSort,
  basePath = "/admin/transactions",
  defaultType = "RECHARGE",
  lockedType,
  lockedStatus,
  showCategoryDropdown = true,
  emphasizeSearch = false,
}: {
  initialStatus: string;
  initialOperator: string;
  initialSearch: string;
  initialDateFrom: string;
  initialDateTo: string;
  initialType: AdminTransactionTypeFilter;
  initialSort: TransactionsSort;
  basePath?: string;
  defaultType?: AdminTransactionTypeFilter;
  lockedType?: AdminTransactionTypeFilter;
  lockedStatus?: string;
  showCategoryDropdown?: boolean;
  emphasizeSearch?: boolean;
}) {
  const router = useRouter();
  const categoryOptions =
    defaultType === "ALL"
      ? [ALL_CATEGORY_OPTION, ...CATEGORY_OPTIONS]
      : CATEGORY_OPTIONS;
  const [type, setType] = useState<AdminTransactionTypeFilter>(initialType);
  const [status, setStatus] = useState(initialStatus);
  const [operator, setOperator] = useState(initialOperator);
  const [search, setSearch] = useState(initialSearch);
  const [sort, setSort] = useState<TransactionsSort>(initialSort);
  const [dateFrom, setDateFrom] = useState(initialDateFrom);
  const [dateTo, setDateTo] = useState(initialDateTo);
  const [dateRange, setDateRange] = useState<RangeValue<DateValue> | null>(() =>
    toDateRange(initialDateFrom, initialDateTo),
  );

  useEffect(() => {
    setType(initialType);
    setStatus(initialStatus);
    setOperator(initialOperator);
    setSearch(initialSearch);
    setSort(initialSort);
    setDateFrom(initialDateFrom);
    setDateTo(initialDateTo);
    setDateRange(toDateRange(initialDateFrom, initialDateTo));
  }, [
    initialType,
    initialStatus,
    initialOperator,
    initialSearch,
    initialSort,
    initialDateFrom,
    initialDateTo,
  ]);

  const pushFilters = (overrides?: {
    type?: AdminTransactionTypeFilter;
    status?: string;
    operator?: string;
    sort?: TransactionsSort;
    dateFrom?: string;
    dateTo?: string;
  }) => {
    const params = new URLSearchParams();
    const applyType = lockedType ?? overrides?.type ?? type;
    const applyStatus = lockedStatus ?? overrides?.status ?? status;
    const applyOperator = overrides?.operator ?? operator;
    const applySort = overrides?.sort ?? sort;
    const applyDateFrom = overrides?.dateFrom ?? dateFrom;
    const applyDateTo = overrides?.dateTo ?? dateTo;

    if (applyType !== defaultType) params.set("type", applyType);
    if (applyStatus !== "ALL") params.set("status", applyStatus);
    if (applyOperator !== "ALL") params.set("operator", applyOperator);
    if (applySort !== "date_desc") params.set("sort", applySort);
    if (search.trim()) params.set("search", search.trim());
    if (applyDateFrom) params.set("dateFrom", applyDateFrom);
    if (applyDateTo) params.set("dateTo", applyDateTo);

    const qs = params.toString();
    router.push(qs ? `${basePath}?${qs}` : basePath);
  };

  const clearFilters = () => {
    const resetType = lockedType ?? defaultType;
    const resetStatus = lockedStatus ?? "ALL";
    setType(resetType);
    setStatus(resetStatus);
    setOperator("ALL");
    setSearch("");
    setSort("date_desc");
    setDateFrom("");
    setDateTo("");
    setDateRange(null);
    const params = new URLSearchParams();
    if (resetType !== defaultType) params.set("type", resetType);
    if (resetStatus !== "ALL") params.set("status", resetStatus);
    const qs = params.toString();
    router.push(qs ? `${basePath}?${qs}` : basePath);
  };

  return (
    <Card className="flex flex-col gap-3" variant="secondary">
      <div className="flex flex-wrap items-end gap-3">
        <SearchField
          className={
            emphasizeSearch
              ? "min-w-[200px] flex-1 basis-[280px]"
              : "min-w-[200px] flex-1 basis-[240px]"
          }
        >
          <Label className="sr-only">Search transactions</Label>
          <SearchField.Group>
            <SearchField.SearchIcon />
            <SearchField.Input
              placeholder="Phone, user, or reference ID…"
              value={search}
              onKeyDown={(e) => {
                if (e.key === "Enter") pushFilters();
              }}
              onChange={(e) => setSearch(e.target.value)}
            />
            {search ? <SearchField.ClearButton /> : null}
          </SearchField.Group>
        </SearchField>

        {showCategoryDropdown && !lockedType ? (
          <Select
            className="w-full min-w-[160px] flex-1 basis-[160px] sm:max-w-[200px]"
            placeholder="Category"
            value={type}
            onChange={(value) => {
              const next = (
                value != null ? String(value) : defaultType
              ) as AdminTransactionTypeFilter;
              setType(next);
              pushFilters({ type: next });
            }}
          >
            <Label>Category</Label>
            <Select.Trigger>
              <Select.Value />
              <Select.Indicator />
            </Select.Trigger>
            <Select.Popover>
              <ListBox>
                {categoryOptions.map((opt) => (
                  <ListBox.Item key={opt.id} id={opt.id} textValue={opt.label}>
                    {opt.label}
                    <ListBox.ItemIndicator />
                  </ListBox.Item>
                ))}
              </ListBox>
            </Select.Popover>
          </Select>
        ) : null}

        {!lockedStatus ? (
          <Select
            className="w-full min-w-[140px] flex-1 basis-[140px] sm:max-w-[180px]"
            placeholder="Status"
            value={status}
            onChange={(value) => {
              const next = value != null ? String(value) : "ALL";
              setStatus(next);
              pushFilters({ status: next });
            }}
          >
            <Label>Status</Label>
            <Select.Trigger>
              <Select.Value />
              <Select.Indicator />
            </Select.Trigger>
            <Select.Popover>
              <ListBox>
                {STATUS_OPTIONS.map((opt) => (
                  <ListBox.Item key={opt.id} id={opt.id} textValue={opt.label}>
                    {opt.label}
                    <ListBox.ItemIndicator />
                  </ListBox.Item>
                ))}
              </ListBox>
            </Select.Popover>
          </Select>
        ) : null}

        <Select
          className="w-full min-w-[140px] flex-1 basis-[140px] sm:max-w-[180px]"
          placeholder="Carrier"
          value={operator}
          onChange={(value) => {
            const next = value != null ? String(value) : "ALL";
            setOperator(next);
            pushFilters({ operator: next });
          }}
        >
          <Label>Carrier</Label>
          <Select.Trigger>
            <Select.Value />
            <Select.Indicator />
          </Select.Trigger>
          <Select.Popover>
            <ListBox>
              {OPERATOR_OPTIONS.map((opt) => (
                <ListBox.Item key={opt.id} id={opt.id} textValue={opt.label}>
                  {opt.label}
                  <ListBox.ItemIndicator />
                </ListBox.Item>
              ))}
            </ListBox>
          </Select.Popover>
        </Select>

        <Select
          className="w-full min-w-[160px] flex-1 basis-[160px] sm:max-w-[220px]"
          placeholder="Sort"
          value={sort}
          onChange={(value) => {
            const next = (
              value != null ? String(value) : "date_desc"
            ) as TransactionsSort;
            setSort(next);
            pushFilters({ sort: next });
          }}
        >
          <Label>Sort</Label>
          <Select.Trigger>
            <Select.Value />
            <Select.Indicator />
          </Select.Trigger>
          <Select.Popover>
            <ListBox>
              {SORT_OPTIONS.map((opt) => (
                <ListBox.Item key={opt.id} id={opt.id} textValue={opt.label}>
                  {opt.label}
                  <ListBox.ItemIndicator />
                </ListBox.Item>
              ))}
            </ListBox>
          </Select.Popover>
        </Select>
      </div>

      <div className="flex flex-wrap items-end gap-3">
        <DateRangePicker
          className="min-w-[260px] flex-1 basis-[280px] sm:max-w-[360px]"
          endName="dateTo"
          startName="dateFrom"
          value={dateRange}
          onChange={(range) => {
            setDateRange(range);
            const { dateFrom: from, dateTo: to } = rangeToQueryStrings(range);
            setDateFrom(from);
            setDateTo(to);
            if (range?.start && range?.end) {
              pushFilters({ dateFrom: from, dateTo: to });
            }
          }}
        >
          <Label>Date range</Label>
          <DateField.Group
            fullWidth
            className="bg-white"
            variant="secondary"
          >
            <DateField.Input slot="start">
              {(segment) => <DateField.Segment segment={segment} />}
            </DateField.Input>
            <DateRangePicker.RangeSeparator />
            <DateField.Input slot="end">
              {(segment) => <DateField.Segment segment={segment} />}
            </DateField.Input>
            <DateField.Suffix>
              <DateRangePicker.Trigger>
                <DateRangePicker.TriggerIndicator />
              </DateRangePicker.Trigger>
            </DateField.Suffix>
          </DateField.Group>
          <DateRangePicker.Popover className="bg-white">
            <RangeCalendar aria-label="Transaction date range" className="bg-white">
              <RangeCalendar.Header>
                <RangeCalendar.YearPickerTrigger>
                  <RangeCalendar.YearPickerTriggerHeading />
                  <RangeCalendar.YearPickerTriggerIndicator />
                </RangeCalendar.YearPickerTrigger>
                <RangeCalendar.NavButton slot="previous" />
                <RangeCalendar.NavButton slot="next" />
              </RangeCalendar.Header>
              <RangeCalendar.Grid>
                <RangeCalendar.GridHeader>
                  {(day) => (
                    <RangeCalendar.HeaderCell>{day}</RangeCalendar.HeaderCell>
                  )}
                </RangeCalendar.GridHeader>
                <RangeCalendar.GridBody>
                  {(date) => <RangeCalendar.Cell date={date} />}
                </RangeCalendar.GridBody>
              </RangeCalendar.Grid>
              <RangeCalendar.YearPickerGrid>
                <RangeCalendar.YearPickerGridBody>
                  {({ year }) => (
                    <RangeCalendar.YearPickerCell year={year} />
                  )}
                </RangeCalendar.YearPickerGridBody>
              </RangeCalendar.YearPickerGrid>
            </RangeCalendar>
          </DateRangePicker.Popover>
        </DateRangePicker>

        <div className="flex shrink-0 items-center gap-2">
          <Button variant="primary" onPress={() => pushFilters()}>
            Search
          </Button>
          <Button
            aria-label="Clear filters"
            isIconOnly
            variant="secondary"
            onPress={clearFilters}
          >
            <FilterX className="size-4" />
          </Button>
        </div>
      </div>
    </Card>
  );
}
