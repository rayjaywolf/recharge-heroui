"use client";

import { useState } from "react";
import { ArrowLeft } from "lucide-react";
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
  ListBox,
  Select,
  Spinner,
  TextArea,
  TextField,
  toast,
} from "@heroui/react";

import { apiFetch } from "@/lib/api-client";
import { BUSINESS_TYPES } from "@/lib/business-types";
import { INDIAN_STATES } from "@/lib/indian-states";
import { normalizePhoneNumber, validatePhoneNumber } from "@/lib/phone";

export default function AddDistributorRetailerPage() {
  const [businessType, setBusinessType] = useState<string | null>(null);
  const [state, setState] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError(null);

    const formData = new FormData(e.currentTarget);
    const name = String(formData.get("name") ?? "").trim();
    const phoneNumber = String(formData.get("phoneNumber") ?? "").trim();
    const password = String(formData.get("password") ?? "");
    const address = String(formData.get("address") ?? "").trim();
    const pincode = String(formData.get("pincode") ?? "").trim();
    const aadharNumber = String(formData.get("aadharNumber") ?? "").trim();
    const panNumber = String(formData.get("panNumber") ?? "")
      .trim()
      .toUpperCase();
    const gstNumber = String(formData.get("gstNumber") ?? "")
      .trim()
      .toUpperCase();

    if (!businessType) {
      setError("Select a business type.");
      return;
    }

    if (!state) {
      setError("Select a state.");
      return;
    }

    const normalizedPhone = normalizePhoneNumber(phoneNumber);
    if (!validatePhoneNumber(normalizedPhone)) {
      setError("Enter a valid 10-digit Indian mobile number.");
      return;
    }

    setLoading(true);

    try {
      const res = await apiFetch("/api/distributor/retailer", {
        method: "POST",
        body: JSON.stringify({
          name,
          phoneNumber: normalizedPhone,
          password,
          address,
          pincode,
          state,
          aadharNumber,
          panNumber,
          gstNumber: gstNumber || undefined,
          businessType,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || "Failed to create retailer.");
        return;
      }

      toast(
        data.message ||
          "Retailer created. They are pending admin verification.",
        { variant: "success" },
      );
      router.push("/distributor/retailers");
      router.refresh();
    } catch {
      setError("Failed to create retailer. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="mx-auto max-w-3xl space-y-6 pb-12">
      <Button
        className="-ml-2 w-fit"
        href="/distributor/retailers"
        variant="ghost"
      >
        <ArrowLeft className="size-4" aria-hidden />
        Back to retailers
      </Button>

      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-foreground">
          Onboard retailer
        </h1>
        <p className="mt-1 text-sm text-muted">
          Submit KYC details for a new retailer mapped to your network.
        </p>
      </div>

      <Card>
        <Card.Header>
          <Card.Title>Retailer details</Card.Title>
          <Card.Description>
            The account stays pending until an admin approves KYC.
          </Card.Description>
        </Card.Header>

        <Form onSubmit={handleSubmit}>
          <Card.Content>
            <div className="flex flex-col gap-8">
              {error ? (
                <Alert status="danger">
                  <Alert.Indicator />
                  <Alert.Content>
                    <Alert.Title>Could not create retailer</Alert.Title>
                    <Alert.Description>{error}</Alert.Description>
                  </Alert.Content>
                </Alert>
              ) : null}

              <Fieldset>
                <Fieldset.Legend>Account</Fieldset.Legend>
                <Description>Login credentials for the retailer.</Description>
                <FieldGroup className="mt-4 grid gap-4 sm:grid-cols-2">
                  <TextField isRequired name="name">
                    <Label>Full name</Label>
                    <Input placeholder="John Doe" variant="secondary" />
                  </TextField>
                  <TextField isRequired name="phoneNumber" type="tel">
                    <Label>Phone number</Label>
                    <Input
                      inputMode="numeric"
                      placeholder="10-digit mobile"
                      variant="secondary"
                    />
                  </TextField>
                  <TextField
                    className="sm:col-span-2"
                    isRequired
                    name="password"
                    type="password"
                  >
                    <Label>Initial password</Label>
                    <Input placeholder="••••••••" variant="secondary" />
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
                <Description>Where the business operates.</Description>
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
              Submit KYC & create retailer
            </Button>
          </Card.Footer>
        </Form>
      </Card>
    </div>
  );
}
