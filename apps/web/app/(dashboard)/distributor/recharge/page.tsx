import { Card } from "@heroui/react";

import { RechargeForm } from "@/components/recharge/recharge-form";
import { requireDistributor } from "@/lib/distributor-retailers";

export default async function DistributorRechargePage() {
  await requireDistributor();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-foreground">
          Recharge
        </h1>
        <p className="mt-1 text-sm text-muted">
          Initiate a new recharge directly against your distributor wallet.
        </p>
      </div>

      <Card variant="default">
        <Card.Content className="flex flex-col items-center py-6">
          <div className="w-full max-w-lg">
            <RechargeForm confirmationBasePath="/distributor/recharge/confirmation" />
          </div>
        </Card.Content>
      </Card>
    </div>
  );
}
