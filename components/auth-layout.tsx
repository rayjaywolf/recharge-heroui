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
          <p className="text-sm font-medium text-accent-foreground/80">
            RechargePro
          </p>
          <h1 className="mt-6 max-w-sm text-3xl font-semibold leading-tight tracking-tight text-accent-foreground">
            Retail recharge, simplified.
          </h1>
          <p className="mt-4 max-w-sm text-sm leading-relaxed text-accent-foreground/75">
            Wallet balance, ledger, commissions, and multi-operator recharge in
            one place.
          </p>
        </div>
        <p className="text-xs text-accent-foreground/50">
          © {new Date().getFullYear()} RechargePro
        </p>
      </aside>

      <main className="flex flex-col justify-center px-6 py-10 sm:px-10 lg:px-14">
        <div
          className={`mx-auto w-full ${wide ? "max-w-2xl" : "max-w-md"}`}
        >
          <p className="mb-8 text-sm font-medium text-accent lg:hidden">
            RechargePro
          </p>
          {children}
          {footer ? <div className="mt-6 text-center">{footer}</div> : null}
        </div>
      </main>
    </div>
  );
}
