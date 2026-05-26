"use client";

import { ThemeProvider } from "@teispace/next-themes";
import type { ReactNode } from "react";

export function Providers({ children }: { children: ReactNode }) {
  return (
    <ThemeProvider
      attribute={["class", "data-theme"]}
      defaultTheme="light"
      enableSystem
      storageKey="recharge-theme"
    >
      {children}
    </ThemeProvider>
  );
}
