import { asc, eq } from "drizzle-orm";
import { Chip, Table } from "@heroui/react";
import { commissionRule, db, retailerCommissionOverride } from "@repo/db";

import {
  AdminTableCard,
  AdminTableEmpty,
} from "@/components/admin/admin-table-card";
import { requireRetailer } from "@/lib/retailer-auth";

function formatPercent(value: number) {
  return `${value.toFixed(2)}%`;
}

export default async function RetailerCommissionsPage() {
  const retailer = await requireRetailer();

  const [rules, overrides] = await Promise.all([
    db
      .select({
        id: commissionRule.id,
        operator: commissionRule.operator,
        retailerMargin: commissionRule.retailerMargin,
      })
      .from(commissionRule)
      .orderBy(asc(commissionRule.operator)),
    db
      .select({
        operator: retailerCommissionOverride.operator,
        retailerMargin: retailerCommissionOverride.retailerMargin,
      })
      .from(retailerCommissionOverride)
      .where(eq(retailerCommissionOverride.userId, retailer.id)),
  ]);

  const overrideByOperator = new Map(
    overrides.map((row) => [row.operator, row.retailerMargin]),
  );

  const rows = rules.map((rule) => {
    const customMargin = overrideByOperator.get(rule.operator);
    return {
      ...rule,
      retailerMargin: customMargin ?? rule.retailerMargin,
      isCustom: customMargin != null,
    };
  });

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
        description="Default platform rates apply unless your account has custom rates set by an administrator."
        title="Commission structures"
      >
        {rows.length === 0 ? (
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
                  {rows.map((rule) => (
                    <Table.Row key={rule.id} className="whitespace-nowrap">
                      <Table.Cell className="font-semibold">
                        <div className="flex items-center gap-2">
                          {rule.operator}
                          {rule.isCustom ? (
                            <Chip color="accent" size="sm" variant="soft">
                              Custom
                            </Chip>
                          ) : null}
                        </div>
                      </Table.Cell>
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
