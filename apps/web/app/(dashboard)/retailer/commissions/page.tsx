import { asc } from "drizzle-orm";
import { Table } from "@heroui/react";
import { commissionRule, db } from "@repo/db";

import {
  AdminTableCard,
  AdminTableEmpty,
} from "@/components/admin/admin-table-card";
import { requireRetailer } from "@/lib/retailer-auth";

function formatPercent(value: number) {
  return `${value.toFixed(2)}%`;
}

export default async function RetailerCommissionsPage() {
  await requireRetailer();

  const rules = await db
    .select({
      id: commissionRule.id,
      operator: commissionRule.operator,
      retailerMargin: commissionRule.retailerMargin,
    })
    .from(commissionRule)
    .orderBy(asc(commissionRule.operator));

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-foreground">
          Commissions
        </h1>
        <p className="mt-1 text-sm text-muted">
          Commission rates you earn on your successful recharges.
        </p>
      </div>

      <AdminTableCard
        description="System-wide margins defined by the platform administrator."
        title="Commission structures"
      >
        {rules.length === 0 ? (
          <AdminTableEmpty message="No commission rules configured yet." />
        ) : (
          <Table>
            <Table.ScrollContainer>
              <Table.Content aria-label="Commission rates" className="min-w-[380px]">
                <Table.Header>
                  <Table.Column isRowHeader>Operator</Table.Column>
                  <Table.Column className="text-right">Your margin</Table.Column>
                </Table.Header>
                <Table.Body>
                  {rules.map((rule) => (
                    <Table.Row key={rule.id} className="whitespace-nowrap">
                      <Table.Cell className="font-semibold">{rule.operator}</Table.Cell>
                      <Table.Cell className="text-right font-semibold">
                        <span className="text-success">
                          {formatPercent(rule.retailerMargin)}
                        </span>
                      </Table.Cell>
                    </Table.Row>
                  ))}
                </Table.Body>
              </Table.Content>
            </Table.ScrollContainer>
          </Table>
        )}
      </AdminTableCard>
    </div>
  );
}
