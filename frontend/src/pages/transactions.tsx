import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { ChevronLeft, ChevronRight, RefreshCw } from "lucide-react";
import { PageHeader } from "@/components/common/page-header";
import { EmptyState, ErrorState, LoadingRows } from "@/components/common/states";
import { TransactionTable } from "@/components/common/transaction-table";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useAccounts } from "@/hooks/use-accounts";
import { useTransactions } from "@/hooks/use-transactions";

const PAGE_SIZE = 10;

const Transactions = () => {
  const accountsQuery = useAccounts();
  const accounts = accountsQuery.data ?? [];
  const [accountId, setAccountId] = useState("");
  const [page, setPage] = useState(1);

  useEffect(() => {
    if (!accountId && accounts.length > 0) setAccountId(accounts[0].id);
  }, [accounts, accountId]);

  const query = useTransactions({ accountId, page, limit: PAGE_SIZE });
  const transactions = query.data?.transactions ?? [];
  const pagination = query.data?.pagination;
  const totalPages = Math.max(pagination?.totalPages ?? 1, 1);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Transaction history"
        description="Money sent and received on the selected account."
        action={
          <Button variant="outline" onClick={() => query.refetch()} disabled={!accountId || query.isFetching}>
            <RefreshCw className={query.isFetching ? "h-4 w-4 animate-spin" : "h-4 w-4"} />
            Refresh
          </Button>
        }
      />

      {accountsQuery.isLoading ? (
        <LoadingRows rows={3} />
      ) : accountsQuery.isError ? (
        <ErrorState error={accountsQuery.error} onRetry={() => accountsQuery.refetch()} />
      ) : accounts.length === 0 ? (
        <Card>
          <EmptyState
            title="No accounts yet"
            description="Open an account to start building transaction history."
            action={
              <Button size="sm" asChild>
                <Link to="/accounts">Open an account</Link>
              </Button>
            }
          />
        </Card>
      ) : (
        <>
          <div className="max-w-sm space-y-2">
            <Label htmlFor="account-filter">Account</Label>
            <Select
              value={accountId}
              onValueChange={(value) => {
                setAccountId(value);
                setPage(1);
              }}
            >
              <SelectTrigger id="account-filter">
                <SelectValue placeholder="Select an account" />
              </SelectTrigger>
              <SelectContent>
                {accounts.map((account) => (
                  <SelectItem key={account.id} value={account.id}>
                    {account.accountNumber}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <Card>
            {query.isLoading ? (
              <CardContent className="p-5">
                <LoadingRows rows={5} />
              </CardContent>
            ) : query.isError ? (
              <CardContent className="p-5">
                <ErrorState error={query.error} onRetry={() => query.refetch()} />
              </CardContent>
            ) : transactions.length === 0 ? (
              <EmptyState
                title="No transactions on this account"
                description="Transfers involving this account will appear here."
                action={
                  <Button size="sm" asChild>
                    <Link to="/transfer">Transfer money</Link>
                  </Button>
                }
              />
            ) : (
              <CardContent className="px-0 py-0">
                <div className={query.isFetching ? "opacity-60 transition-opacity" : "transition-opacity"}>
                  <TransactionTable
                    transactions={transactions}
                    accountIds={accounts.map((account) => account.id)}
                  />
                </div>
                <div className="flex flex-col gap-3 border-t border-border px-6 py-4 sm:flex-row sm:items-center sm:justify-between">
                  <p className="text-sm text-muted-foreground">
                    Page {pagination?.page ?? page} of {totalPages}
                    {pagination?.total !== undefined ? ` · ${pagination.total} transactions` : ""}
                  </p>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setPage((current) => Math.max(1, current - 1))}
                      disabled={page <= 1 || query.isFetching}
                    >
                      <ChevronLeft className="h-4 w-4" />
                      Previous
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setPage((current) => Math.min(totalPages, current + 1))}
                      disabled={page >= totalPages || query.isFetching}
                    >
                      Next
                      <ChevronRight className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            )}
          </Card>
        </>
      )}
    </div>
  );
};

export default Transactions;
