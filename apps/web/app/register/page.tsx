"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  Alert,
  Button,
  Card,
  Description,
  FieldGroup,
  Fieldset,
  Form,
  Input,
  Label,
  Link,
  ListBox,
  Select,
  Spinner,
  TextArea,
  TextField,
} from "@heroui/react";

import { AuthLayout } from "@/components/auth-layout";
import { apiFetch } from "@/lib/api-client";
import { authClient } from "@/lib/auth-client";
import { BUSINESS_TYPES } from "@/lib/business-types";
import { INDIAN_STATES } from "@/lib/indian-states";
import { normalizeEmail, validateEmail } from "@/lib/email";
import { normalizePhoneNumber, validatePhoneNumber } from "@/lib/phone";
import { getRegisterErrorMessage } from "./register-error";

export default function RegisterPage() {
  const [businessType, setBusinessType] = useState<string | null>(null);
  const [state, setState] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  const handleRegister = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError(null);

    const formData = new FormData(e.currentTarget);
    const name = String(formData.get("name") ?? "").trim();
    const phoneNumber = String(formData.get("phoneNumber") ?? "").trim();
    const email = String(formData.get("email") ?? "").trim();
    const password = String(formData.get("password") ?? "");
    const address = String(formData.get("address") ?? "").trim();
    const pincode = String(formData.get("pincode") ?? "").trim();
    const aadharNumber = String(formData.get("aadharNumber") ?? "").trim();
    const panNumber = String(formData.get("panNumber") ?? "").trim();
    const gstNumber = String(formData.get("gstNumber") ?? "").trim();

    if (!businessType) {
      setError("Select your business type.");
      return;
    }

    if (!state) {
      setError("Select your state.");
      return;
    }

    const normalizedPhone = normalizePhoneNumber(phoneNumber);
    if (!validatePhoneNumber(normalizedPhone)) {
      setError("Enter a valid 10-digit Indian mobile number.");
      return;
    }

    if (!email) {
      setError("Email is required.");
      return;
    }

    if (!validateEmail(normalizeEmail(email))) {
      setError("Enter a valid email address.");
      return;
    }

    setLoading(true);

    try {
      const res = await apiFetch("/api/auth/register-retailer", {
        method: "POST",
        body: JSON.stringify({
          name,
          phoneNumber: normalizedPhone,
          email: normalizeEmail(email),
          password,
          address,
          pincode,
          state,
          aadharNumber,
          panNumber,
          gstNumber,
          businessType,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(getRegisterErrorMessage(data));
        return;
      }

      const signIn = await authClient.signIn.phoneNumber({
        phoneNumber: normalizedPhone,
        password,
      });

      if (signIn.error) {
        setError(
          signIn.error.message ||
            "Account created but sign-in failed. Try signing in."
        );
        router.push("/login");
        return;
      }

      router.push("/pending-approval");
      router.refresh();
    } catch {
      setError("Registration failed. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthLayout
      wide
      footer={
        <p className="text-sm text-muted">
          Already registered?{" "}
          <Link className="text-sm" href="/login">
            Sign in
          </Link>
        </p>
      }
    >
      <Card className="w-full">
        <Card.Header>
          <Card.Title>Retailer application</Card.Title>
          <Card.Description>
            Submit your KYC details. An admin will approve your account before
            you can recharge.
          </Card.Description>
        </Card.Header>

        <Form onSubmit={handleRegister}>
          <Card.Content>
            <div className="flex flex-col gap-8">
              {error ? (
                <Alert status="danger">
                  <Alert.Indicator />
                  <Alert.Content>
                    <Alert.Title>Could not register</Alert.Title>
                    <Alert.Description>{error}</Alert.Description>
                  </Alert.Content>
                </Alert>
              ) : null}

              <Fieldset>
                <Fieldset.Legend>Account</Fieldset.Legend>
                <Description>Login credentials for your store.</Description>
                <FieldGroup className="mt-4 grid gap-4 sm:grid-cols-2">
                  <TextField isRequired name="name">
                    <Label htmlFor="register-full-name">Full name</Label>
                    <Input
                      autoComplete="name"
                      id="register-full-name"
                      name="name"
                      placeholder="John Doe"
                      type="text"
                      variant="secondary"
                    />
                  </TextField>
                  <TextField isRequired name="phoneNumber" type="tel">
                    <Label htmlFor="register-phone">Phone number</Label>
                    <Input
                      autoComplete="tel-national"
                      id="register-phone"
                      inputMode="numeric"
                      name="phoneNumber"
                      placeholder="10-digit mobile"
                      type="tel"
                      variant="secondary"
                    />
                  </TextField>
                  <TextField isRequired name="email" type="email">
                    <Label htmlFor="register-email">Email</Label>
                    <Input
                      autoComplete="email"
                      id="register-email"
                      name="email"
                      placeholder="you@example.com"
                      type="email"
                      variant="secondary"
                    />
                  </TextField>
                  <TextField
                    className="sm:col-span-2"
                    isRequired
                    name="password"
                    type="password"
                  >
                    <Label htmlFor="register-password">Password</Label>
                    <Input
                      autoComplete="new-password"
                      id="register-password"
                      name="password"
                      placeholder="••••••••"
                      type="password"
                      variant="secondary"
                    />
                  </TextField>
                </FieldGroup>
              </Fieldset>

              <Fieldset>
                <Fieldset.Legend>KYC</Fieldset.Legend>
                <Description>Identity and business classification.</Description>
                <FieldGroup className="mt-4 grid gap-4 sm:grid-cols-2">
                  <TextField isRequired name="aadharNumber">
                    <Label>Aadhar number</Label>
                    <Input placeholder="12 digits" variant="secondary" />
                  </TextField>
                  <TextField isRequired name="panNumber">
                    <Label>PAN</Label>
                    <Input
                      className="uppercase"
                      placeholder="ABCDE1234F"
                      variant="secondary"
                    />
                  </TextField>
                  <TextField name="gstNumber">
                    <Label>GST (optional)</Label>
                    <Input
                      className="uppercase"
                      placeholder="GSTIN"
                      variant="secondary"
                    />
                  </TextField>
                  <Select
                    isRequired
                    className="w-full"
                    placeholder="Business type"
                    value={businessType}
                    onChange={(value) => setBusinessType(value)}
                  >
                    <Label>Business type</Label>
                    <Select.Trigger>
                      <Select.Value />
                      <Select.Indicator />
                    </Select.Trigger>
                    <Select.Popover>
                      <ListBox>
                        {BUSINESS_TYPES.map((type) => (
                          <ListBox.Item
                            key={type.id}
                            id={type.id}
                            textValue={type.label}
                          >
                            {type.label}
                            <ListBox.ItemIndicator />
                          </ListBox.Item>
                        ))}
                      </ListBox>
                    </Select.Popover>
                  </Select>
                </FieldGroup>
              </Fieldset>

              <Fieldset>
                <Fieldset.Legend>Location</Fieldset.Legend>
                <Description>Where your business operates.</Description>
                <FieldGroup className="mt-4 grid gap-4 sm:grid-cols-2">
                  <TextField
                    className="sm:col-span-2"
                    isRequired
                    name="address"
                  >
                    <Label>Address</Label>
                    <TextArea
                      placeholder="Shop / street address"
                      variant="secondary"
                    />
                  </TextField>
                  <TextField isRequired name="pincode">
                    <Label>Pincode</Label>
                    <Input placeholder="110001" variant="secondary" />
                  </TextField>
                  <Select
                    isRequired
                    className="w-full"
                    placeholder="State / UT"
                    value={state}
                    onChange={(value) => setState(value)}
                  >
                    <Label>State</Label>
                    <Select.Trigger>
                      <Select.Value />
                      <Select.Indicator />
                    </Select.Trigger>
                    <Select.Popover>
                      <ListBox>
                        {INDIAN_STATES.map((st) => (
                          <ListBox.Item key={st} id={st} textValue={st}>
                            {st}
                            <ListBox.ItemIndicator />
                          </ListBox.Item>
                        ))}
                      </ListBox>
                    </Select.Popover>
                  </Select>
                </FieldGroup>
              </Fieldset>
            </div>
          </Card.Content>

          <Card.Footer className="mt-4">
            <Button fullWidth isDisabled={loading} type="submit" variant="primary">
              {loading ? <Spinner size="sm" /> : null}
              Submit application
            </Button>
          </Card.Footer>
        </Form>
      </Card>
    </AuthLayout>
  );
}
