import { Card } from "@heroui/react";

import { RechargeForm } from "@/components/recharge/recharge-form";
import { requireRetailer } from "@/lib/retailer-auth";

export default async function RetailerRechargePage() {
  await requireRetailer();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-foreground">
          Recharge
        </h1>
        <p className="mt-1 text-sm text-muted">
          Initiate a new recharge directly against your retailer wallet.
        </p>
      </div>

      <Card variant="default">
        <Card.Content className="p-6">
          <RechargeForm confirmationBasePath="/retailer/recharge/confirmation" />
        </Card.Content>
      </Card>
    </div>
  );
}
