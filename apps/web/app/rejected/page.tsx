import { Alert } from "@heroui/react";

import { AuthLayout } from "@/components/auth-layout";
import { ButtonLink } from "@/components/button-link";

export default function RejectedPage() {
  return (
    <AuthLayout>
      <Alert status="danger">
        <Alert.Indicator />
        <Alert.Content>
          <Alert.Title>Application rejected</Alert.Title>
          <Alert.Description>
            Your account request was not approved. Contact support if you
            believe this is a mistake.
          </Alert.Description>
        </Alert.Content>
      </Alert>

      <ButtonLink className="mt-6" href="/login" variant="secondary">
        Back to sign in
      </ButtonLink>
    </AuthLayout>
  );
}
