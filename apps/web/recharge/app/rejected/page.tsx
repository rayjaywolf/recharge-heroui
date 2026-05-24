import Link from "next/link";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { UserX, ShieldAlert } from "lucide-react";
import { LogoutButton } from "@/components/logout-button";

export default function RejectedPage() {
  return (
    <div className="flex min-h-screen items-center justify-center p-4 bg-muted/40">
      <Card className="w-full max-w-md text-center shadow-xl border-t-4 border-t-destructive">
        <CardHeader className="flex flex-col items-center">
          <div className="h-16 w-16 mb-4 rounded-full bg-red-100 flex items-center justify-center">
             <UserX className="w-8 h-8 text-destructive" />
          </div>
          <CardTitle className="text-2xl font-bold tracking-tight">Application Rejected</CardTitle>
          <CardDescription className="mt-2 text-base">
            Your KYC application was declined. You can sign out and submit a new application with the same phone number.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="bg-secondary p-4 rounded-md flex items-start gap-3 text-left">
             <ShieldAlert className="w-5 h-5 text-destructive shrink-0 mt-0.5" />
             <div className="text-sm text-secondary-foreground">
                <p className="font-semibold">What you can do</p>
                <p className="mt-1 text-muted-foreground">
                  Sign out, then register again with updated details. If you believe this was a mistake, contact support.
                </p>
             </div>
          </div>
          <div className="flex flex-col gap-2 pt-2">
            <Button asChild>
              <Link href="/register">Submit new application</Link>
            </Button>
            <div className="flex justify-center">
              <LogoutButton />
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
