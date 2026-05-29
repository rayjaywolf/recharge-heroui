"use client";

import { Moon, Sun } from "lucide-react";
import { useTheme } from "@teispace/next-themes";
import { useEffect, useState } from "react";
import { Button } from "@heroui/react";

export function ThemeToggle() {
  const { resolvedTheme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const isDark = resolvedTheme === "dark";

  return (
    <Button
      aria-label={mounted ? (isDark ? "Switch to light mode" : "Switch to dark mode") : "Toggle theme"}
      isIconOnly
      variant="ghost"
      onPress={() => setTheme(isDark ? "light" : "dark")}
    >
      {mounted ? (
        isDark ? (
          <Sun className="size-4" strokeWidth={2} aria-hidden />
        ) : (
          <Moon className="size-4" strokeWidth={2} aria-hidden />
        )
      ) : (
        <Sun className="size-4 opacity-50" strokeWidth={2} aria-hidden />
      )}
    </Button>
  );
}
