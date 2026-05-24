import { Alert, Button } from "@heroui/react";

import { AuthLayout } from "@/components/auth-layout";

export default function PendingApprovalPage() {
  return (
    <AuthLayout>
      <Alert status="accent">
        <Alert.Indicator />
        <Alert.Content>
          <Alert.Title>Application submitted</Alert.Title>
          <Alert.Description>
            Your retailer account is waiting for admin approval. You will be
            able to sign in and recharge once approved.
          </Alert.Description>
        </Alert.Content>
      </Alert>

      <Button className="mt-6" href="/login" variant="secondary">
        Back to sign in
      </Button>
    </AuthLayout>
  );
}
