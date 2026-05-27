"use client";

import { useState } from "react";

import { MpinSetupModal } from "@/components/mpin-setup-modal";

type MpinGateProps = {
  mpinMustReset: boolean;
  userRole: string;
  children: React.ReactNode;
};

export function MpinGate({ mpinMustReset, userRole, children }: MpinGateProps) {
  const [cleared, setCleared] = useState(false);
  const needsMpin = userRole !== "ADMIN" && mpinMustReset && !cleared;

  return (
    <>
      <MpinSetupModal
        open={needsMpin}
        onCompleted={() => setCleared(true)}
      />
      <div
        className={needsMpin ? "pointer-events-none select-none opacity-40" : undefined}
        aria-hidden={needsMpin}
      >
        {children}
      </div>
    </>
  );
}
