import { AlertCircle, Inbox, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { ApiError } from "@/services/api-client";

export function LoadingRows({ rows = 3, className }: { rows?: number; className?: string }) {
  return (
    <div className={className ?? "space-y-3"} aria-busy="true" aria-live="polite">
      {Array.from({ length: rows }).map((_, index) => (
        <Skeleton key={index} className="h-14 w-full" />
      ))}
    </div>
  );
}

export function EmptyState({
  title,
  description,
  action,
}: {
  title: string;
  description: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 px-6 py-12 text-center">
      <span className="flex h-10 w-10 items-center justify-center rounded-full bg-secondary text-muted-foreground">
        <Inbox className="h-5 w-5" />
      </span>
      <div>
        <p className="font-medium">{title}</p>
        <p className="mx-auto mt-1 max-w-md text-sm text-muted-foreground">{description}</p>
      </div>
      {action}
    </div>
  );
}

/** Shows a safe message plus an expandable request id for support/debugging. */
export function ErrorState({ error, onRetry }: { error: unknown; onRetry?: () => void }) {
  const apiError = error instanceof ApiError ? error : null;
  const message =
    apiError?.message ?? (error instanceof Error ? error.message : "Something went wrong. Please try again.");

  return (
    <div
      role="alert"
      className="rounded-lg border border-destructive/30 bg-destructive/5 px-4 py-4 text-sm text-foreground"
    >
      <div className="flex items-start gap-3">
        <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-destructive" />
        <div className="flex-1">
          <p className="font-medium text-destructive">{message}</p>
          {apiError?.requestId && (
            <details className="mt-2 text-xs text-muted-foreground">
              <summary className="cursor-pointer">Technical details</summary>
              <p className="mt-1 numeric">Request ID: {apiError.requestId}</p>
            </details>
          )}
          {onRetry && (
            <Button variant="outline" size="sm" className="mt-3" onClick={onRetry}>
              <RefreshCw className="h-4 w-4" />
              Try again
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
