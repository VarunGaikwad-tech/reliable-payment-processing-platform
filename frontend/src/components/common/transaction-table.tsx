import { useState } from "react";
import {
  ArrowDownLeft,
  ArrowUpRight,
  ExternalLink,
} from "lucide-react";

import { StatusBadge } from "@/components/common/status-badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";

import { formatPaise } from "@/utils/money";
import type {
  Transaction,
  TransactionDirection,
} from "@/types/api";

function directionOf(
  transaction: Transaction,
  myAccountIds: Set<string>
): TransactionDirection {
  if (
    transaction.fromAccountId &&
    myAccountIds.has(transaction.fromAccountId)
  ) {
    return "sent";
  }

  if (
    transaction.toAccountId &&
    myAccountIds.has(transaction.toAccountId)
  ) {
    return "received";
  }

  return "other";
}

function maskAccountNumber(value?: string) {
  if (!value) return "—";

  if (value.length <= 4) {
    return `••••${value}`;
  }

  return `••••${value.slice(-4)}`;
}

function formatTime(value?: string | null) {
  if (!value) return "—";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "—";
  }

  return date.toLocaleString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function counterpartyOf(
  transaction: Transaction,
  direction: TransactionDirection
) {
  if (direction === "sent") {
    return transaction.receiver;
  }

  if (direction === "received") {
    return transaction.sender;
  }

  return undefined;
}

export function TransactionTable({
  transactions,
  accountIds,
  compact = false,
}: {
  transactions: Transaction[];
  accountIds: string[];
  compact?: boolean;
}) {
  const mine = new Set(accountIds);
  const [selectedTransaction, setSelectedTransaction] =
    useState<Transaction | null>(null);

  return (
    <>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Activity</TableHead>
            <TableHead>Amount</TableHead>
            <TableHead>Status</TableHead>

            {!compact && (
              <TableHead>Counterparty</TableHead>
            )}

            <TableHead>Created</TableHead>

            {!compact && (
              <TableHead>Completed</TableHead>
            )}
          </TableRow>
        </TableHeader>

        <TableBody>
          {transactions.map((transaction) => {
            const direction = directionOf(
              transaction,
              mine
            );

            const counterparty =
              counterpartyOf(
                transaction,
                direction
              );

            return (
              <TableRow
                key={transaction.id}
                className="cursor-pointer hover:bg-muted/50"
                onClick={() =>
                  setSelectedTransaction(transaction)
                }
              >
                <TableCell>
                  <div className="flex items-center gap-3">
                    <span
                      className={
                        direction === "received"
                          ? "flex h-8 w-8 items-center justify-center rounded-full bg-success/10 text-success"
                          : "flex h-8 w-8 items-center justify-center rounded-full bg-secondary text-secondary-foreground"
                      }
                    >
                      {direction === "received" ? (
                        <ArrowDownLeft className="h-4 w-4" />
                      ) : (
                        <ArrowUpRight className="h-4 w-4" />
                      )}
                    </span>

                    <div className="min-w-0">
                      <p className="font-medium">
                        {direction === "received"
                          ? "Received"
                          : direction === "sent"
                            ? "Sent"
                            : "Transfer"}
                      </p>

                      {counterparty && (
                        <p className="truncate text-xs text-muted-foreground">
                          {direction === "received"
                            ? `From ${counterparty.name}`
                            : `To ${counterparty.name}`}
                        </p>
                      )}
                    </div>
                  </div>
                </TableCell>

                <TableCell className="numeric font-medium">
                  {direction === "received"
                    ? "+"
                    : direction === "sent"
                      ? "−"
                      : ""}
                  {formatPaise(
                    transaction.amount,
                    transaction.currency
                  )}
                </TableCell>

                <TableCell>
                  <StatusBadge
                    status={transaction.status}
                  />
                </TableCell>

                {!compact && (
                  <TableCell>
                    {counterparty ? (
                      <div>
                        <p className="font-medium">
                          {counterparty.name}
                        </p>

                        <p className="text-xs text-muted-foreground">
                          A/C{" "}
                          {maskAccountNumber(
                            counterparty.accountNumber
                          )}
                        </p>
                      </div>
                    ) : (
                      "—"
                    )}
                  </TableCell>
                )}

                <TableCell className="whitespace-nowrap text-muted-foreground">
                  {formatTime(transaction.createdAt)}
                </TableCell>

                {!compact && (
                  <TableCell className="whitespace-nowrap text-muted-foreground">
                    {formatTime(
                      transaction.completedAt
                    )}
                  </TableCell>
                )}
              </TableRow>
            );
          })}
        </TableBody>
      </Table>

      <Sheet
        open={Boolean(selectedTransaction)}
        onOpenChange={(open) => {
          if (!open) {
            setSelectedTransaction(null);
          }
        }}
      >
        <SheetContent>
          {selectedTransaction && (
            <TransactionDetails
              transaction={selectedTransaction}
              accountIds={accountIds}
            />
          )}
        </SheetContent>
      </Sheet>
    </>
  );
}

function TransactionDetails({
  transaction,
  accountIds,
}: {
  transaction: Transaction;
  accountIds: string[];
}) {
  const direction = directionOf(
    transaction,
    new Set(accountIds)
  );

  const counterparty = counterpartyOf(
    transaction,
    direction
  );

  const isSuccessful =
    transaction.status === "SUCCESS";

  return (
    <>
      <SheetHeader>
        <SheetTitle>
          Transfer details
        </SheetTitle>

        <SheetDescription>
          Detailed information about this transaction.
        </SheetDescription>
      </SheetHeader>

      <div className="mt-8 space-y-6">
        <div className="text-center">
          <p
            className={`text-sm font-medium ${
              isSuccessful
                ? "text-success"
                : "text-muted-foreground"
            }`}
          >
            {isSuccessful
              ? "✓ Successful"
              : transaction.status}
          </p>

          <p className="numeric mt-2 text-3xl font-semibold">
            {formatPaise(
              transaction.amount,
              transaction.currency
            )}
          </p>
        </div>

        {direction === "sent" &&
          transaction.receiver && (
            <DetailBlock
              label="Sent to"
              name={transaction.receiver.name}
              accountNumber={
                transaction.receiver.accountNumber
              }
            />
          )}

        {direction === "received" &&
          transaction.sender && (
            <DetailBlock
              label="Received from"
              name={transaction.sender.name}
              accountNumber={
                transaction.sender.accountNumber
              }
            />
          )}

        <div className="space-y-4 rounded-lg border border-border p-4">
          <DetailRow
            label="Transaction ID"
            value={transaction.id}
          />

          <DetailRow
            label="Type"
            value={transaction.type ?? "TRANSFER"}
          />

          <DetailRow
            label="Created"
            value={formatTime(
              transaction.createdAt
            )}
          />

          <DetailRow
            label="Completed"
            value={formatTime(
              transaction.completedAt
            )}
          />

          {transaction.failureReason && (
            <DetailRow
              label="Failure reason"
              value={transaction.failureReason}
            />
          )}
        </div>
      </div>
    </>
  );
}

function DetailBlock({
  label,
  name,
  accountNumber,
}: {
  label: string;
  name: string;
  accountNumber: string;
}) {
  return (
    <div className="rounded-lg border border-border p-4">
      <p className="text-xs uppercase tracking-wide text-muted-foreground">
        {label}
      </p>

      <p className="mt-2 font-medium">{name}</p>

      <p className="mt-1 text-sm text-muted-foreground">
        A/C {maskAccountNumber(accountNumber)}
      </p>
    </div>
  );
}

function DetailRow({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div className="flex items-start justify-between gap-4">
      <span className="text-sm text-muted-foreground">
        {label}
      </span>

      <span className="max-w-[65%] break-all text-right text-sm">
        {value}
      </span>
    </div>
  );
}
// import { ArrowDownLeft, ArrowUpRight } from "lucide-react";
// import { StatusBadge } from "@/components/common/status-badge";
// import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
// import { formatPaise } from "@/utils/money";
// import type { Transaction, TransactionDirection } from "@/types/api";

// function directionOf(transaction: Transaction, myAccountIds: Set<string>): TransactionDirection {
//   if (transaction.fromAccountId && myAccountIds.has(transaction.fromAccountId)) return "sent";
//   if (transaction.toAccountId && myAccountIds.has(transaction.toAccountId)) return "received";
//   return "other";
// }

// function shortId(value?: string) {
//   if (!value) return "—";
//   return value.length > 12 ? `${value.slice(0, 8)}…${value.slice(-4)}` : value;
// }

// function formatTime(value?: string | null) {
//   if (!value) return "—";
//   const date = new Date(value);
//   if (Number.isNaN(date.getTime())) return "—";
//   return date.toLocaleString("en-IN", {
//     day: "2-digit",
//     month: "short",
//     year: "numeric",
//     hour: "2-digit",
//     minute: "2-digit",
//   });
// }

// export function TransactionTable({
//   transactions,
//   accountIds,
//   compact = false,
// }: {
//   transactions: Transaction[];
//   accountIds: string[];
//   compact?: boolean;
// }) {
//   const mine = new Set(accountIds);

//   return (
//     <Table>
//       <TableHeader>
//         <TableRow>
//           <TableHead>Activity</TableHead>
//           <TableHead>Amount</TableHead>
//           <TableHead>Status</TableHead>
//           {!compact && <TableHead>Counterparty</TableHead>}
//           <TableHead>Created</TableHead>
//           {!compact && <TableHead>Completed</TableHead>}
//         </TableRow>
//       </TableHeader>
//       <TableBody>
//         {transactions.map((transaction) => {
//           const direction = directionOf(transaction, mine);
//           const counterparty = direction === "sent" ? transaction.toAccountId : transaction.fromAccountId;
//           return (
//             <TableRow key={transaction.id}>
//               <TableCell>
//                 <div className="flex items-center gap-3">
//                   <span
//                     className={
//                       direction === "received"
//                         ? "flex h-8 w-8 items-center justify-center rounded-full bg-success/10 text-success"
//                         : "flex h-8 w-8 items-center justify-center rounded-full bg-secondary text-secondary-foreground"
//                     }
//                     aria-hidden="true"
//                   >
//                     {direction === "received" ? (
//                       <ArrowDownLeft className="h-4 w-4" />
//                     ) : (
//                       <ArrowUpRight className="h-4 w-4" />
//                     )}
//                   </span>
//                   <div>
//                     <p className="font-medium">
//                       {direction === "received" ? "Received" : direction === "sent" ? "Sent" : "Transfer"}
//                     </p>
//                     <p className="text-xs capitalize text-muted-foreground">{transaction.type ?? "transfer"}</p>
//                   </div>
//                 </div>
//               </TableCell>
//               <TableCell className="numeric font-medium">
//                 {direction === "received" ? "+" : direction === "sent" ? "−" : ""}
//                 {formatPaise(transaction.amount, transaction.currency)}
//               </TableCell>
//               <TableCell>
//                 <StatusBadge status={transaction.status} />
//               </TableCell>
//               {!compact && <TableCell className="numeric text-muted-foreground">{shortId(counterparty)}</TableCell>}
//               <TableCell className="whitespace-nowrap text-muted-foreground">
//                 {formatTime(transaction.createdAt)}
//               </TableCell>
//               {!compact && (
//                 <TableCell className="whitespace-nowrap text-muted-foreground">
//                   {formatTime(transaction.completedAt)}
//                 </TableCell>
//               )}
//             </TableRow>
//           );
//         })}
//       </TableBody>
//     </Table>
//   );
// }
