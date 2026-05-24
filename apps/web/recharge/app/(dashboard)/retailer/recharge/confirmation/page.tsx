import Link from "next/link"
import { Badge } from "@/components/ui/badge"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { ReceiptActions } from "./receipt-actions"

type ConfirmationPageProps = {
  searchParams: Promise<{
    status?: string
    message?: string
    phone?: string
    operator?: string
    amount?: string
    referenceId?: string
    apiMessage?: string
  }>
}

export default async function RechargeConfirmationPage({
  searchParams,
}: ConfirmationPageProps) {
  const params = await searchParams
  const isSuccess = params.status === "success"

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">
          Recharge Confirmation
        </h1>
        <p className="mt-2 text-muted-foreground">
          Review the final status of your recharge request.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-3">
            <span>{isSuccess ? "Recharge Successful" : "Recharge Failed"}</span>
            <Badge variant={isSuccess ? "default" : "destructive"}>
              {isSuccess ? "Success" : "Failed"}
            </Badge>
          </CardTitle>
          <CardDescription>
            {params.message || "No status message was provided."}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="text-sm">
            <span className="text-muted-foreground">Phone:</span>{" "}
            {params.phone || "-"}
          </div>
          <div className="text-sm">
            <span className="text-muted-foreground">Operator:</span>{" "}
            {params.operator || "-"}
          </div>
          <div className="text-sm">
            <span className="text-muted-foreground">Amount:</span>{" "}
            {params.amount ? `INR ${params.amount}` : "-"}
          </div>
          <div className="text-sm">
            <span className="text-muted-foreground">Reference ID:</span>{" "}
            {params.referenceId || "-"}
          </div>
          {params.apiMessage && (
            <div className="text-sm">
              <span className="text-muted-foreground">API Message:</span>{" "}
              <span className="font-medium">{params.apiMessage}</span>
            </div>
          )}

          <ReceiptActions />
        </CardContent>
      </Card>
    </div>
  )
}
