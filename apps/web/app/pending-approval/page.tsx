import { Alert } from "@heroui/react";

import { AuthLayout } from "@/components/auth-layout";
import { ButtonLink } from "@/components/button-link";

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

      <ButtonLink className="mt-6" href="/login" variant="secondary">
        Back to sign in
      </ButtonLink>
    </AuthLayout>
  );
}
