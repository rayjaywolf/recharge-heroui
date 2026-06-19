import { Card, Chip } from "@heroui/react";

import { RechargeConfirmationActions } from "@/components/recharge/recharge-confirmation-actions";
import { formatInr } from "@/lib/format-money";

export default async function RetailerRechargeConfirmationPage({
  searchParams,
}: {
  searchParams: Promise<{
    status?: string;
    message?: string;
    phone?: string;
    operator?: string;
    amount?: string;
    referenceId?: string;
    apiMessage?: string;
    transactionId?: string;
    provider?: string;
    circleCode?: string;
    createdAt?: string;
  }>;
}) {
  const params = await searchParams;
  const isSuccess = params.status === "success";
  const isPending = params.status === "pending";
  const isFailed = params.status === "failed";
  const amount = params.amount ? Number(params.amount) : NaN;
  const receipt =
    isSuccess &&
    !isPending &&
    params.transactionId &&
    params.phone &&
    params.operator &&
    Number.isFinite(amount)
      ? {
          transactionId: params.transactionId,
          status: "SUCCESS",
          phone: params.phone,
          operator: params.operator,
          amount,
          referenceId: params.referenceId,
          apiMessage: params.apiMessage,
          provider: params.provider,
          circleCode: params.circleCode,
          createdAt: params.createdAt,
        }
      : null;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-foreground">
          Recharge confirmation
        </h1>
        <p className="mt-1 text-sm text-muted">
          Review the final status of your recharge request.
        </p>
      </div>

      <Card variant="default">
        <Card.Header>
          <div className="flex flex-wrap items-center gap-3">
            <Card.Title>
              {isSuccess
                ? "Recharge successful"
                : isPending
                  ? "Recharge pending"
                  : "Recharge failed"}
            </Card.Title>
            <Chip
              color={isSuccess ? "success" : isPending ? "warning" : "danger"}
              size="sm"
              variant="soft"
            >
              {isSuccess ? "Success" : isPending ? "Pending" : "Failed"}
            </Chip>
          </div>
          <Card.Description>
            {params.message || "No status message was provided."}
          </Card.Description>
        </Card.Header>
        <Card.Content className="space-y-3 text-sm">
          <div>
            <p className="text-xs font-medium text-muted">Phone</p>
            <p className="font-medium text-foreground">{params.phone || "—"}</p>
          </div>
          <div>
            <p className="text-xs font-medium text-muted">Operator</p>
            <p className="font-medium text-foreground">{params.operator || "—"}</p>
          </div>
          <div>
            <p className="text-xs font-medium text-muted">Amount</p>
            <p className="font-medium text-foreground">
              {Number.isFinite(amount) ? formatInr(amount) : "—"}
            </p>
          </div>
          <div>
            <p className="text-xs font-medium text-muted">Reference ID</p>
            <p className="font-mono text-xs text-foreground">
              {params.referenceId || "—"}
            </p>
          </div>
          {params.apiMessage ? (
            <div>
              <p className="text-xs font-medium text-muted">API message</p>
              <p className="font-medium text-foreground">{params.apiMessage}</p>
            </div>
          ) : null}

          <RechargeConfirmationActions
            ledgerHref="/retailer/ledger"
            receipt={receipt}
            rechargeHref="/retailer/recharge"
            disputeHref={
              params.transactionId && (isPending || isFailed)
                ? `/retailer/support?transactionId=${encodeURIComponent(params.transactionId)}`
                : null
            }
          />
        </Card.Content>
      </Card>
    </div>
  );
}
