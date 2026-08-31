"use client";

import { useState } from "react";
import { Button, Spinner } from "@heroui/react";
import { useRouter } from "next/navigation";

import { authClient } from "@/lib/auth-client";

export function BackToSignInButton({
  className = "mt-6",
  children = "Back to sign in",
}: {
  className?: string;
  children?: React.ReactNode;
}) {
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const handleSignOut = async () => {
    setLoading(true);
    try {
      await authClient.signOut();
    } catch (e) {
      console.error("Sign out error:", e);
    } finally {
      router.push("/login");
      router.refresh();
    }
  };

  return (
    <Button
      className={className}
      fullWidth
      isDisabled={loading}
      variant="secondary"
      onPress={handleSignOut}
    >
      {loading ? <Spinner size="sm" /> : null}
      {children}
    </Button>
  );
}
