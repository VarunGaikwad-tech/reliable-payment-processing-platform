import { useState } from "react";
import { Loader2, Plus } from "lucide-react";
import { AccountCard } from "@/components/common/account-card";
import { PageHeader } from "@/components/common/page-header";
import { EmptyState, ErrorState, LoadingRows } from "@/components/common/states";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { useAccounts, useCreateAccount } from "@/hooks/use-accounts";

const Accounts = () => {
  const accountsQuery = useAccounts();
  const createAccount = useCreateAccount();
  const [createError, setCreateError] = useState<unknown>(null);
  const accounts = accountsQuery.data ?? [];

  const handleCreate = async () => {
    setCreateError(null);
    try {
      await createAccount.mutateAsync();
    } catch (error) {
      setCreateError(error);
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Accounts"
        description="Your INR accounts held with the payment service."
        action={
          <Button onClick={handleCreate} disabled={createAccount.isPending}>
            {createAccount.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
            {createAccount.isPending ? "Opening…" : "Open new account"}
          </Button>
        }
      />

      {createError ? <ErrorState error={createError} /> : null}

      {accountsQuery.isLoading ? (
        <LoadingRows rows={3} />
      ) : accountsQuery.isError ? (
        <ErrorState error={accountsQuery.error} onRetry={() => accountsQuery.refetch()} />
      ) : accounts.length === 0 ? (
        <Card>
          <EmptyState
            title="No accounts yet"
            description="Open an account to receive money and start making transfers."
            action={
              <Button size="sm" onClick={handleCreate} disabled={createAccount.isPending}>
                Open an account
              </Button>
            }
          />
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {accounts.map((account) => (
            <AccountCard key={account.id} account={account} showId />
          ))}
        </div>
      )}
    </div>
  );
};

export default Accounts;
