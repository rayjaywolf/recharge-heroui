"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Alert,
  Button,
  Description,
  Form,
  Input,
  Label,
  ListBox,
  Modal,
  Select,
  Spinner,
  TextField,
  toast,
} from "@heroui/react";

import { MpinInputOtp } from "@/components/mpin-input-otp";
import { apiFetch } from "@/lib/api-client";
import {
  normalizePhoneNumber,
  validatePhoneNumber,
} from "@/lib/phone";
import type { CircleOption, RechargeProvider } from "@/lib/recharge-config";

type RechargeConfigResponse = {
  operators: string[];
  operatorProviders: Record<string, RechargeProvider>;
  circlesByProvider: Record<RechargeProvider, CircleOption[]>;
};

function generateUUID() {
  if (typeof crypto !== "undefined" && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === "x" ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

export function RechargeForm({
  confirmationBasePath,
}: {
  confirmationBasePath: string;
}) {
  const router = useRouter();
  const isSubmitting = useRef(false);

  const [config, setConfig] = useState<RechargeConfigResponse | null>(null);
  const [configError, setConfigError] = useState<string | null>(null);
  const [loadingConfig, setLoadingConfig] = useState(true);

  const [phone, setPhone] = useState("");
  const [operator, setOperator] = useState<string | null>(null);
  const [amount, setAmount] = useState("");
  const [circleCode, setCircleCode] = useState<string | null>(null);
  const [idempotencyKey, setIdempotencyKey] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [mpinOpen, setMpinOpen] = useState(false);
  const [mpin, setMpin] = useState("");
  const [mpinInvalid, setMpinInvalid] = useState(false);
  const [mpinError, setMpinError] = useState<string | null>(null);
  const [verifyingMpin, setVerifyingMpin] = useState(false);
  const [pendingRecharge, setPendingRecharge] = useState<{
    normalizedPhone: string;
    operator: string;
    amount: number;
    circleCode?: string;
  } | null>(null);

  useEffect(() => {
    setIdempotencyKey(generateUUID());
  }, []);

  useEffect(() => {
    let cancelled = false;

    async function loadConfig() {
      try {
        const res = await apiFetch("/api/recharge/config");
        const data = await res.json();
        if (!res.ok) {
          throw new Error(data.error || "Failed to load recharge settings");
        }
        if (!cancelled) {
          setConfig({
            operators: data.operators ?? [],
            operatorProviders: data.operatorProviders ?? {},
            circlesByProvider: data.circlesByProvider ?? {},
          });
          setConfigError(null);
        }
      } catch (err) {
        if (!cancelled) {
          setConfigError(
            err instanceof Error ? err.message : "Failed to load recharge settings",
          );
        }
      } finally {
        if (!cancelled) setLoadingConfig(false);
      }
    }

    loadConfig();
    return () => {
      cancelled = true;
    };
  }, []);

  const routedProvider = operator
    ? (config?.operatorProviders[operator] ?? "TEST")
    : null;

  const circleOptions = useMemo(() => {
    if (!routedProvider || !config) return [];
    return config.circlesByProvider[routedProvider] ?? [];
  }, [config, routedProvider]);

  const circleRequired =
    routedProvider === "REALROBO" ||
    routedProvider === "MROBOTICS" ||
    routedProvider === "A1TOPUP";

  useEffect(() => {
    setCircleCode(null);
  }, [operator]);

  const goToConfirmation = (params: URLSearchParams) => {
    router.push(`${confirmationBasePath}?${params.toString()}`);
    router.refresh();
  };

  const submitRecharge = async ({
    normalizedPhone,
    operator,
    amount,
    circleCode,
    mpin,
  }: {
    normalizedPhone: string;
    operator: string;
    amount: number;
    circleCode?: string;
    mpin: string;
  }) => {
    isSubmitting.current = true;
    setSubmitting(true);

    try {
      const res = await apiFetch("/api/recharge", {
        method: "POST",
        body: JSON.stringify({
          phone: normalizedPhone,
          operator,
          amount,
          circleCode: circleCode || undefined,
          idempotencyKey,
          mpin,
        }),
      });

      const data = await res.json();
      setIdempotencyKey(generateUUID());

      const tx = data?.transaction;
      const txStatus = tx?.status as string | undefined;
      let confirmationStatus: "success" | "pending" | "failed" = "failed";
      let confirmationMessage = data.error || "Failed to process recharge";

      if (res.ok) {
        if (txStatus === "PENDING") {
          confirmationStatus = "pending";
          confirmationMessage =
            data.message || "Recharge submitted and is pending at the provider.";
        } else if (txStatus === "FAILED") {
          confirmationStatus = "failed";
          confirmationMessage =
            data.error || data.message || "Recharge failed at the provider.";
        } else {
          confirmationStatus = "success";
          confirmationMessage =
            data.message || "Recharge completed successfully.";
        }
      }

      const params = new URLSearchParams({
        status: confirmationStatus,
        message: confirmationMessage,
        phone: normalizedPhone,
        operator,
        amount: String(amount),
        referenceId: tx?.apiReferenceId || "",
        apiMessage: tx?.apiMessage || "",
      });
      if (res.ok && tx?.id) {
        params.set("transactionId", tx.id);
        if (tx.provider) params.set("provider", tx.provider);
        if (tx.circleCode) params.set("circleCode", tx.circleCode);
        if (tx.createdAt) params.set("createdAt", tx.createdAt);
      }

      goToConfirmation(params);
    } catch {
      setIdempotencyKey(generateUUID());
      const params = new URLSearchParams({
        status: "failed",
        message: "An unexpected error occurred. Please try again.",
        phone: normalizePhoneNumber(phone),
        operator,
        amount: String(amount),
        apiMessage: "",
      });
      goToConfirmation(params);
    } finally {
      isSubmitting.current = false;
      setSubmitting(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (isSubmitting.current || !operator) return;

    const numericAmount = Number(amount);
    if (!Number.isInteger(numericAmount) || numericAmount <= 0) {
      toast("Enter a whole-number recharge amount.", { variant: "danger" });
      return;
    }

    const normalizedPhone = normalizePhoneNumber(phone);
    if (!validatePhoneNumber(normalizedPhone)) {
      toast("Enter a valid 10-digit Indian mobile number.", { variant: "danger" });
      return;
    }

    if (circleRequired && !circleCode?.trim()) {
      toast("Select the mobile number's telecom circle before recharging.", {
        variant: "danger",
      });
      return;
    }

    setPendingRecharge({
      normalizedPhone,
      operator,
      amount: numericAmount,
      circleCode: circleCode || undefined,
    });
    setMpin("");
    setMpinInvalid(false);
    setMpinError(null);
    setMpinOpen(true);
  };

  const handleMpinChange = (value: string) => {
    setMpin(value);
    if (mpinInvalid || mpinError) {
      setMpinInvalid(false);
      setMpinError(null);
    }
  };

  const handleConfirmMpin = async () => {
    if (!pendingRecharge || verifyingMpin || submitting) return;

    if (!/^\d{4}$/.test(mpin)) {
      setMpinInvalid(true);
      setMpinError("Enter a valid 4-digit MPIN.");
      return;
    }

    setVerifyingMpin(true);
    setMpinInvalid(false);
    setMpinError(null);

    try {
      const verifyRes = await apiFetch("/api/profile/verify-mpin", {
        method: "POST",
        body: JSON.stringify({ mpin }),
      });
      const verifyData = await verifyRes.json();

      if (!verifyRes.ok) {
        setMpinInvalid(true);
        setMpinError(
          verifyData?.error || "Incorrect MPIN. Please try again.",
        );
        return;
      }

      setMpinOpen(false);
      await submitRecharge({ ...pendingRecharge, mpin });
      setPendingRecharge(null);
      setMpin("");
    } catch {
      setMpinInvalid(true);
      setMpinError("Could not verify MPIN. Please try again.");
    } finally {
      setVerifyingMpin(false);
    }
  };

  if (loadingConfig) {
    return (
      <div className="flex items-center justify-center gap-2 py-8 text-sm text-muted">
        <Spinner size="sm" />
        Loading recharge options…
      </div>
    );
  }

  if (configError || !config) {
    return (
      <Alert status="danger">
        <Alert.Indicator />
        <Alert.Content>
          <Alert.Title>Could not load recharge</Alert.Title>
          <Alert.Description>
            {configError ?? "Recharge configuration is unavailable."}
          </Alert.Description>
        </Alert.Content>
      </Alert>
    );
  }

  if (config.operators.length === 0) {
    return (
      <Alert status="warning">
        <Alert.Indicator />
        <Alert.Content>
          <Alert.Title>No operators configured</Alert.Title>
          <Alert.Description>
            An administrator must set up commission rules before you can
            recharge.
          </Alert.Description>
        </Alert.Content>
      </Alert>
    );
  }

  return (
    <>
      <Modal>
        <Modal.Backdrop
          isOpen={mpinOpen}
          onOpenChange={(open) => {
            setMpinOpen(open);
            if (!open) {
              setMpin("");
              setMpinInvalid(false);
              setMpinError(null);
            }
          }}
        >
          <Modal.Container>
            <Modal.Dialog className="sm:max-w-md">
              <Modal.Header>
                <Modal.Heading>Confirm MPIN</Modal.Heading>
              </Modal.Header>
              <Modal.Body className="flex flex-col items-center gap-5 py-2 text-center">
                <Description className="max-w-xs">
                  Enter your 4-digit MPIN to initiate this recharge.
                </Description>
                <MpinInputOtp
                  autoFocus
                  centered
                  errorMessage={mpinError}
                  hideLabel
                  id="recharge-mpin"
                  isInvalid={mpinInvalid}
                  value={mpin}
                  onChange={handleMpinChange}
                />
              </Modal.Body>
              <Modal.Footer>
                <Button variant="secondary" onPress={() => setMpinOpen(false)}>
                  Cancel
                </Button>
                <Button
                  isDisabled={verifyingMpin || submitting}
                  variant="primary"
                  onPress={handleConfirmMpin}
                >
                  {verifyingMpin || submitting ? <Spinner size="sm" /> : null}
                  Confirm and recharge
                </Button>
              </Modal.Footer>
            </Modal.Dialog>
          </Modal.Container>
        </Modal.Backdrop>
      </Modal>

      <Form className="grid w-full max-w-lg gap-4" onSubmit={handleSubmit}>
      <TextField isRequired name="phone" type="tel">
        <Label>Phone number</Label>
        <Input
          inputMode="numeric"
          placeholder="10-digit mobile"
          value={phone}
          variant="secondary"
          onChange={(e) => setPhone(e.target.value)}
        />
      </TextField>

      <Select
        isRequired
        className="w-full"
        placeholder="Select operator"
        value={operator}
        onChange={(value) => setOperator(value != null ? String(value) : null)}
      >
        <Label>Operator</Label>
        <Select.Trigger>
          <Select.Value />
          <Select.Indicator />
        </Select.Trigger>
        <Select.Popover>
          <ListBox>
            {config.operators.map((op) => (
              <ListBox.Item key={op} id={op} textValue={op}>
                {op}
                <ListBox.ItemIndicator />
              </ListBox.Item>
            ))}
          </ListBox>
        </Select.Popover>
      </Select>

      <TextField isRequired name="amount" type="number">
        <Label>Amount (₹)</Label>
        <Input
          min={1}
          placeholder="100"
          step={1}
          value={amount}
          variant="secondary"
          onChange={(e) => setAmount(e.target.value)}
        />
      </TextField>

      {circleOptions.length > 0 ? (
        <Select
          isRequired={circleRequired}
          className="w-full"
          placeholder={circleRequired ? "Select circle" : "Circle (optional)"}
          value={circleCode}
          onChange={(value) =>
            setCircleCode(value != null ? String(value) : null)
          }
        >
          <Label>
            {circleRequired ? "Circle" : "Circle code"}
          </Label>
          <Select.Trigger>
            <Select.Value />
            <Select.Indicator />
          </Select.Trigger>
          <Select.Popover>
            <ListBox>
              {circleOptions.map((circle) => (
                <ListBox.Item
                  key={circle.code}
                  id={circle.code}
                  textValue={circle.label}
                >
                  {circle.label} ({circle.code})
                  <ListBox.ItemIndicator />
                </ListBox.Item>
              ))}
            </ListBox>
          </Select.Popover>
        </Select>
      ) : (
        <TextField isRequired={circleRequired} name="circleCode">
          <Label>
            {circleRequired ? "Circle code" : "Circle code (optional)"}
          </Label>
          <Input
            placeholder="e.g. DL, MH"
            value={circleCode ?? ""}
            variant="secondary"
            onChange={(e) =>
              setCircleCode(e.target.value ? e.target.value.toUpperCase() : null)
            }
          />
        </TextField>
      )}

      <Button
        className="mt-2 w-full"
        isDisabled={submitting || !operator}
        type="submit"
        variant="primary"
      >
        {submitting ? <Spinner size="sm" /> : null}
        Initiate recharge
      </Button>
      </Form>
    </>
  );
}
