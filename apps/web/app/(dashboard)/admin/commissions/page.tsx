import { asc } from "drizzle-orm";
import { commissionRule, db } from "@repo/db";

import {
  CommissionRulesTable,
  type CommissionRuleRow,
} from "@/components/admin/commission-rules-table";

export default async function AdminCommissionsPage() {
  const rules = await db
    .select()
    .from(commissionRule)
    .orderBy(asc(commissionRule.operator));

  const rows: CommissionRuleRow[] = rules.map((rule) => ({
    id: rule.id,
    operator: rule.operator,
    providerMargin: rule.providerMargin,
    adminMargin: rule.adminMargin,
    distributorMargin: rule.distributorMargin,
    retailerMargin: rule.retailerMargin,
  }));

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-foreground">
          Commission rules
        </h1>
        <p className="mt-1 text-sm text-muted">
          Manage default commission rates per operator. These apply to all users
          unless overridden for an individual retailer on their user profile.
        </p>
      </div>

      <CommissionRulesTable initialRules={rows} />
    </div>
  );
}
