"use client";

import type { FormEvent } from "react";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button, Card, Form, Input, Label, Spinner, TextField, toast } from "@heroui/react";

import { authClient } from "@/lib/auth-client";
import { apiFetch } from "@/lib/api-client";

type ProfileSettingsFormProps = {
  currentName: string;
};

export function ProfileSettingsForm({ currentName }: ProfileSettingsFormProps) {
  const router = useRouter();
  const [name, setName] = useState(currentName);
  const [nameLoading, setNameLoading] = useState(false);

  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [passwordLoading, setPasswordLoading] = useState(false);

  const handleChangeName = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (nameLoading) return;

    const trimmed = name.trim();
    if (trimmed.length < 2 || trimmed.length > 80) {
      toast("Name must be between 2 and 80 characters.", { variant: "danger" });
      return;
    }

    setNameLoading(true);
    try {
      const res = await apiFetch("/api/profile/change-name", {
        method: "POST",
        body: JSON.stringify({ name: trimmed }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data?.error || "Failed to update name.");
      }
      setName(trimmed);
      toast("Name updated.", { variant: "success" });
      router.refresh();
    } catch (error) {
      toast(error instanceof Error ? error.message : "Failed to update name.", {
        variant: "danger",
      });
    } finally {
      setNameLoading(false);
    }
  };

  const handleChangePassword = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (passwordLoading) return;

    if (!currentPassword || !newPassword) {
      toast("Current and new password are required.", { variant: "danger" });
      return;
    }
    if (newPassword.length < 8) {
      toast("New password must be at least 8 characters.", { variant: "danger" });
      return;
    }
    if (newPassword !== confirmPassword) {
      toast("New password and confirmation do not match.", { variant: "danger" });
      return;
    }

    setPasswordLoading(true);
    try {
      const { error } = await authClient.changePassword({
        currentPassword,
        newPassword,
        revokeOtherSessions: true,
      });

      if (error) {
        throw new Error(error.message || "Failed to change password.");
      }

      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
      toast("Password changed successfully.", { variant: "success" });
      router.refresh();
    } catch (error) {
      toast(error instanceof Error ? error.message : "Failed to change password.", {
        variant: "danger",
      });
    } finally {
      setPasswordLoading(false);
    }
  };

  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <Card variant="default">
        <Card.Header>
          <Card.Title>Change name</Card.Title>
          <Card.Description>Update how your name appears across the dashboard.</Card.Description>
        </Card.Header>
        <Form onSubmit={handleChangeName}>
          <Card.Content className="space-y-3">
            <TextField isRequired name="name">
              <Label>Full name</Label>
              <Input
                maxLength={80}
                minLength={2}
                placeholder="Enter your name"
                value={name}
                variant="secondary"
                onChange={(e) => setName(e.target.value)}
              />
            </TextField>
          </Card.Content>
          <Card.Footer className="mt-4">
            <Button isDisabled={nameLoading} type="submit" variant="primary">
              {nameLoading ? <Spinner size="sm" /> : null}
              Save name
            </Button>
          </Card.Footer>
        </Form>
      </Card>

      <Card variant="default">
        <Card.Header>
          <Card.Title>Change password</Card.Title>
          <Card.Description>
            Enter your existing password first, then choose a new password.
          </Card.Description>
        </Card.Header>
        <Form onSubmit={handleChangePassword}>
          <Card.Content className="space-y-3">
            <TextField isRequired name="currentPassword" type="password">
              <Label>Existing password</Label>
              <Input
                autoComplete="current-password"
                placeholder="••••••••"
                value={currentPassword}
                variant="secondary"
                onChange={(e) => setCurrentPassword(e.target.value)}
              />
            </TextField>

            <TextField isRequired name="newPassword" type="password">
              <Label>New password</Label>
              <Input
                autoComplete="new-password"
                placeholder="At least 8 characters"
                value={newPassword}
                variant="secondary"
                onChange={(e) => setNewPassword(e.target.value)}
              />
            </TextField>

            <TextField isRequired name="confirmPassword" type="password">
              <Label>Confirm new password</Label>
              <Input
                autoComplete="new-password"
                placeholder="Re-enter new password"
                value={confirmPassword}
                variant="secondary"
                onChange={(e) => setConfirmPassword(e.target.value)}
              />
            </TextField>
          </Card.Content>
          <Card.Footer className="mt-4">
            <Button isDisabled={passwordLoading} type="submit" variant="primary">
              {passwordLoading ? <Spinner size="sm" /> : null}
              Update password
            </Button>
          </Card.Footer>
        </Form>
      </Card>
    </div>
  );
}

