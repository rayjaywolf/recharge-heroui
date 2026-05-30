"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
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
import { RechargePlansPicker } from "@/components/recharge/recharge-plans-picker";
import type { CircleOption, RechargeProvider } from "@/lib/recharge-config";
import type {
  RechargePlanCategory,
  RechargePlansApiResponse,
} from "@/lib/recharge-plans";

type RechargeConfigResponse = {
  operators: string[];
  operatorProviders: Record<string, RechargeProvider>;
  circlesByProvider: Record<RechargeProvider, CircleOption[]>;
  operatorLookupEnabled?: boolean;
  rechargePlansEnabled?: boolean;
};

type OperatorLookupResponse = {
  operator: string;
  circleCode: string | null;
  circleLabel: string | null;
  planapi?: {
    operator: string;
    opCode: string;
    circle: string;
    circleCode: string;
  };
  plans?: RechargePlansApiResponse | null;
  error?: string;
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
  const isNavigatingAwayRef = useRef(false);

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
  const [confirming, setConfirming] = useState(false);
  const [pendingRecharge, setPendingRecharge] = useState<{
    normalizedPhone: string;
    operator: string;
    amount: number;
    circleCode?: string;
  } | null>(null);
  const [lookupLoading, setLookupLoading] = useState(false);
  const [plansLoading, setPlansLoading] = useState(false);
  const [planCategories, setPlanCategories] = useState<RechargePlanCategory[]>(
    [],
  );
  const skipCircleResetRef = useRef(false);
  const lastLookupPhoneRef = useRef<string | null>(null);
  const pendingLookupCircleRef = useRef<string | null>(null);
  const plansScopeRef = useRef<string | null>(null);
  const planapiCodesRef = useRef<{ opCode: string; circleCode: string } | null>(
    null,
  );

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
            operatorLookupEnabled: Boolean(data.operatorLookupEnabled),
            rechargePlansEnabled: Boolean(data.rechargePlansEnabled),
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
    if (skipCircleResetRef.current) {
      skipCircleResetRef.current = false;
      return;
    }
    setCircleCode(null);
  }, [operator]);

  /** Apply circle after operator lookup once provider circle list is available. */
  useEffect(() => {
    const pending = pendingLookupCircleRef.current;
    if (!pending || !operator || circleOptions.length === 0) return;

    if (circleOptions.some((c) => c.code === pending)) {
      skipCircleResetRef.current = true;
      setCircleCode(pending);
      pendingLookupCircleRef.current = null;
    }
  }, [operator, circleOptions]);

  const applyPlansFromLookup = useCallback(
    (data: OperatorLookupResponse) => {
      if (!config?.rechargePlansEnabled) {
        setPlanCategories([]);
        plansScopeRef.current = null;
        return;
      }

      const scope = `${data.operator}:${data.circleCode ?? ""}`;
      plansScopeRef.current = scope;
      planapiCodesRef.current =
        data.planapi?.opCode && data.planapi?.circleCode
          ? {
              opCode: data.planapi.opCode,
              circleCode: data.planapi.circleCode,
            }
          : null;
      setPlanCategories(data.plans?.categories ?? []);
    },
    [config?.rechargePlansEnabled],
  );

  const fetchPlansForSelection = useCallback(
    async (params: {
      operator: string;
      circleCode: string | null;
      planapiOpCode?: string;
      planapiCircleCode?: string;
    }) => {
      if (!config?.rechargePlansEnabled || !params.operator) return;

      const scope = `${params.operator}:${params.circleCode ?? ""}`;
      if (plansScopeRef.current === scope) {
        return;
      }

      setPlansLoading(true);
      try {
        const query = new URLSearchParams({ operator: params.operator });
        if (params.circleCode) query.set("circleCode", params.circleCode);
        if (params.planapiOpCode) query.set("planapiOpCode", params.planapiOpCode);
        if (params.planapiCircleCode) {
          query.set("planapiCircleCode", params.planapiCircleCode);
        }

        const res = await apiFetch(`/api/recharge/plans?${query.toString()}`);
        const data = (await res.json()) as RechargePlansApiResponse & {
          error?: string;
        };

        if (!res.ok) {
          setPlanCategories([]);
          plansScopeRef.current = null;
          return;
        }

        plansScopeRef.current = scope;
        setPlanCategories(data.categories ?? []);
      } catch {
        setPlanCategories([]);
        plansScopeRef.current = null;
      } finally {
        setPlansLoading(false);
      }
    },
    [config?.rechargePlansEnabled],
  );

  const runOperatorLookup = useCallback(
    async (normalized: string) => {
      if (!config) {
        setLookupLoading(false);
        return;
      }
      if (!validatePhoneNumber(normalized)) {
        setLookupLoading(false);
        return;
      }
      if (lastLookupPhoneRef.current === normalized) {
        setLookupLoading(false);
        return;
      }

      try {
        const res = await apiFetch(
          `/api/recharge/operator-lookup?phone=${encodeURIComponent(normalized)}`,
        );
        const data = (await res.json()) as OperatorLookupResponse;

        if (!res.ok) {
          lastLookupPhoneRef.current = normalized;
          setPlanCategories([]);
          plansScopeRef.current = null;
          planapiCodesRef.current = null;
          toast(
            "Unable to fetch operator information. Please enter operator and circle manually.",
            { variant: "danger" },
          );
          return;
        }

        lastLookupPhoneRef.current = normalized;
        pendingLookupCircleRef.current = data.circleCode ?? null;
        skipCircleResetRef.current = true;
        setOperator(data.operator);
        applyPlansFromLookup(data);
      } catch {
        lastLookupPhoneRef.current = normalized;
        setPlanCategories([]);
        plansScopeRef.current = null;
        planapiCodesRef.current = null;
        toast(
          "Unable to fetch operator information. Please enter operator and circle manually.",
          { variant: "danger" },
        );
      } finally {
        setLookupLoading(false);
      }
    },
    [config, applyPlansFromLookup],
  );

  useEffect(() => {
    if (!config?.operatorLookupEnabled) return;

    const normalized = normalizePhoneNumber(phone);
    if (!validatePhoneNumber(normalized)) {
      setLookupLoading(false);
      lastLookupPhoneRef.current = null;
      return;
    }

    setLookupLoading(true);

    const timeoutId = window.setTimeout(() => {
      void runOperatorLookup(normalized);
    }, 400);

    return () => window.clearTimeout(timeoutId);
  }, [phone, config, runOperatorLookup]);

  useEffect(() => {
    if (!config?.rechargePlansEnabled || lookupLoading) return;
    if (!operator) {
      setPlanCategories([]);
      plansScopeRef.current = null;
      return;
    }
    if (circleRequired && !circleCode) return;

    const scope = `${operator}:${circleCode ?? ""}`;
    if (plansScopeRef.current === scope) return;

    const timeoutId = window.setTimeout(() => {
      void fetchPlansForSelection({
        operator,
        circleCode,
        planapiOpCode: planapiCodesRef.current?.opCode,
        planapiCircleCode: planapiCodesRef.current?.circleCode,
      });
    }, 300);

    return () => window.clearTimeout(timeoutId);
  }, [
    config?.rechargePlansEnabled,
    operator,
    circleCode,
    circleRequired,
    lookupLoading,
    fetchPlansForSelection,
  ]);

  const handlePhoneChange = (value: string) => {
    setPhone(value);
    lastLookupPhoneRef.current = null;
    pendingLookupCircleRef.current = null;
    plansScopeRef.current = null;
    planapiCodesRef.current = null;
    setPlanCategories([]);
  };

  const handlePhoneBlur = () => {
    if (!config?.operatorLookupEnabled) return;
    const normalized = normalizePhoneNumber(phone);
    if (!validatePhoneNumber(normalized)) return;
    if (lastLookupPhoneRef.current === normalized || lookupLoading) return;
    setLookupLoading(true);
    void runOperatorLookup(normalized);
  };

  const fieldsLockedForLookup = lookupLoading;

  const goToConfirmation = (params: URLSearchParams) => {
    isNavigatingAwayRef.current = true;
    setMpinOpen(false);
    setConfirming(false);
    setSubmitting(false);
    isSubmitting.current = false;
    router.push(`${confirmationBasePath}?${params.toString()}`);
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
      if (!isNavigatingAwayRef.current) {
        isSubmitting.current = false;
        setSubmitting(false);
      }
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

  const isConfirming = confirming || submitting;

  const handleConfirmMpin = async () => {
    if (!pendingRecharge || isConfirming) return;

    if (!/^\d{4}$/.test(mpin)) {
      setMpinInvalid(true);
      setMpinError("Enter a valid 4-digit MPIN.");
      return;
    }

    setConfirming(true);
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

      await submitRecharge({ ...pendingRecharge, mpin });
      if (!isNavigatingAwayRef.current) {
        setPendingRecharge(null);
        setMpin("");
      }
    } catch {
      setMpinInvalid(true);
      setMpinError("Could not verify MPIN. Please try again.");
    } finally {
      if (!isNavigatingAwayRef.current) {
        setConfirming(false);
      }
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
          isDismissable={!isConfirming}
          onOpenChange={(open) => {
            if (!open && isConfirming) return;
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
                  isDisabled={isConfirming}
                  isInvalid={mpinInvalid}
                  value={mpin}
                  onChange={handleMpinChange}
                />
              </Modal.Body>
              <Modal.Footer>
                <Button
                  isDisabled={isConfirming}
                  variant="secondary"
                  onPress={() => setMpinOpen(false)}
                >
                  Cancel
                </Button>
                <Button
                  isPending={isConfirming}
                  variant="primary"
                  onPress={() => void handleConfirmMpin()}
                >
                  {({ isPending }) => (
                    <>
                      {isPending ? <Spinner color="current" size="sm" /> : null}
                      {isPending ? "Processing recharge…" : "Confirm and recharge"}
                    </>
                  )}
                </Button>
              </Modal.Footer>
            </Modal.Dialog>
          </Modal.Container>
        </Modal.Backdrop>
      </Modal>

      <div
        className={
          config.rechargePlansEnabled
            ? "grid w-full gap-6 lg:grid-cols-2 lg:gap-8"
            : "w-full max-w-lg"
        }
      >
        <Form className="flex flex-col gap-4" onSubmit={handleSubmit}>
      <TextField isRequired name="phone" type="tel">
        <Label>Phone number</Label>
        <Input
          inputMode="numeric"
          placeholder="10-digit mobile"
          value={phone}
          variant="secondary"
          onBlur={handlePhoneBlur}
          onChange={(e) => handlePhoneChange(e.target.value)}
        />
      </TextField>

      <Select
        key={`operator-${operator ?? "none"}`}
        isRequired
        className="w-full"
        isDisabled={fieldsLockedForLookup}
        placeholder="Select operator"
        value={operator}
        onChange={(value) => {
          lastLookupPhoneRef.current = null;
          plansScopeRef.current = null;
          planapiCodesRef.current = null;
          setPlanCategories([]);
          setOperator(value != null ? String(value) : null);
        }}
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

      {circleOptions.length > 0 ? (
        <Select
          key={`circle-${operator ?? "none"}-${circleCode ?? "none"}`}
          isRequired={circleRequired}
          className="w-full"
          isDisabled={fieldsLockedForLookup}
          placeholder={circleRequired ? "Select circle" : "Circle (optional)"}
          value={circleCode}
          onChange={(value) => {
            lastLookupPhoneRef.current = null;
            plansScopeRef.current = null;
            setCircleCode(value != null ? String(value) : null);
          }}
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
        <TextField isRequired={circleRequired} isDisabled={fieldsLockedForLookup} name="circleCode">
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

      <Button
        className="mt-2 w-full"
        isDisabled={fieldsLockedForLookup || submitting || !operator}
        isPending={fieldsLockedForLookup}
        type="submit"
        variant="primary"
      >
        {({ isPending }) => (
          <>
            {isPending ? <Spinner color="current" size="sm" /> : null}
            {isPending ? "Fetching information" : "Initiate recharge"}
          </>
        )}
      </Button>
        </Form>

        {config.rechargePlansEnabled ? (
          <aside className="border-t border-default-200 pt-6 lg:border-t-0 lg:border-l lg:pt-0 lg:pl-8">
            <RechargePlansPicker
              awaitingSelection={
                !operator || (circleRequired && !circleCode)
              }
              categories={planCategories}
              loading={plansLoading || lookupLoading}
              selectedAmount={amount ? Number(amount) : null}
              onSelectAmount={(value) => setAmount(String(value))}
            />
          </aside>
        ) : null}
      </div>
    </>
  );
}
