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
      <Button className="h-9 gap-1.5 px-3 font-medium" variant="secondary">
        <Wallet className="size-3.5 shrink-0" aria-hidden />
        <Money amount={balance} className="text-inherit" fractionDigits={2} />
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
