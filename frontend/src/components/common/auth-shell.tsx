import { API_BASE_URL } from "@/services/api-client";

export function AuthShell({
  title,
  description,
  children,
  footer,
}: {
  title: string;
  description: string;
  children: React.ReactNode;
  footer?: React.ReactNode;
}) {
  return (
    <div className="flex min-h-screen flex-col bg-surface">
      <header className="flex h-16 items-center px-4 lg:px-8">
        <div className="flex items-center gap-2">
          <span className="flex h-8 w-8 items-center justify-center rounded-md bg-primary text-sm font-semibold text-primary-foreground">
            P
          </span>
          <span className="font-semibold tracking-tight">PayLedger</span>
        </div>
      </header>

      <main className="flex flex-1 items-start justify-center px-4 pb-16 pt-4 sm:items-center sm:pt-0">
        <div className="w-full max-w-md">
          <div className="rounded-lg border border-border bg-background p-6 shadow-sm sm:p-8">
            <h1 className="text-xl font-semibold">{title}</h1>
            <p className="mt-1 text-sm text-muted-foreground">{description}</p>
            <div className="mt-6">{children}</div>
            {footer && <div className="mt-6 border-t border-border pt-4">{footer}</div>}
          </div>
          <p className="mt-4 text-center text-xs text-muted-foreground">Connected to {API_BASE_URL}</p>
        </div>
      </main>
    </div>
  );
}
