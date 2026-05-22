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
      isIconOnly
      variant="danger"
      onPress={handleLogout}
    >
      <LogOut className="size-4" />
    </Button>
  );
}
