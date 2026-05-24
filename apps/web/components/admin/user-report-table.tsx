"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { Download } from "lucide-react";
import { Button, Chip, SearchField, Table } from "@heroui/react";

import {
  AdminTableCard,
  AdminTableEmpty,
} from "@/components/admin/admin-table-card";
import type { UserReportRow } from "@/lib/user-report";
import { getDisplayEmail, getDisplayPhone } from "@/lib/phone";
import { exportUserReport } from "@/lib/excel-export";

function formatInr(amount: number): string {
  return `₹${amount.toLocaleString("en-IN")}`;
}

export function UserReportTable({
  title,
  description,
  rows,
  showDistributor = false,
  showRetailerCount = false,
  downloadFileName,
}: {
  title: string;
  description?: string;
  rows: UserReportRow[];
  showDistributor?: boolean;
  showRetailerCount?: boolean;
  downloadFileName: string;
}) {
  const [query, setQuery] = useState("");

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return rows;
    return rows.filter(
      (row) =>
        row.name.toLowerCase().includes(q) ||
        row.email.toLowerCase().includes(q) ||
        (row.phoneNumber?.toLowerCase().includes(q) ?? false) ||
        (row.distributorName?.toLowerCase().includes(q) ?? false)
    );
  }, [query, rows]);

  const handleDownload = () => {
    exportUserReport(
      filtered.map((row) => ({
        name: row.name,
        email: getDisplayEmail(row.email) ?? "",
        phone: getDisplayPhone(row) ?? "",
        role: row.role,
        balance: row.balance,
        earnings: row.earnings,
        distributor: row.distributorName ?? "",
        retailers: row.retailerCount,
        successCount: row.successCount,
        successVolume: row.successVolume,
        pendingCount: row.pendingCount,
        status: row.isSuspended ? "Suspended" : "Active",
        joined: row.createdAt,
      })),
      downloadFileName
    );
  };

  return (
    <AdminTableCard
      description={description}
      headerAction={
        <Button variant="secondary" onPress={handleDownload}>
          <Download className="size-4" />
          Download
        </Button>
      }
      title={title}
    >
      <div className="mb-4 px-1">
        <SearchField className="max-w-md">
          <SearchField.Group>
            <SearchField.SearchIcon />
            <SearchField.Input
              placeholder="Search name, email, or phone…"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
            {query ? <SearchField.ClearButton /> : null}
          </SearchField.Group>
        </SearchField>
      </div>

      {filtered.length === 0 ? (
        <AdminTableEmpty message="No accounts match your search." />
      ) : (
        <Table>
          <Table.ScrollContainer>
            <Table.Content aria-label={title} className="min-w-[960px]">
              <Table.Header>
                <Table.Column isRowHeader>Name</Table.Column>
                <Table.Column>Contact</Table.Column>
                {showDistributor ? <Table.Column>Distributor</Table.Column> : null}
                {showRetailerCount ? <Table.Column>Retailers</Table.Column> : null}
                <Table.Column>Balance</Table.Column>
                <Table.Column>Earnings</Table.Column>
                <Table.Column>Success recharges</Table.Column>
                <Table.Column>Volume</Table.Column>
                <Table.Column>Pending</Table.Column>
                <Table.Column>Status</Table.Column>
              </Table.Header>
              <Table.Body>
                {filtered.map((row) => (
                  <Table.Row key={row.id}>
                    <Table.Cell>
                      <Link
                        className="font-medium text-foreground hover:underline"
                        href={`/admin/users/${row.id}`}
                      >
                        {row.name}
                      </Link>
                    </Table.Cell>
                    <Table.Cell>
                      <div className="text-sm">
                        <p>{getDisplayPhone(row) ?? "—"}</p>
                        <p className="text-muted">
                          {getDisplayEmail(row.email) ?? "—"}
                        </p>
                      </div>
                    </Table.Cell>
                    {showDistributor ? (
                      <Table.Cell>{row.distributorName ?? "—"}</Table.Cell>
                    ) : null}
                    {showRetailerCount ? (
                      <Table.Cell>{row.retailerCount}</Table.Cell>
                    ) : null}
                    <Table.Cell>{formatInr(row.balance)}</Table.Cell>
                    <Table.Cell>{formatInr(row.earnings)}</Table.Cell>
                    <Table.Cell>{row.successCount.toLocaleString("en-IN")}</Table.Cell>
                    <Table.Cell>{formatInr(row.successVolume)}</Table.Cell>
                    <Table.Cell>
                      {row.pendingCount > 0 ? (
                        <Chip size="sm" variant="warning">
                          {row.pendingCount}
                        </Chip>
                      ) : (
                        "0"
                      )}
                    </Table.Cell>
                    <Table.Cell>
                      {row.isSuspended ? (
                        <Chip size="sm" variant="danger">
                          Suspended
                        </Chip>
                      ) : (
                        <Chip size="sm" variant="success">
                          Active
                        </Chip>
                      )}
                    </Table.Cell>
                  </Table.Row>
                ))}
              </Table.Body>
            </Table.Content>
          </Table.ScrollContainer>
        </Table>
      )}
    </AdminTableCard>
  );
}
