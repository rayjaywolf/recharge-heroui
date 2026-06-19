"use client";

import { useState } from "react";

import { StoreNameSetupModal } from "@/components/store-name-setup-modal";

type StoreNameGateProps = {
  storeName: string | null;
  userRole: string;
  children: React.ReactNode;
};

export function StoreNameGate({ storeName, userRole, children }: StoreNameGateProps) {
  const [cleared, setCleared] = useState(false);
  const needsStoreName = userRole !== "ADMIN" && !storeName && !cleared;

  return (
    <>
      <StoreNameSetupModal
        open={needsStoreName}
        onCompleted={() => setCleared(true)}
      />
      <div
        className={needsStoreName ? "pointer-events-none select-none opacity-40" : undefined}
        aria-hidden={needsStoreName}
      >
        {children}
      </div>
    </>
  );
}
