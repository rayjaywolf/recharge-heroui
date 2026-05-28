"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { SearchField, Table } from "@heroui/react";

import {
  AdminTableCard,
  AdminTableEmpty,
} from "@/components/admin/admin-table-card";
import { RetailerStatusChip } from "@/components/distributor/retailer-status-chip";
import { Money } from "@/components/money";
import type { DistributorRetailerRow } from "@/lib/distributor-retailers";
import { getDisplayEmail, getDisplayPhone } from "@/lib/phone";

export function DistributorRetailersTable({
  initialData,
}: {
  initialData: DistributorRetailerRow[];
}) {
  const [query, setQuery] = useState("");
  const router = useRouter();

  const filteredData = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return initialData;

    return initialData.filter((retailer) => {
      const phone = getDisplayPhone(retailer);
      const email = getDisplayEmail(retailer.email);
      return (
        retailer.name.toLowerCase().includes(q) ||
        (email?.toLowerCase().includes(q) ?? false) ||
        (phone?.includes(q) ?? false)
      );
    });
  }, [initialData, query]);

  return (
    <AdminTableCard
      description="Search by name, email, or phone."
      title={`Retailers (${initialData.length})`}
    >
      <div className="mb-4">
        <SearchField className="max-w-sm">
          <SearchField.Group>
            <SearchField.SearchIcon />
            <SearchField.Input
              placeholder="Search your retailers…"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
            {query ? <SearchField.ClearButton /> : null}
          </SearchField.Group>
        </SearchField>
      </div>

      {filteredData.length === 0 ? (
        <AdminTableEmpty
          message={
            initialData.length === 0
              ? "No assigned retailers yet."
              : "No retailers match your search."
          }
        />
      ) : (
        <Table>
          <Table.ScrollContainer>
            <Table.Content
              aria-label="Distributor retailers"
              className="min-w-[880px]"
            >
              <Table.Header>
                <Table.Column isRowHeader>Retailer</Table.Column>
                <Table.Column>Email</Table.Column>
                <Table.Column>Phone</Table.Column>
                <Table.Column>Wallet balance</Table.Column>
                <Table.Column>Tx volume</Table.Column>
                <Table.Column>Status</Table.Column>
              </Table.Header>
              <Table.Body>
                {filteredData.map((retailer) => (
                  <Table.Row
                    key={retailer.id}
                    className={`cursor-pointer whitespace-nowrap ${retailer.accountStatus === "SUSPENDED" ? "opacity-70" : ""}`}
                    onAction={() =>
                      router.push(`/distributor/retailers/${retailer.id}`)
                    }
                  >
                    <Table.Cell className="font-semibold">{retailer.name}</Table.Cell>
                    <Table.Cell className="text-sm text-muted">
                      {getDisplayEmail(retailer.email) ?? "—"}
                    </Table.Cell>
                    <Table.Cell className="font-mono text-sm text-muted">
                      {getDisplayPhone(retailer) ?? "—"}
                    </Table.Cell>
                    <Table.Cell className="font-semibold">
                      <Money amount={retailer.balance} />
                    </Table.Cell>
                    <Table.Cell className="text-muted">
                      {retailer.transactionCount.toLocaleString("en-IN")} total
                    </Table.Cell>
                    <Table.Cell>
                      <RetailerStatusChip
                        accountStatus={retailer.accountStatus}
                      />
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
