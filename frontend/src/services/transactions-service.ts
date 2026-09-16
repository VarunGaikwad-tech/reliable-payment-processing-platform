import { apiRequest } from "./api-client";
import type { Pagination, Transaction, TransactionPage } from "@/types/api";

interface RawCounterparty {
  name?: string;
  accountNumber?: string;
  account_number?: string;
}

interface RawTransaction {
  id?: string;
  transactionId?: string;
  transaction_id?: string;

  fromAccountId?: string;
  from_account_id?: string;
  toAccountId?: string;
  to_account_id?: string;

  amount?: string | number;
  currency?: string;
  status?: string;
  type?: string;

  sender?: RawCounterparty;
  receiver?: RawCounterparty;

  sender_name?: string;
  sender_account_number?: string;
  receiver_name?: string;
  receiver_account_number?: string;

  failureReason?: string | null;
  failure_reason?: string | null;

  createdAt?: string;
  created_at?: string;
  completedAt?: string | null;
  completed_at?: string | null;
}

export function normaliseTransaction(raw: RawTransaction): Transaction {
  return {
    id: String(raw.id ?? raw.transactionId ?? raw.transaction_id ?? ""),

    fromAccountId: raw.fromAccountId ?? raw.from_account_id,

    toAccountId: raw.toAccountId ?? raw.to_account_id,

    amount: raw.amount ?? "0",

    currency: raw.currency ?? "INR",

    status: raw.status ?? "unknown",

    type: raw.type,

    sender: raw.sender
      ? {
          name: raw.sender.name ?? "Unknown",
          accountNumber:
            raw.sender.accountNumber ?? raw.sender.account_number ?? "",
        }
      : raw.sender_name
        ? {
            name: raw.sender_name,
            accountNumber: raw.sender_account_number ?? "",
          }
        : undefined,

    receiver: raw.receiver
      ? {
          name: raw.receiver.name ?? "Unknown",
          accountNumber:
            raw.receiver.accountNumber ?? raw.receiver.account_number ?? "",
        }
      : raw.receiver_name
        ? {
            name: raw.receiver_name,
            accountNumber: raw.receiver_account_number ?? "",
          }
        : undefined,

    failureReason: raw.failureReason ?? raw.failure_reason ?? null,

    createdAt: raw.createdAt ?? raw.created_at,

    completedAt: raw.completedAt ?? raw.completed_at ?? null,
  };
}
// export function normaliseTransaction(raw: RawTransaction): Transaction {
//   return {
//     id: String(raw.id ?? raw.transactionId ?? raw.transaction_id ?? ""),
//     fromAccountId: raw.fromAccountId ?? raw.from_account_id,
//     toAccountId: raw.toAccountId ?? raw.to_account_id,
//     amount: raw.amount ?? "0",
//     currency: raw.currency ?? "INR",
//     status: raw.status ?? "unknown",
//     type: raw.type,
//     createdAt: raw.createdAt ?? raw.created_at,
//     completedAt: raw.completedAt ?? raw.completed_at ?? null,
//   };
// }

function readPagination(payload: unknown, fallback: Pagination): Pagination {
  if (payload && typeof payload === "object") {
    const source = (payload as Record<string, unknown>).pagination ?? payload;
    if (source && typeof source === "object") {
      const p = source as Record<string, unknown>;
      const num = (v: unknown, d: number) =>
        typeof v === "number" ? v : typeof v === "string" ? Number(v) : d;
      if (p.page !== undefined || p.totalPages !== undefined) {
        return {
          page: num(p.page, fallback.page),
          limit: num(p.limit, fallback.limit),
          total: num(p.total, fallback.total),
          totalPages: num(p.totalPages, fallback.totalPages),
        };
      }
    }
  }
  return fallback;
}

function readList(payload: unknown): RawTransaction[] {
  if (Array.isArray(payload)) return payload as RawTransaction[];
  if (payload && typeof payload === "object") {
    const body = payload as Record<string, unknown>;
    if (Array.isArray(body.transactions))
      return body.transactions as RawTransaction[];
    if (Array.isArray(body.items)) return body.items as RawTransaction[];
    if (Array.isArray(body.data)) return body.data as RawTransaction[];
  }
  return [];
}

export interface TransferInput {
  fromAccountId: string;
  toAccountNumber: string;
  amount: string;
  idempotencyKey: string;
}

export const transactionsService = {
  async history(params: {
    accountId: string;
    page?: number;
    limit?: number;
  }): Promise<TransactionPage> {
    const page = params.page ?? 1;
    const limit = params.limit ?? 10;
    const query = new URLSearchParams({
      accountId: params.accountId,
      page: String(page),
      limit: String(limit),
    });
    const payload = await apiRequest<unknown>(
      `/transactions?${query.toString()}`,
    );
    const transactions = readList(payload).map(normaliseTransaction);
    return {
      transactions,
      pagination: readPagination(payload, {
        page,
        limit,
        total: transactions.length,
        totalPages: 1,
      }),
    };
  },

  async transfer(input: TransferInput): Promise<Transaction> {
    // Keep exact paise: only use a JSON number when it is safely representable.
    const paise = BigInt(input.amount);
    const amount =
      paise <= BigInt(Number.MAX_SAFE_INTEGER) ? Number(paise) : input.amount;

    const payload = await apiRequest<unknown>("/transactions/transfer", {
      method: "POST",
      body: {
        fromAccountId: input.fromAccountId,
        toAccountNumber: input.toAccountNumber,
        amount,
      },
      headers: { "Idempotency-Key": input.idempotencyKey },
    });

    const transaction =
      payload && typeof payload === "object" && "transaction" in payload
        ? (payload as { transaction?: RawTransaction }).transaction
        : payload;

    return normaliseTransaction(transaction ?? {});
    // const payload = await apiRequest<RawTransaction>("/transactions/transfer", {
    //   method: "POST",
    //   body: {
    //     fromAccountId: input.fromAccountId,
    //     toAccountNumber: input.toAccountNumber,
    //     amount,
    //   },
    //   headers: { "Idempotency-Key": input.idempotencyKey },
    // });
    // return normaliseTransaction(payload ?? {});
  },
};
