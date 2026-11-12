"use client";

import { useMemo, useState, useTransition } from "react";
import type { DateValue } from "@internationalized/date";
import {
  Banknote,
  Coins,
  Download,
  FilterX,
  Receipt,
  Store,
} from "lucide-react";
import {
  Button,
  Card,
  Chip,
  Label,
  ListBox,
  SearchField,
  Select,
  Table,
  type RangeValue,
} from "@heroui/react";

import { BackToReportsLink } from "@/components/admin/back-to-reports-link";
import {
  AdminTableCard,
  AdminTableEmpty,
} from "@/components/admin/admin-table-card";
import { ReportDateRangePicker } from "@/components/admin/report-date-range-picker";
import { Money, TabularNumber } from "@/components/money";
import { rangeToQueryStrings, toDateRange } from "@/lib/date-range-field";
import {
  detectActivePreset,
  filterRetailerFundingRows,
  getDatePresetRange,
  type DatePreset,
  type RetailerFundingFilters,
  type RetailerFundingReportRow,
  type RetailerOption,
} from "@/lib/retailer-funding-report";
import {
  exportRetailerFundingReport,
  type RetailerFundingExportRow,
} from "@/lib/excel-export";
import { formatTableDateTime } from "@/lib/utils";

const PRESET_OPTIONS: { id: "all" | "today" | "week" | "month" | "year"; label: string }[] = [
  { id: "all", label: "All Time" },
  { id: "today", label: "Today" },
  { id: "week", label: "This Week" },
  { id: "month", label: "This Month" },
  { id: "year", label: "This Year" },
];

const SOURCE_OPTIONS = [
  { id: "ALL", label: "All sources" },
  { id: "ADMIN", label: "Admin Manual Credit" },
  { id: "DISTRIBUTOR", label: "Distributor Transfer" },
] as const;

const SORT_OPTIONS: { id: RetailerFundingFilters["sort"]; label: string }[] = [
  { id: "date_desc", label: "Newest first" },
  { id: "date_asc", label: "Oldest first" },
  { id: "amount_desc", label: "Highest amount" },
  { id: "amount_asc", label: "Lowest amount" },
  { id: "retailer_asc", label: "Retailer A–Z" },
];

export function RetailerFundingReportView({
  rows,
  retailers,
  initialParams,
}: {
  rows: RetailerFundingReportRow[];
  retailers: RetailerOption[];
  initialParams?: {
    dateFrom?: string;
    dateTo?: string;
    retailerId?: string;
    source?: string;
    search?: string;
    sort?: string;
    preset?: string;
  };
}) {
  const [, startTransition] = useTransition();

  const initFrom = initialParams?.dateFrom || "";
  const initTo = initialParams?.dateTo || "";
  const initialPreset =
    (initialParams?.preset as DatePreset) ||
    detectActivePreset(initFrom, initTo);

  const [dateFrom, setDateFrom] = useState(initFrom);
  const [dateTo, setDateTo] = useState(initTo);
  const [activePreset, setActivePreset] = useState<DatePreset>(initialPreset);
  const [dateRange, setDateRange] = useState<RangeValue<DateValue> | null>(() =>
    toDateRange(initFrom, initTo),
  );
  const [retailerId, setRetailerId] = useState(
    initialParams?.retailerId || "ALL",
  );
  const [source, setSource] = useState<"ALL" | "ADMIN" | "DISTRIBUTOR">(
    (initialParams?.source as "ALL" | "ADMIN" | "DISTRIBUTOR") || "ALL",
  );
  const [search, setSearch] = useState(initialParams?.search || "");
  const [sort, setSort] = useState<RetailerFundingFilters["sort"]>(
    (initialParams?.sort as RetailerFundingFilters["sort"]) || "date_desc",
  );

  const syncUrl = (overrides?: Partial<RetailerFundingFilters & { preset?: DatePreset }>) => {
    if (typeof window === "undefined") return;

    const currentFrom = overrides?.dateFrom !== undefined ? overrides.dateFrom : dateFrom;
    const currentTo = overrides?.dateTo !== undefined ? overrides.dateTo : dateTo;
    const currentRetailer =
      overrides?.retailerId !== undefined ? overrides.retailerId : retailerId;
    const currentSource = overrides?.source !== undefined ? overrides.source : source;
    const currentSearch = overrides?.search !== undefined ? overrides.search : search;
    const currentSort = overrides?.sort !== undefined ? overrides.sort : sort;
    const currentPreset =
      overrides?.preset !== undefined ? overrides.preset : activePreset;

    const params = new URLSearchParams();
    if (currentFrom) params.set("dateFrom", currentFrom);
    if (currentTo) params.set("dateTo", currentTo);
    if (currentRetailer && currentRetailer !== "ALL") {
      params.set("retailerId", currentRetailer);
    }
    if (currentSource && currentSource !== "ALL") {
      params.set("source", currentSource);
    }
    if (currentSearch.trim()) params.set("search", currentSearch.trim());
    if (currentSort && currentSort !== "date_desc") params.set("sort", currentSort);
    if (currentPreset && currentPreset !== "all" && currentPreset !== "custom") {
      params.set("preset", currentPreset);
    }

    const qs = params.toString();
    const newUrl = qs ? `?${qs}` : window.location.pathname;
    window.history.replaceState(null, "", newUrl);
  };

  const handleSelectPreset = (preset: "all" | "today" | "week" | "month" | "year") => {
    setActivePreset(preset);
    const { dateFrom: from, dateTo: to } = getDatePresetRange(preset);
    setDateFrom(from);
    setDateTo(to);
    setDateRange(toDateRange(from, to));
    syncUrl({ dateFrom: from, dateTo: to, preset });
  };

  const handleCustomDateRange = (range: RangeValue<DateValue> | null) => {
    setDateRange(range);
    const { dateFrom: from, dateTo: to } = rangeToQueryStrings(range);
    setDateFrom(from);
    setDateTo(to);
    const detected = detectActivePreset(from, to);
    setActivePreset(detected);
    syncUrl({ dateFrom: from, dateTo: to, preset: detected });
  };

  const handleClearFilters = () => {
    setDateFrom("");
    setDateTo("");
    setDateRange(null);
    setActivePreset("all");
    setRetailerId("ALL");
    setSource("ALL");
    setSearch("");
    setSort("date_desc");
    syncUrl({
      dateFrom: "",
      dateTo: "",
      retailerId: "ALL",
      source: "ALL",
      search: "",
      sort: "date_desc",
      preset: "all",
    });
  };

  const filteredRows = useMemo(() => {
    return filterRetailerFundingRows(rows, {
      dateFrom,
      dateTo,
      retailerId,
      source,
      search,
      sort,
    });
  }, [rows, dateFrom, dateTo, retailerId, source, search, sort]);

  // Aggregate stats of the filtered view
  const stats = useMemo(() => {
    const totalAmount = filteredRows.reduce((sum, r) => sum + r.amount, 0);
    const uniqueRetailerIds = new Set(filteredRows.map((r) => r.retailerId));
    return {
      totalAmount,
      totalCount: filteredRows.length,
      retailerCount: uniqueRetailerIds.size,
    };
  }, [filteredRows]);

  const handleDownloadExcel = () => {
    const exportData: RetailerFundingExportRow[] = filteredRows.map((r) => {
      const d = new Date(r.createdAt);
      const fundedBy =
        r.operator === "MANUAL_CREDIT"
          ? "Admin Manual Credit"
          : r.operator === "FUNDS_RECEIVED"
            ? "Distributor Transfer"
            : r.operator;

      const retailerLabel = r.retailerStoreName
        ? `${r.retailerStoreName} (${r.retailerName})`
        : r.retailerName;

      const distributorLabel =
        r.distributorStoreName || r.distributorName || "Direct / None";

      return {
        date: d.toLocaleDateString("en-IN"),
        time: d.toLocaleTimeString("en-IN"),
        retailerName: retailerLabel,
        retailerPhone: r.retailerPhoneNumber || "",
        retailerEmail: r.retailerEmail || "",
        distributorName: distributorLabel,
        fundedBy,
        amount: r.amount,
        openingBalance: r.openingBalance,
        closingBalance: r.closingBalance,
        remarks: r.apiMessage || "",
        status: r.status,
        referenceId: r.id,
      };
    });

    const fileSuffix = [
      activePreset !== "all" ? activePreset : null,
      dateFrom || null,
      dateTo || null,
      retailerId !== "ALL" ? `retailer-${retailerId.slice(0, 8)}` : null,
    ]
      .filter(Boolean)
      .join("-");

    const fileName = `retailer-credits-funded-${fileSuffix || new Date().toISOString().split("T")[0]}`;
    exportRetailerFundingReport(exportData, fileName);
  };

  const hasActiveFilters =
    Boolean(dateFrom) ||
    Boolean(dateTo) ||
    retailerId !== "ALL" ||
    source !== "ALL" ||
    Boolean(search.trim()) ||
    sort !== "date_desc";

  return (
    <div className="min-w-0 max-w-full space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <BackToReportsLink />
          <h1 className="text-2xl font-semibold tracking-tight text-foreground">
            Credits funded to retailers
          </h1>
          <p className="mt-1 text-sm text-muted">
            Track and audit all wallet credits and fund transfers to retailers
            with customizable date ranges and retailer filtering.
          </p>
        </div>

        <div className="flex shrink-0 items-center gap-2">
          <Button
            className="gap-2"
            isDisabled={filteredRows.length === 0}
            size="sm"
            variant="secondary"
            onPress={handleDownloadExcel}
          >
            <Download aria-hidden className="size-4" />
            Download Excel ({filteredRows.length})
          </Button>
        </div>
      </div>

      {/* Summary Stat Cards */}
      <div className="grid gap-4 sm:grid-cols-3">
        <Card className="p-4" variant="secondary">
          <div className="flex items-center gap-3">
            <span className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
              <Coins className="size-5" />
            </span>
            <div className="min-w-0">
              <p className="text-xs font-medium text-muted">Total Credits Funded</p>
              <p className="mt-0.5 text-xl font-bold tracking-tight text-foreground">
                <Money amount={stats.totalAmount} />
              </p>
            </div>
          </div>
        </Card>

        <Card className="p-4" variant="secondary">
          <div className="flex items-center gap-3">
            <span className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-accent-soft text-accent-soft-foreground">
              <Receipt className="size-5" />
            </span>
            <div className="min-w-0">
              <p className="text-xs font-medium text-muted">Funding Transactions</p>
              <p className="mt-0.5 text-xl font-bold tracking-tight text-foreground">
                <TabularNumber>{stats.totalCount}</TabularNumber>
              </p>
            </div>
          </div>
        </Card>

        <Card className="p-4" variant="secondary">
          <div className="flex items-center gap-3">
            <span className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-blue-500/10 text-blue-600 dark:text-blue-400">
              <Store className="size-5" />
            </span>
            <div className="min-w-0">
              <p className="text-xs font-medium text-muted">Retailers Funded</p>
              <p className="mt-0.5 text-xl font-bold tracking-tight text-foreground">
                <TabularNumber>{stats.retailerCount}</TabularNumber>
              </p>
            </div>
          </div>
        </Card>
      </div>

      {/* Filter Bar Card */}
      <Card className="flex flex-col gap-4 p-4" variant="secondary">
        {/* Date presets row */}
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border/50 pb-3">
          <div className="flex flex-wrap items-center gap-1.5">
            <span className="mr-1 text-xs font-medium text-muted">Date range:</span>
            {PRESET_OPTIONS.map((preset) => {
              const isSelected = activePreset === preset.id;
              return (
                <Button
                  key={preset.id}
                  size="sm"
                  variant={isSelected ? "primary" : "secondary"}
                  onPress={() => handleSelectPreset(preset.id)}
                >
                  {preset.label}
                </Button>
              );
            })}
          </div>

          {hasActiveFilters && (
            <Button
              className="gap-1.5 text-xs text-muted hover:text-foreground"
              size="sm"
              variant="ghost"
              onPress={handleClearFilters}
            >
              <FilterX className="size-3.5" />
              Reset all filters
            </Button>
          )}
        </div>

        {/* Inputs row */}
        <div className="flex flex-wrap items-end gap-3">
          {/* Custom Date Range Picker */}
          <ReportDateRangePicker
            calendarAriaLabel="Report date range"
            className="min-w-[240px] flex-1 basis-[260px] sm:max-w-[340px]"
            value={dateRange}
            onChange={handleCustomDateRange}
          />

          {/* Retailer Select */}
          <Select
            className="w-full min-w-[200px] flex-1 basis-[200px] sm:max-w-[260px]"
            placeholder="All retailers"
            value={retailerId}
            onChange={(val) => {
              const next = val != null ? String(val) : "ALL";
              setRetailerId(next);
              syncUrl({ retailerId: next });
            }}
          >
            <Label>Filter Retailer</Label>
            <Select.Trigger>
              <Select.Value />
              <Select.Indicator />
            </Select.Trigger>
            <Select.Popover>
              <ListBox>
                <ListBox.Item id="ALL" textValue="All retailers">
                  All retailers ({retailers.length})
                  <ListBox.ItemIndicator />
                </ListBox.Item>
                {retailers.map((r) => {
                  const label = r.storeName ? `${r.storeName} (${r.name})` : r.name;
                  return (
                    <ListBox.Item key={r.id} id={r.id} textValue={label}>
                      <div className="flex flex-col">
                        <span>{label}</span>
                        {r.phoneNumber && (
                          <span className="text-xs text-muted">{r.phoneNumber}</span>
                        )}
                      </div>
                      <ListBox.ItemIndicator />
                    </ListBox.Item>
                  );
                })}
              </ListBox>
            </Select.Popover>
          </Select>

          {/* Funding Source Select */}
          <Select
            className="w-full min-w-[150px] flex-1 basis-[150px] sm:max-w-[200px]"
            placeholder="Funding source"
            value={source}
            onChange={(val) => {
              const next = (val != null ? String(val) : "ALL") as "ALL" | "ADMIN" | "DISTRIBUTOR";
              setSource(next);
              syncUrl({ source: next });
            }}
          >
            <Label>Funding Source</Label>
            <Select.Trigger>
              <Select.Value />
              <Select.Indicator />
            </Select.Trigger>
            <Select.Popover>
              <ListBox>
                {SOURCE_OPTIONS.map((opt) => (
                  <ListBox.Item key={opt.id} id={opt.id} textValue={opt.label}>
                    {opt.label}
                    <ListBox.ItemIndicator />
                  </ListBox.Item>
                ))}
              </ListBox>
            </Select.Popover>
          </Select>

          {/* Sort Select */}
          <Select
            className="w-full min-w-[140px] flex-1 basis-[140px] sm:max-w-[180px]"
            placeholder="Sort by"
            value={sort}
            onChange={(val) => {
              const next = (val != null ? String(val) : "date_desc") as RetailerFundingFilters["sort"];
              setSort(next);
              syncUrl({ sort: next });
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

          {/* Search Field */}
          <SearchField className="min-w-[200px] flex-1 basis-[220px]">
            <Label className="sr-only">Search</Label>
            <SearchField.Group>
              <SearchField.SearchIcon />
              <SearchField.Input
                placeholder="Search retailer, phone, remarks, ID…"
                value={search}
                onChange={(e) => {
                  const val = e.target.value;
                  setSearch(val);
                  startTransition(() => {
                    syncUrl({ search: val });
                  });
                }}
              />
              {search ? (
                <SearchField.ClearButton
                  onPress={() => {
                    setSearch("");
                    syncUrl({ search: "" });
                  }}
                />
              ) : null}
            </SearchField.Group>
          </SearchField>
        </div>
      </Card>

      {/* Report Table Card */}
      <AdminTableCard
        description={`Showing ${filteredRows.length} ${
          filteredRows.length === 1 ? "transaction" : "transactions"
        }${hasActiveFilters ? " (filtered)" : ""}`}
        headerAction={
          <Button
            className="gap-2"
            isDisabled={filteredRows.length === 0}
            size="sm"
            variant="secondary"
            onPress={handleDownloadExcel}
          >
            <Download aria-hidden className="size-4" />
            Download Excel
          </Button>
        }
        title="Funded Credits"
      >
        {filteredRows.length === 0 ? (
          <div className="py-12 text-center">
            <AdminTableEmpty message="No funded credit transactions match your selected filters." />
            {hasActiveFilters && (
              <Button
                className="mt-2"
                size="sm"
                variant="secondary"
                onPress={handleClearFilters}
              >
                Clear all filters
              </Button>
            )}
          </div>
        ) : (
          <Table>
            <Table.ScrollContainer className="max-h-[min(70vh,750px)]">
              <Table.Content
                aria-label="Credits funded to retailers"
                className="min-w-[900px]"
              >
                <Table.Header>
                  <Table.Column isRowHeader>Date & Time</Table.Column>
                  <Table.Column>Retailer</Table.Column>
                  <Table.Column>Distributor</Table.Column>
                  <Table.Column>Source</Table.Column>
                  <Table.Column>Amount Funded</Table.Column>
                  <Table.Column>Balance Change</Table.Column>
                  <Table.Column>Remarks</Table.Column>
                  <Table.Column>Reference ID</Table.Column>
                </Table.Header>
                <Table.Body>
                  {filteredRows.map((tx) => {
                    const isAdmin = tx.operator === "MANUAL_CREDIT";
                    const retailerDisplay =
                      tx.retailerStoreName || tx.retailerName;
                    const distributorDisplay =
                      tx.distributorStoreName || tx.distributorName || "Direct / None";

                    return (
                      <Table.Row key={tx.id} className="whitespace-nowrap">
                        <Table.Cell className="whitespace-nowrap text-xs text-muted">
                          {formatTableDateTime(tx.createdAt)}
                        </Table.Cell>

                        <Table.Cell className="max-w-[200px]">
                          <div className="truncate font-medium text-foreground">
                            {retailerDisplay}
                          </div>
                          <div className="truncate text-xs text-muted">
                            {tx.retailerPhoneNumber || tx.retailerEmail || "—"}
                          </div>
                        </Table.Cell>

                        <Table.Cell className="max-w-[160px] truncate text-sm text-muted">
                          {distributorDisplay}
                        </Table.Cell>

                        <Table.Cell>
                          <Chip
                            color={isAdmin ? "accent" : "default"}
                            size="sm"
                            variant="soft"
                          >
                            {isAdmin ? "Admin Credit" : "Distributor Transfer"}
                          </Chip>
                        </Table.Cell>

                        <Table.Cell>
                          <span className="font-semibold text-emerald-600 dark:text-emerald-400">
                            +<Money amount={tx.amount} />
                          </span>
                        </Table.Cell>

                        <Table.Cell className="text-xs text-muted">
                          <Money amount={tx.openingBalance} /> →{" "}
                          <span className="font-medium text-foreground">
                            <Money amount={tx.closingBalance} />
                          </span>
                        </Table.Cell>

                        <Table.Cell className="max-w-[220px] truncate text-xs text-muted">
                          <span title={tx.apiMessage || "No remarks"}>
                            {tx.apiMessage || "—"}
                          </span>
                        </Table.Cell>

                        <Table.Cell className="font-mono text-xs text-muted">
                          <span title={tx.id}>{tx.id.slice(0, 10)}…</span>
                        </Table.Cell>
                      </Table.Row>
                    );
                  })}
                </Table.Body>
              </Table.Content>
            </Table.ScrollContainer>
          </Table>
        )}
      </AdminTableCard>
    </div>
  );
}
