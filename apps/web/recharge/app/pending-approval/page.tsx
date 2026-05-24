import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Clock, ShieldCheck } from "lucide-react";
import { LogoutButton } from "@/components/logout-button";

export default function PendingApprovalPage() {
  return (
    <div className="flex min-h-screen items-center justify-center p-4 bg-muted/40">
      <Card className="w-full max-w-md text-center shadow-xl border-t-4 border-t-amber-500">
        <CardHeader className="flex flex-col items-center">
          <div className="h-16 w-16 mb-4 rounded-full bg-amber-100 flex items-center justify-center">
             <Clock className="w-8 h-8 text-amber-600" />
          </div>
          <CardTitle className="text-2xl font-bold tracking-tight">Account Pending Approval</CardTitle>
          <CardDescription className="mt-2 text-base">
            Your registration is complete and your KYC details are currently under manual review by the administrator.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="pt-2">
            <LogoutButton />
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
