"use client";

import { useRouter } from "next/navigation";
import { Wallet } from "lucide-react";
import { Button, Dropdown, Label } from "@heroui/react";

import { Money } from "@/components/money";
import { getRoleBasePath } from "@/lib/nav-config";

export function WalletBalanceMenu({
  balance,
  userRole,
}: {
  balance: number;
  userRole: string;
}) {
  const router = useRouter();
  const fundsHref = `${getRoleBasePath(userRole)}/funds`;

  return (
    <Dropdown>
      <Button
        className="inline-flex h-9 items-center gap-2.5 px-3 font-medium"
        variant="secondary"
      >
        <Wallet className="size-4 shrink-0 text-success" strokeWidth={2} aria-hidden />
        <Money
          amount={balance}
          className="leading-none text-success"
          fractionDigits={2}
        />
      </Button>
      <Dropdown.Popover>
        <Dropdown.Menu
          aria-label="Wallet"
          onAction={(key) => {
            if (key === "add-funds") router.push(fundsHref);
          }}
        >
          <Dropdown.Item id="add-funds" textValue="Add funds">
            <Label>Add funds</Label>
          </Dropdown.Item>
        </Dropdown.Menu>
      </Dropdown.Popover>
    </Dropdown>
  );
}
