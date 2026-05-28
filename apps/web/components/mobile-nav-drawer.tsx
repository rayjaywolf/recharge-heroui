"use client";

import type { ReactNode } from "react";
import { Drawer, useOverlayState } from "@heroui/react";

import { NavLinksList } from "@/components/nav-links";

export function MobileNavDrawer({
  userRole,
  pendingApprovalsCount = 0,
  pendingSupportCount = 0,
  children,
}: {
  userRole: string;
  pendingApprovalsCount?: number;
  pendingSupportCount?: number;
  children: ReactNode;
}) {
  const state = useOverlayState();

  return (
    <Drawer state={state}>
      {children}
      <Drawer.Backdrop>
        <Drawer.Content className="max-w-[min(100%,18rem)]" placement="left">
          <Drawer.Dialog>
            <Drawer.CloseTrigger />
            <Drawer.Header>
              <Drawer.Heading>Menu</Drawer.Heading>
            </Drawer.Header>
            <Drawer.Body>
              <NavLinksList
                pendingApprovalsCount={pendingApprovalsCount}
                pendingSupportCount={pendingSupportCount}
                userRole={userRole}
                onNavigate={() => state.close()}
              />
            </Drawer.Body>
          </Drawer.Dialog>
        </Drawer.Content>
      </Drawer.Backdrop>
    </Drawer>
  );
}
