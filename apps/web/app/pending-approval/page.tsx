import { Alert } from "@heroui/react";

import { AuthLayout } from "@/components/auth-layout";
import { BackToSignInButton } from "@/components/back-to-sign-in-button";

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

      <BackToSignInButton />
    </AuthLayout>
  );
}
