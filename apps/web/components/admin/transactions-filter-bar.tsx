"use client";

import { useEffect, useState } from "react";
import type { DateValue } from "@internationalized/date";
import { parseDate } from "@internationalized/date";
import { FilterX } from "lucide-react";
import { useRouter } from "next/navigation";
import {
  Button,
  Card,
  Checkbox,
  DateField,
  DateRangePicker,
  Label,
  ListBox,
  RangeCalendar,
  SearchField,
  Select,
  type RangeValue,
} from "@heroui/react";

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

function toDateRange(
  dateFrom: string,
  dateTo: string
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
  basePath = "/admin/transactions",
  defaultType = "RECHARGE",
  lockedType,
  lockedStatus,
  showRechargesOnlyCheckbox = true,
  emphasizeSearch = false,
}: {
  initialStatus: string;
  initialOperator: string;
  initialSearch: string;
  initialDateFrom: string;
  initialDateTo: string;
  initialType: string;
  basePath?: string;
  defaultType?: string;
  lockedType?: string;
  lockedStatus?: string;
  showRechargesOnlyCheckbox?: boolean;
  emphasizeSearch?: boolean;
}) {
  const router = useRouter();
  const [type, setType] = useState(initialType);
  const [status, setStatus] = useState(initialStatus);
  const [operator, setOperator] = useState(initialOperator);
  const [search, setSearch] = useState(initialSearch);
  const [dateFrom, setDateFrom] = useState(initialDateFrom);
  const [dateTo, setDateTo] = useState(initialDateTo);
  const [dateRange, setDateRange] = useState<RangeValue<DateValue> | null>(() =>
    toDateRange(initialDateFrom, initialDateTo)
  );

  useEffect(() => {
    setType(initialType);
    setStatus(initialStatus);
    setOperator(initialOperator);
    setSearch(initialSearch);
    setDateFrom(initialDateFrom);
    setDateTo(initialDateTo);
    setDateRange(toDateRange(initialDateFrom, initialDateTo));
  }, [
    initialType,
    initialStatus,
    initialOperator,
    initialSearch,
    initialDateFrom,
    initialDateTo,
  ]);

  const pushFilters = (overrides?: {
    type?: string;
    status?: string;
    operator?: string;
    dateFrom?: string;
    dateTo?: string;
  }) => {
    const params = new URLSearchParams();
    const applyType = lockedType ?? overrides?.type ?? type;
    const applyStatus = lockedStatus ?? overrides?.status ?? status;
    const applyOperator = overrides?.operator ?? operator;
    const applyDateFrom = overrides?.dateFrom ?? dateFrom;
    const applyDateTo = overrides?.dateTo ?? dateTo;

    if (applyType !== "RECHARGE") params.set("type", applyType);
    if (applyStatus !== "ALL") params.set("status", applyStatus);
    if (applyOperator !== "ALL") params.set("operator", applyOperator);
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
    setDateFrom("");
    setDateTo("");
    setDateRange(null);
    const params = new URLSearchParams();
    if (resetType !== "RECHARGE") params.set("type", resetType);
    if (resetStatus !== "ALL") params.set("status", resetStatus);
    const qs = params.toString();
    router.push(qs ? `${basePath}?${qs}` : basePath);
  };

  const effectiveType = lockedType ?? type;
  const rechargesOnly = effectiveType === "RECHARGE";

  return (
    <Card className="flex flex-col gap-3 overflow-x-auto" variant="secondary">
      <div className="flex min-w-max flex-nowrap items-end gap-3">
        <SearchField
          className={
            emphasizeSearch
              ? "w-[280px] shrink-0 sm:min-w-[320px] sm:flex-1"
              : "w-[220px] shrink-0 sm:w-[260px] sm:flex-1 sm:min-w-[200px]"
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

        {!lockedStatus ? (
          <Select
            className="w-40 shrink-0"
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
          className="w-40 shrink-0"
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

        <DateRangePicker
          className="w-72 shrink-0"
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
            <RangeCalendar aria-label="Transaction date range">
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

        <Button
          className="shrink-0"
          variant="primary"
          onPress={() => pushFilters()}
        >
          Search
        </Button>
        <Button
          aria-label="Clear filters"
          className="shrink-0"
          isIconOnly
          variant="secondary"
          onPress={clearFilters}
        >
          <FilterX className="size-4" />
        </Button>
      </div>

      {showRechargesOnlyCheckbox && !lockedType ? (
        <div>
          <Checkbox
            id="filter-recharges-only"
            isSelected={rechargesOnly}
            onChange={(selected) => {
              const nextType = selected ? "RECHARGE" : "ALL";
              setType(nextType);
              pushFilters({ type: nextType });
            }}
          >
            <Checkbox.Control>
              <Checkbox.Indicator />
            </Checkbox.Control>
            <Checkbox.Content>
              <Label htmlFor="filter-recharges-only">Recharges only</Label>
            </Checkbox.Content>
          </Checkbox>
        </div>
      ) : null}
    </Card>
  );
}
