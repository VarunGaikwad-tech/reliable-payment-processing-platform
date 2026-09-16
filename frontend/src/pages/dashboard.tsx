import { Link } from "react-router-dom";
import { ArrowLeftRight, ArrowRight, Bell, Plus } from "lucide-react";
import { AccountCard } from "@/components/common/account-card";
import { PageHeader } from "@/components/common/page-header";
import { EmptyState, ErrorState, LoadingRows } from "@/components/common/states";
import { TransactionTable } from "@/components/common/transaction-table";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useAuth } from "@/context/auth-context";
import { useAccounts } from "@/hooks/use-accounts";
import { useNotifications } from "@/hooks/use-notifications";
import { useTransactions } from "@/hooks/use-transactions";
import { formatPaise, toPaise } from "@/utils/money";
import { useEffect, useState } from "react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

import { Label } from "@/components/ui/label";

const Dashboard = () => {
  const { user } = useAuth();
  const accountsQuery = useAccounts();
  const accounts = accountsQuery.data ?? [];
  const [selectedAccountId, setSelectedAccountId] =
    useState("");

  useEffect(() => {
    if (
      !selectedAccountId &&
      accounts.length > 0
    ) {
      setSelectedAccountId(accounts[0].id);
    }
  }, [accounts, selectedAccountId]);

  const selectedAccount = accounts.find(
    (account) => account.id === selectedAccountId
  );

  const transactionsQuery = useTransactions({
    accountId: selectedAccountId || undefined,
    page: 1,
    limit: 5,
  });
  // const primaryAccount = accounts[0];

  // const transactionsQuery = useTransactions({ accountId: primaryAccount?.id, page: 1, limit: 5 });

  const notificationsQuery = useNotifications();

  const totalBalance = accounts.reduce((sum, account) => sum + toPaise(account.balance), 0n);
  const unreadCount = notificationsQuery.data?.notifications.filter((item) => item.read === false).length ?? 0;

  return (
    <div className="space-y-8">
      <PageHeader
        title={user?.name ? `Welcome back, ${user.name.split(" ")[0]}` : "Welcome back"}
        description="An overview of your accounts and recent money movement."
        action={
          <Button asChild>
            <Link to="/transfer">
              <ArrowLeftRight className="h-4 w-4" />
              Transfer money
            </Link>
          </Button>
        }
      />

      <section aria-labelledby="summary-heading" className="grid gap-4 sm:grid-cols-3">
        <h2 id="summary-heading" className="sr-only">
          Summary
        </h2>
        <Card>
          <CardContent className="p-5">
            <p className="text-xs uppercase tracking-wide text-muted-foreground">Total balance</p>
            {accountsQuery.isLoading ? (
              <LoadingRows rows={1} className="mt-2" />
            ) : (
              <p className="numeric mt-1 text-2xl font-semibold">{formatPaise(totalBalance.toString())}</p>
            )}
            <p className="mt-1 text-xs text-muted-foreground">Across {accounts.length} account(s)</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-5">
            <p className="text-xs uppercase tracking-wide text-muted-foreground">Accounts</p>
            <p className="numeric mt-1 text-2xl font-semibold">{accounts.length}</p>
            <Link to="/accounts" className="mt-1 inline-flex items-center gap-1 text-xs text-primary hover:underline">
              Manage accounts <ArrowRight className="h-3 w-3" />
            </Link>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-5">
            <p className="text-xs uppercase tracking-wide text-muted-foreground">Notifications</p>
            <p className="mt-1 text-2xl font-semibold">
              {notificationsQuery.data?.available ? unreadCount : "—"}
            </p>
            <Link
              to="/notifications"
              className="mt-1 inline-flex items-center gap-1 text-xs text-primary hover:underline"
            >
              <Bell className="h-3 w-3" /> View notifications
            </Link>
          </CardContent>
        </Card>
      </section>

      <section aria-labelledby="accounts-heading" className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 id="accounts-heading" className="text-lg font-semibold">
            Your accounts
          </h2>
          <Button variant="outline" size="sm" asChild>
            <Link to="/accounts">
              <Plus className="h-4 w-4" />
              Open account
            </Link>
          </Button>
        </div>

        {accountsQuery.isLoading ? (
          <LoadingRows rows={2} />
        ) : accountsQuery.isError ? (
          <ErrorState error={accountsQuery.error} onRetry={() => accountsQuery.refetch()} />
        ) : accounts.length === 0 ? (
          <Card>
            <EmptyState
              title="No accounts yet"
              description="Open your first INR account to receive money and make transfers."
              action={
                <Button asChild size="sm">
                  <Link to="/accounts">Open an account</Link>
                </Button>
              }
            />
          </Card>
        ) : (
          <div className="grid gap-4 md:grid-cols-2">
            {accounts.slice(0, 4).map((account) => (
              <AccountCard key={account.id} account={account} />
            ))}
          </div>
        )}
      </section>

      <section
          aria-labelledby="recent-heading"
          className="space-y-4"
        >
          <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <h2
                id="recent-heading"
                className="text-lg font-semibold"
              >
                Recent transactions
              </h2>

              <p className="text-sm text-muted-foreground">
                Recent activity for the selected account.
              </p>
            </div>

            {accounts.length > 0 && (
              <div className="w-full sm:w-64">
                <Label htmlFor="dashboard-account">
                  Account
                </Label>

                <Select
                  value={selectedAccountId}
                  onValueChange={setSelectedAccountId}
                >
                  <SelectTrigger
                    id="dashboard-account"
                    className="mt-2"
                  >
                    <SelectValue placeholder="Select an account" />
                  </SelectTrigger>

                  <SelectContent>
                    {accounts.map((account) => (
                      <SelectItem
                        key={account.id}
                        value={account.id}
                      >
                        {account.accountNumber}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
          </div>

          <Card>
            {!selectedAccount ? (
              <EmptyState
                title="Nothing to show yet"
                description="Open an account to start making and receiving transfers."
              />
            ) : transactionsQuery.isLoading ? (
              <CardContent className="p-5">
                <LoadingRows rows={3} />
              </CardContent>
            ) : transactionsQuery.isError ? (
              <CardContent className="p-5">
                <ErrorState
                  error={transactionsQuery.error}
                  onRetry={() =>
                    transactionsQuery.refetch()
                  }
                />
              </CardContent>
            ) : (
              <>
                <CardHeader className="pb-0">
                  <CardTitle className="text-sm text-muted-foreground">
                    Account {selectedAccount.accountNumber}
                  </CardTitle>
                </CardHeader>

                {(transactionsQuery.data?.transactions.length ??
                  0) === 0 ? (
                  <EmptyState
                    title="No transactions yet"
                    description="Transfers involving this account will appear here."
                    action={
                      <Button
                        asChild
                        size="sm"
                      >
                        <Link to="/transfer">
                          Transfer money
                        </Link>
                      </Button>
                    }
                  />
                ) : (
                  <CardContent className="px-0 pt-4">
                    <TransactionTable
                      transactions={
                        transactionsQuery.data.transactions
                      }
                      accountIds={[selectedAccount.id]}
                      compact
                    />

                    <div className="px-6 pt-4 pb-5">
                      <Link
                        to="/transactions"
                        className="inline-flex items-center gap-1 text-sm text-primary hover:underline"
                      >
                        View all transactions
                        <ArrowRight className="h-4 w-4" />
                      </Link>
                    </div>
                  </CardContent>
                )}
              </>
            )}
          </Card>
        </section>
    </div>
  );
};

export default Dashboard;
