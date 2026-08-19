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
  Modal,
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
  const [aadharVerified, setAadharVerified] = useState(false);
  const [verifyingAadhar, setVerifyingAadhar] = useState(false);
  const [otpModalOpen, setOtpModalOpen] = useState(false);
  const [otpValue, setOtpValue] = useState("");
  const [otpLoading, setOtpLoading] = useState(false);
  const [refId, setRefId] = useState("");
  const [aadhaarToken, setAadhaarToken] = useState("");
  const [aadharInput, setAadharInput] = useState("");
  const [otpError, setOtpError] = useState<string | null>(null);
  const [businessType, setBusinessType] = useState<string | null>(null);
  const [state, setState] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  const handleSendAadhaarOtp = async () => {
    const cleanAadhar = aadharInput.replace(/\s+/g, "");
    if (cleanAadhar.length !== 12) {
      setError("Aadhaar number must be exactly 12 numeric digits.");
      return;
    }
    setVerifyingAadhar(true);
    setError(null);
    try {
      const res = await apiFetch("/api/auth/aadhaar/send-otp", {
        method: "POST",
        body: JSON.stringify({ aadharNumber: cleanAadhar }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to send OTP.");
      }
      setRefId(data.refId);
      setOtpModalOpen(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to trigger Aadhaar verification.");
    } finally {
      setVerifyingAadhar(false);
    }
  };

  const handleVerifyAadhaarOtp = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!otpValue) {
      setOtpError("OTP is required.");
      return;
    }
    setOtpLoading(true);
    setOtpError(null);
    try {
      const res = await apiFetch("/api/auth/aadhaar/verify-otp", {
        method: "POST",
        body: JSON.stringify({
          aadharNumber: aadharInput.replace(/\s+/g, ""),
          otp: otpValue,
          refId,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to verify OTP.");
      }
      setAadhaarToken(data.aadhaarToken);
      setAadharVerified(true);
      setOtpModalOpen(false);
    } catch (err) {
      setOtpError(err instanceof Error ? err.message : "Failed to verify Aadhaar OTP.");
    } finally {
      setOtpLoading(false);
    }
  };

  const handleRegister = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError(null);

    const formData = new FormData(e.currentTarget);
    const name = String(formData.get("name") ?? "").trim();
    const storeName = String(formData.get("storeName") ?? "").trim();
    const phoneNumber = String(formData.get("phoneNumber") ?? "").trim();
    const email = String(formData.get("email") ?? "").trim();
    const password = String(formData.get("password") ?? "");
    const address = String(formData.get("address") ?? "").trim();
    const pincode = String(formData.get("pincode") ?? "").trim();
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

    if (!storeName) {
      setError("Store name is required.");
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

    const cleanAadhar = aadharInput.replace(/\s+/g, "");
    if (!cleanAadhar) {
      setError("Aadhaar number is required.");
      return;
    }
    if (!/^\d{12}$/.test(cleanAadhar)) {
      setError("Aadhaar number must be exactly 12 numeric digits.");
      return;
    }
    if (!aadharVerified || !aadhaarToken) {
      setError("Please verify your Aadhaar number with OTP before submitting the application.");
      return;
    }

    setLoading(true);

    try {
      const res = await apiFetch("/api/auth/register-retailer", {
        method: "POST",
        body: JSON.stringify({
          name,
          storeName,
          phoneNumber: normalizedPhone,
          email: normalizeEmail(email),
          password,
          address,
          pincode,
          state,
          aadharNumber: cleanAadhar,
          aadhaarToken,
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
                  <TextField isRequired name="storeName">
                    <Label htmlFor="register-store-name">Store name</Label>
                    <Input
                      autoComplete="organization"
                      id="register-store-name"
                      name="storeName"
                      placeholder="Your shop / store name"
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
                  <div className="flex flex-col gap-1">
                    <Label className="text-sm font-medium">Aadhar number</Label>
                    <div className="flex gap-2">
                      <Input
                        name="aadharNumber"
                        placeholder="12 digits"
                        variant="secondary"
                        value={aadharInput}
                        onChange={(e) => setAadharInput(e.target.value.replace(/\D/g, "").slice(0, 12))}
                        readOnly={aadharVerified}
                        required
                        className="flex-1"
                      />
                      <Button
                        type="button"
                        variant={aadharVerified ? "success" : "secondary"}
                        isDisabled={aadharInput.length !== 12 || verifyingAadhar || aadharVerified}
                        onClick={handleSendAadhaarOtp}
                        className="shrink-0"
                      >
                        {verifyingAadhar ? <Spinner size="sm" /> : aadharVerified ? "Verified ✓" : "Verify"}
                      </Button>
                    </div>
                  </div>
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

      <Modal>
        <Modal.Backdrop isOpen={otpModalOpen} isDismissable={false}>
          <Modal.Container>
            <Modal.Dialog className="sm:max-w-md">
              <Modal.Header>
                <Modal.Heading>Aadhaar OTP Verification</Modal.Heading>
              </Modal.Header>
              <Modal.Body className="space-y-4">
                {otpError ? (
                  <Alert status="danger">
                    <Alert.Indicator />
                    <Alert.Content>
                      <Alert.Description>{otpError}</Alert.Description>
                    </Alert.Content>
                  </Alert>
                ) : null}
                <p className="text-left text-sm text-muted">
                  Please enter the 6-digit OTP sent to the mobile number registered with your Aadhaar card.
                </p>
                <Form onSubmit={handleVerifyAadhaarOtp}>
                  <div className="space-y-4 w-full">
                    <TextField isRequired name="otp">
                      <Label>One-Time Password (OTP)</Label>
                      <Input
                        autoFocus
                        placeholder="Enter 6-digit OTP"
                        value={otpValue}
                        variant="secondary"
                        onChange={(e) => setOtpValue(e.target.value.replace(/\D/g, "").slice(0, 6))}
                      />
                    </TextField>
                    <div className="flex gap-2">
                      <Button
                        type="button"
                        variant="secondary"
                        className="flex-1"
                        onClick={() => {
                          setOtpModalOpen(false);
                          setOtpValue("");
                          setOtpError(null);
                        }}
                      >
                        Cancel
                      </Button>
                      <Button
                        type="submit"
                        variant="primary"
                        className="flex-1"
                        isDisabled={otpValue.length < 4 || otpLoading}
                      >
                        {otpLoading ? <Spinner size="sm" /> : null}
                        Verify OTP
                      </Button>
                    </div>
                  </div>
                </Form>
              </Modal.Body>
            </Modal.Dialog>
          </Modal.Container>
        </Modal.Backdrop>
      </Modal>
    </AuthLayout>
  );
}
