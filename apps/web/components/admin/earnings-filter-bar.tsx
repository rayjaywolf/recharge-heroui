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

import type { EarningsSort } from "@/lib/admin-earnings-query";

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

const ADMIN_SORT_OPTIONS: { id: EarningsSort; label: string }[] = [
  { id: "date_desc", label: "Newest first" },
  { id: "date_asc", label: "Oldest first" },
  { id: "commission_desc", label: "Highest platform cut" },
  { id: "commission_asc", label: "Lowest platform cut" },
  { id: "amount_desc", label: "Highest recharge" },
  { id: "amount_asc", label: "Lowest recharge" },
  { id: "retailer_asc", label: "Retailer A–Z" },
  { id: "operator_asc", label: "Carrier A–Z" },
];

const DISTRIBUTOR_SORT_OPTIONS: { id: EarningsSort; label: string }[] = [
  { id: "date_desc", label: "Newest first" },
  { id: "date_asc", label: "Oldest first" },
  { id: "commission_desc", label: "Highest your cut" },
  { id: "commission_asc", label: "Lowest your cut" },
  { id: "amount_desc", label: "Highest recharge" },
  { id: "amount_asc", label: "Lowest recharge" },
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

export function EarningsFilterBar({
  initialStatus,
  initialOperator,
  initialSearch,
  initialDateFrom,
  initialDateTo,
  initialSort,
  basePath = "/admin/earnings",
  variant = "admin",
}: {
  initialStatus: string;
  initialOperator: string;
  initialSearch: string;
  initialDateFrom: string;
  initialDateTo: string;
  initialSort: EarningsSort;
  basePath?: string;
  variant?: "admin" | "distributor";
}) {
  const router = useRouter();
  const sortOptions =
    variant === "distributor" ? DISTRIBUTOR_SORT_OPTIONS : ADMIN_SORT_OPTIONS;
  const [status, setStatus] = useState(initialStatus);
  const [operator, setOperator] = useState(initialOperator);
  const [search, setSearch] = useState(initialSearch);
  const [sort, setSort] = useState<EarningsSort>(initialSort);
  const [dateFrom, setDateFrom] = useState(initialDateFrom);
  const [dateTo, setDateTo] = useState(initialDateTo);
  const [dateRange, setDateRange] = useState<RangeValue<DateValue> | null>(() =>
    toDateRange(initialDateFrom, initialDateTo),
  );

  useEffect(() => {
    setStatus(initialStatus);
    setOperator(initialOperator);
    setSearch(initialSearch);
    setSort(initialSort);
    setDateFrom(initialDateFrom);
    setDateTo(initialDateTo);
    setDateRange(toDateRange(initialDateFrom, initialDateTo));
  }, [
    initialStatus,
    initialOperator,
    initialSearch,
    initialSort,
    initialDateFrom,
    initialDateTo,
  ]);

  const pushFilters = (overrides?: {
    status?: string;
    operator?: string;
    sort?: EarningsSort;
    dateFrom?: string;
    dateTo?: string;
  }) => {
    const params = new URLSearchParams();
    const applyStatus = overrides?.status ?? status;
    const applyOperator = overrides?.operator ?? operator;
    const applySort = overrides?.sort ?? sort;
    const applyDateFrom = overrides?.dateFrom ?? dateFrom;
    const applyDateTo = overrides?.dateTo ?? dateTo;

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
    setStatus("ALL");
    setOperator("ALL");
    setSearch("");
    setSort("date_desc");
    setDateFrom("");
    setDateTo("");
    setDateRange(null);
    router.push(basePath);
  };

  return (
    <Card className="flex flex-col gap-3" variant="secondary">
      <div className="flex flex-wrap items-end gap-3">
        <SearchField className="min-w-[200px] flex-1 basis-[240px]">
          <Label className="sr-only">Search earnings</Label>
          <SearchField.Group>
            <SearchField.SearchIcon />
            <SearchField.Input
              placeholder="Retailer, carrier, phone…"
              value={search}
              onKeyDown={(e) => {
                if (e.key === "Enter") pushFilters();
              }}
              onChange={(e) => setSearch(e.target.value)}
            />
            {search ? <SearchField.ClearButton /> : null}
          </SearchField.Group>
        </SearchField>

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
            const next = (value != null ? String(value) : "date_desc") as EarningsSort;
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
              {sortOptions.map((opt) => (
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
          <DateField.Group fullWidth variant="secondary">
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
          <DateRangePicker.Popover>
            <RangeCalendar aria-label="Earnings date range">
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
