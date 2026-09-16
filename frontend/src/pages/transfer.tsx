import { useEffect, useMemo, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { useQueryClient } from "@tanstack/react-query";
import { CheckCircle2, Loader2 } from "lucide-react";
import { PageHeader } from "@/components/common/page-header";
import { StatusBadge } from "@/components/common/status-badge";
import { ErrorState, LoadingRows } from "@/components/common/states";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { accountsQueryKey, useAccounts } from "@/hooks/use-accounts";
import { transactionsQueryKey } from "@/hooks/use-transactions";
import { transactionsService } from "@/services/transactions-service";
import type { Transaction } from "@/types/api";
import { createIdempotencyKey } from "@/utils/idempotency";
import { formatPaise, parseRupeesToPaise} from "@/utils/money";

interface FieldErrors {
  fromAccountId?: string;
  toAccountNumber?: string;
  amount?: string;
}

const Transfer = () => {
  const queryClient = useQueryClient();
  const accountsQuery = useAccounts();
  const accounts = accountsQuery.data ?? [];

  const [fromAccountId, setFromAccountId] = useState("");
  const [toAccountNumber, setToAccountNumber] = useState("");
  const [amount, setAmount] = useState("");
  const [errors, setErrors] = useState<FieldErrors>({});
  const [submitError, setSubmitError] = useState<unknown>(null);
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState<Transaction | null>(null);

  // Same logical submission keeps the same key, so a retry is never a second transfer.
  const idempotencyKeyRef = useRef<string | null>(null);

  useEffect(() => {
    if (!fromAccountId && accounts.length > 0) setFromAccountId(accounts[0].id);
  }, [accounts, fromAccountId]);

  const selectedFrom = useMemo(
    () => accounts.find((account) => account.id === fromAccountId),
    [accounts, fromAccountId],
  );

  const parsedAmount = useMemo(() => (amount.trim() ? parseRupeesToPaise(amount) : null), [amount]);


  const resetKey = () => {
    idempotencyKeyRef.current = null;
  };

  const validate = () => {
    const next: FieldErrors = {};
    if (!fromAccountId) next.fromAccountId = "Choose the account to send from";
    if (!toAccountNumber.trim()) next.toAccountNumber = "Enter the receiving account number";

    if (selectedFrom && toAccountNumber.trim() === selectedFrom.accountNumber) {
        next.toAccountNumber =
        "Sender and receiver must be different accounts";
      }

    if (!parsedAmount) {
      next.amount = "Enter an amount";
    } else if (!parsedAmount.valid) {
      next.amount = parsedAmount.error ?? "Enter a valid amount";
    }

    setErrors(next);
    return Object.keys(next).length === 0;
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setSubmitError(null);
    setResult(null);
    if (!validate() || !parsedAmount?.valid) return;

    if (!idempotencyKeyRef.current) idempotencyKeyRef.current = createIdempotencyKey();

    setSubmitting(true);
    try {
      const transaction = await transactionsService.transfer({
        fromAccountId,
        toAccountNumber: toAccountNumber.trim(),
        amount: parsedAmount.paise,
        idempotencyKey: idempotencyKeyRef.current,
      });

      setResult(transaction);
      setAmount("");
      setToAccountNumber("");
      resetKey();
      await queryClient.invalidateQueries({ queryKey: accountsQueryKey });
      await queryClient.invalidateQueries({ queryKey: [transactionsQueryKey] });
    } catch (error) {
      setSubmitError(error);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader title="Transfer money" description="Send INR from one of your accounts to another account." />

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_320px]">
        <Card>
          <CardHeader>
            <CardTitle>Transfer details</CardTitle>
          </CardHeader>
          <CardContent>
            {accountsQuery.isLoading ? (
              <LoadingRows rows={3} />
            ) : accountsQuery.isError ? (
              <ErrorState error={accountsQuery.error} onRetry={() => accountsQuery.refetch()} />
            ) : accounts.length === 0 ? (
              <div className="space-y-3 text-sm text-muted-foreground">
                <p>You need an account before you can send money.</p>
                <Button asChild size="sm">
                  <Link to="/accounts">Open an account</Link>
                </Button>
              </div>
            ) : (
              <form className="space-y-5" onSubmit={handleSubmit} noValidate>
                {submitError ? <ErrorState error={submitError} /> : null}

                <div className="space-y-2">
                  <Label htmlFor="from-account">From account</Label>
                  <Select
                    value={fromAccountId}
                    onValueChange={(value) => {
                      setFromAccountId(value);
                      resetKey();
                    }}
                  >
                    <SelectTrigger id="from-account">
                      <SelectValue placeholder="Select an account" />
                    </SelectTrigger>
                    <SelectContent>
                      {accounts.map((account) => (
                        <SelectItem key={account.id} value={account.id}>
                          {account.accountNumber} · {formatPaise(account.balance, account.currency)}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {errors.fromAccountId && <p className="text-xs text-destructive">{errors.fromAccountId}</p>}
                  {selectedFrom && (
                    <p className="numeric text-xs text-muted-foreground">
                      Available: {formatPaise(selectedFrom.balance, selectedFrom.currency)}
                    </p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="to-account">To account number</Label>
                  <Input
                    id="to-account"
                    value={toAccountNumber}
                    placeholder="Receiver account number"
                    onChange={(event) => {
                      setToAccountNumber(event.target.value);
                      resetKey();
                    }}
                    aria-invalid={Boolean(errors.toAccountNumber)}
                  />
                  {errors.toAccountNumber && <p className="text-xs text-destructive">{errors.toAccountNumber}</p>}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="amount">Amount (INR)</Label>
                  <Input
                    id="amount"
                    inputMode="decimal"
                    placeholder="1000.00"
                    value={amount}
                    onChange={(event) => {
                      setAmount(event.target.value);
                      resetKey();
                    }}
                    aria-invalid={Boolean(errors.amount)}
                    className="numeric"
                  />
                  {errors.amount ? (
                    <p className="text-xs text-destructive">{errors.amount}</p>
                  ) : (
                    <p className="numeric text-xs text-muted-foreground">
                      {parsedAmount?.valid ? `Sending ${formatPaise(parsedAmount.paise)}` : "\u00a0"}
                    </p>
                  )}
                </div>

                <Button type="submit" disabled={submitting} className="w-full sm:w-auto">
                  {submitting && <Loader2 className="h-4 w-4 animate-spin" />}
                  {submitting ? "Sending…" : "Send money"}
                </Button>
              </form>
            )}
          </CardContent>
        </Card>

        <div className="space-y-4">
          {result && (
            <Card className="border-success/30">
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2 text-base">
                  <CheckCircle2 className="h-4 w-4 text-success" />
                  Transfer submitted
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3 text-sm">
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">Amount</span>
                  <span className="numeric font-medium">{formatPaise(result.amount, result.currency)}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">Status</span>
                  <StatusBadge status={result.status} />
                </div>
                <div className="flex items-center justify-between gap-3">
                  <span className="text-muted-foreground">Transaction ID</span>
                  <span className="numeric truncate text-xs">{result.id}</span>
                </div>
                <Button variant="outline" size="sm" asChild className="w-full">
                  <Link to="/transactions">View transaction history</Link>
                </Button>
              </CardContent>
            </Card>
          )}

          <Card className="bg-surface">
            <CardContent className="space-y-2 p-5 text-sm text-muted-foreground">
              <p className="font-medium text-foreground">How transfers work</p>
              <p>
                Amounts are sent to the backend as whole paise, so ₹1,000.00 becomes 100000. Balances and validation
                are decided by the payment service, not this app.
              </p>
              <p>Each submission is protected against accidental duplicates.</p>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default Transfer;
