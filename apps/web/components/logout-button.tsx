"use client";

import { LogOut } from "lucide-react";
import { Button } from "@heroui/react";
import { useRouter } from "next/navigation";

import { authClient } from "@/lib/auth-client";

export function LogoutButton() {
  const router = useRouter();

  const handleLogout = async () => {
    await authClient.signOut({
      fetchOptions: {
        onSuccess: () => {
          router.push("/login");
          router.refresh();
        },
      },
    });
  };

  return (
    <Button
      aria-label="Log out"
      className="text-muted hover:bg-danger/10 hover:text-danger"
      isIconOnly
      variant="ghost"
      onPress={handleLogout}
    >
      <LogOut className="size-4" strokeWidth={2} aria-hidden />
    </Button>
  );
}
