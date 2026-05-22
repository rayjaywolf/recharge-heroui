import { Alert, Button } from "@heroui/react";

import { AuthLayout } from "@/components/auth-layout";

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

      <Button className="mt-6" href="/login" variant="secondary">
        Back to sign in
      </Button>
    </AuthLayout>
  );
}
