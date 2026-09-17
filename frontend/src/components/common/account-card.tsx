import { Card, CardContent } from "@/components/ui/card";
import { StatusBadge } from "@/components/common/status-badge";
import { formatPaise } from "@/utils/money";
import type { Account } from "@/types/api";

export function AccountCard({
  account,
  footer,
  showId = false,
}: {
  account: Account;
  footer?: React.ReactNode;
  showId?: boolean;
}) {
  return (
    <Card>
      <CardContent className="p-5">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-xs uppercase tracking-wide text-muted-foreground">Account number</p>
            <p className="numeric mt-1 font-medium">{account.accountNumber || "—"}</p>
          </div>
          <StatusBadge status={account.status} />
        </div>
        <div className="mt-5">
          <p className="text-xs uppercase tracking-wide text-muted-foreground">Available balance</p>
          <p className="numeric mt-1 text-2xl font-semibold">{formatPaise(account.balance, account.currency)}</p>
          <p className="mt-1 text-xs text-muted-foreground">{account.currency}</p>
        </div>
        {footer && <div className="mt-5 border-t border-border pt-4">{footer}</div>}

      </CardContent>
    </Card>
  );
}
