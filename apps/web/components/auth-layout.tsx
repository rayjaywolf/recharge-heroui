import Image from "next/image";
import type { ReactNode } from "react";

type AuthLayoutProps = {
  children: ReactNode;
  footer?: ReactNode;
  wide?: boolean;
};

export function AuthLayout({ children, footer, wide }: AuthLayoutProps) {
  return (
    <div className="grid min-h-svh lg:grid-cols-[minmax(0,1fr)_minmax(0,1.15fr)]">
      <aside className="relative hidden bg-accent lg:flex lg:flex-col lg:justify-between lg:p-12">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="relative size-9 shrink-0 overflow-hidden rounded-lg border border-accent-foreground/20 shadow-xs">
              <Image
                src="/neo.jpg"
                alt="Logo"
                fill
                sizes="36px"
                className="object-cover"
                priority
              />
            </div>
            <p className="text-base font-semibold text-accent-foreground">
              Neo Charge
            </p>
          </div>
          <h1 className="mt-6 max-w-sm text-3xl font-semibold leading-tight tracking-tight text-accent-foreground">
            Retail recharge, simplified.
          </h1>
          <p className="mt-4 max-w-sm text-sm leading-relaxed text-accent-foreground/75">
            Wallet balance, ledger, commissions, and multi-operator recharge in
            one place.
          </p>
        </div>
        <p className="text-xs text-accent-foreground/50">
          © {new Date().getFullYear()} Neo Charge
        </p>
      </aside>

      <main className="flex flex-col justify-center px-6 py-10 sm:px-10 lg:px-14">
        <div
          className={`mx-auto w-full ${wide ? "max-w-2xl" : "max-w-md"}`}
        >
          <div className="mb-8 flex items-center gap-2.5 lg:hidden">
            <div className="relative size-8 shrink-0 overflow-hidden rounded-lg border border-separator/40 shadow-xs">
              <Image
                src="/neo.jpg"
                alt="Logo"
                fill
                sizes="32px"
                className="object-cover"
                priority
              />
            </div>
            <span className="text-base font-semibold tracking-tight text-foreground">
              Neo Charge
            </span>
          </div>
          {children}
          {footer ? <div className="mt-6 text-center">{footer}</div> : null}
        </div>
      </main>
    </div>
  );
}
