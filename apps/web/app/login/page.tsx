"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  Alert,
  Button,
  Card,
  Form,
  Input,
  Label,
  Link,
  Spinner,
  TextField,
} from "@heroui/react";

import { AuthLayout } from "@/components/auth-layout";
import { authClient } from "@/lib/auth-client";
import {
  isEmailLoginIdentifier,
  normalizePhoneNumber,
  validatePhoneNumber,
} from "@/lib/phone";

export default function LoginPage() {
  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  const handleLogin = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError(null);

    const trimmed = identifier.trim();
    if (!trimmed) {
      setError("Enter your phone number or email.");
      return;
    }

    if (!password) {
      setError("Enter your password.");
      return;
    }

    const fetchOptions = {
      onSuccess: () => {
        router.push("/");
        router.refresh();
      },
      onError: (ctx: { error: { message: string } }) => {
        setError(ctx.error.message || "Sign in failed. Check your credentials.");
      },
    };

    setLoading(true);

    try {
      if (isEmailLoginIdentifier(trimmed)) {
        await authClient.signIn.email({
          email: trimmed,
          password,
          fetchOptions,
        });
        return;
      }

      const normalized = normalizePhoneNumber(trimmed);
      if (!validatePhoneNumber(normalized)) {
        setError("Enter a valid 10-digit mobile number or your account email.");
        return;
      }

      await authClient.signIn.phoneNumber({
        phoneNumber: normalized,
        password,
        fetchOptions,
      });
    } catch (err) {
      console.error("Sign in error:", err);
      setError(
        err instanceof Error
          ? err.message
          : "Could not reach the server. Check API_URL on Vercel and redeploy.",
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthLayout
      footer={
        <p className="text-sm text-muted">
          New retailer?{" "}
          <Link className="text-sm" href="/register">
            Create an account
          </Link>
        </p>
      }
    >
      <Card className="w-full">
        <Card.Header>
          <Card.Title>Sign in</Card.Title>
          <Card.Description>
            Use your mobile number or email and password.
          </Card.Description>
        </Card.Header>

        <Form noValidate onSubmit={handleLogin}>
          <Card.Content>
            <div className="flex flex-col gap-4">
              {error ? (
                <Alert status="danger">
                  <Alert.Indicator />
                  <Alert.Content>
                    <Alert.Title>Could not sign in</Alert.Title>
                    <Alert.Description>{error}</Alert.Description>
                  </Alert.Content>
                </Alert>
              ) : null}

              <TextField isRequired name="identifier" type="text">
                <Label>Phone or email</Label>
                <Input
                  autoComplete="username"
                  placeholder="10-digit mobile or you@example.com"
                  value={identifier}
                  variant="secondary"
                  onChange={(e) => setIdentifier(e.target.value)}
                />
              </TextField>

              <TextField isRequired name="password" type="password">
                <Label>Password</Label>
                <Input
                  placeholder="••••••••"
                  value={password}
                  variant="secondary"
                  onChange={(e) => setPassword(e.target.value)}
                />
              </TextField>
            </div>
          </Card.Content>

          <Card.Footer className="mt-4 flex flex-col gap-2">
            <Button fullWidth isDisabled={loading} type="submit" variant="primary">
              {loading ? <Spinner size="sm" /> : null}
              Sign in
            </Button>
          </Card.Footer>
        </Form>
      </Card>
    </AuthLayout>
  );
}
