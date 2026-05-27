"use client";

import type { FormEvent } from "react";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button, Form, Input, Label, Spinner, TextField, toast } from "@heroui/react";

import { apiFetch } from "@/lib/api-client";

type MpinFormProps = {
  submitLabel?: string;
  onSuccess?: () => void;
  showPasswordField?: boolean;
};

export function MpinForm({
  submitLabel = "Save MPIN",
  onSuccess,
  showPasswordField = true,
}: MpinFormProps) {
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [mpin, setMpin] = useState("");
  const [confirmMpin, setConfirmMpin] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (loading) return;

    if (showPasswordField && !password) {
      toast("Enter your account password.", { variant: "danger" });
      return;
    }
    if (!/^\d{4}$/.test(mpin)) {
      toast("MPIN must be exactly 4 digits.", { variant: "danger" });
      return;
    }
    if (mpin !== confirmMpin) {
      toast("MPIN and confirmation do not match.", { variant: "danger" });
      return;
    }

    setLoading(true);
    try {
      const res = await apiFetch("/api/profile/set-mpin", {
        method: "POST",
        body: JSON.stringify({
          password: showPasswordField ? password : undefined,
          mpin,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data?.error || "Failed to set MPIN.");
      }

      setPassword("");
      setMpin("");
      setConfirmMpin("");
      toast(data.message || "MPIN saved.", { variant: "success" });
      onSuccess?.();
      router.refresh();
    } catch (error) {
      toast(error instanceof Error ? error.message : "Failed to set MPIN.", {
        variant: "danger",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Form onSubmit={handleSubmit}>
      <div className="space-y-3">
        {showPasswordField ? (
          <TextField isRequired name="password" type="password">
            <Label>Account password</Label>
            <Input
              autoComplete="current-password"
              placeholder="••••••••"
              value={password}
              variant="secondary"
              onChange={(e) => setPassword(e.target.value)}
            />
          </TextField>
        ) : null}

        <TextField isRequired name="mpin" type="password">
          <Label>New MPIN</Label>
          <Input
            inputMode="numeric"
            maxLength={4}
            pattern="\d{4}"
            placeholder="4 digits"
            value={mpin}
            variant="secondary"
            onChange={(e) => setMpin(e.target.value.replace(/\D/g, "").slice(0, 4))}
          />
        </TextField>

        <TextField isRequired name="confirmMpin" type="password">
          <Label>Confirm MPIN</Label>
          <Input
            inputMode="numeric"
            maxLength={4}
            pattern="\d{4}"
            placeholder="Re-enter MPIN"
            value={confirmMpin}
            variant="secondary"
            onChange={(e) =>
              setConfirmMpin(e.target.value.replace(/\D/g, "").slice(0, 4))
            }
          />
        </TextField>

        <Button fullWidth isDisabled={loading} type="submit" variant="primary">
          {loading ? <Spinner size="sm" /> : null}
          {submitLabel}
        </Button>
      </div>
    </Form>
  );
}
