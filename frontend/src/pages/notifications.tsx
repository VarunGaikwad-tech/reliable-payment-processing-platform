import {
  ArrowDownLeft,
  ArrowUpRight,
  Bell,
} from "lucide-react";

import { PageHeader } from "@/components/common/page-header";
import {
  EmptyState,
  ErrorState,
  LoadingRows,
} from "@/components/common/states";

import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

import { useNotifications } from "@/hooks/use-notifications";

import { formatPaise } from "@/utils/money";

function formatTime(value?: string | null) {
  if (!value) return "";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "";
  }

  return date.toLocaleString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function maskAccountNumber(value?: string) {
  if (!value) return "—";

  if (value.length <= 4) {
    return `••••${value}`;
  }

  return `••••${value.slice(-4)}`;
}

const Notifications = () => {
  const query = useNotifications();

  return (
    <div className="space-y-6">
      <PageHeader
        title="Notifications"
        description="Important updates about your payment activity."
      />

      {query.isLoading ? (
        <LoadingRows rows={4} />
      ) : query.isError ? (
        <ErrorState
          error={query.error}
          onRetry={() => query.refetch()}
        />
      ) : query.data?.notifications.length === 0 ? (
        <Card>
          <EmptyState
            title="No notifications"
            description="Payment updates will appear here."
          />
        </Card>
      ) : (
        <Card>
          <CardContent className="divide-y divide-border p-0">
            {query.data?.notifications.map(
              (notification) => {
                const sent =
                  notification.type ===
                  "TRANSFER_SENT";

                return (
                  <div
                    key={notification.id}
                    className="flex items-start gap-4 px-6 py-5"
                  >
                    <span
                      className={
                        sent
                          ? "mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-secondary text-secondary-foreground"
                          : "mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-success/10 text-success"
                      }
                    >
                      {sent ? (
                        <ArrowUpRight className="h-5 w-5" />
                      ) : (
                        <ArrowDownLeft className="h-5 w-5" />
                      )}
                    </span>

                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="font-medium">
                          {sent
                            ? "Money sent"
                            : "Money received"}
                        </p>

                        {notification.read ===
                          false && (
                          <Badge variant="outline">
                            New
                          </Badge>
                        )}
                      </div>

                      {notification.amount !==
                        undefined && (
                        <p className="numeric mt-2 text-xl font-semibold">
                          {sent ? "−" : "+"}
                          {formatPaise(
                            notification.amount,
                            notification.currency ??
                              "INR"
                          )}
                        </p>
                      )}

                      {notification.counterpartyName && (
                        <p className="mt-2 text-sm">
                          {sent
                            ? "To "
                            : "From "}
                          <span className="font-medium">
                            {
                              notification.counterpartyName
                            }
                          </span>
                        </p>
                      )}

                      {notification.counterpartyAccountNumber && (
                        <p className="text-xs text-muted-foreground">
                          A/C{" "}
                          {maskAccountNumber(
                            notification.counterpartyAccountNumber
                          )}
                        </p>
                      )}

                      <p className="mt-2 text-xs text-muted-foreground">
                        {formatTime(
                          notification.createdAt
                        )}
                      </p>
                    </div>

                    <Bell className="hidden h-4 w-4 text-muted-foreground sm:block" />
                  </div>
                );
              }
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default Notifications;