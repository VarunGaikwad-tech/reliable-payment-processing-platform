import { apiRequest } from "./api-client";
import type { Account } from "@/types/api";

interface RawAccount {
  id?: string;
  accountId?: string;
  account_id?: string;
  accountNumber?: string;
  account_number?: string;
  balance?: string | number;
  currency?: string;
  status?: string;
  createdAt?: string;
  created_at?: string;
}

/** Normalise the API shape (snake_case or camelCase) without changing values. */
export function normaliseAccount(raw: RawAccount): Account {
  return {
    id: String(raw.id ?? raw.accountId ?? raw.account_id ?? ""),
    accountNumber: String(raw.accountNumber ?? raw.account_number ?? ""),
    balance: raw.balance ?? "0",
    currency: raw.currency ?? "INR",
    status: raw.status ?? "unknown",
    createdAt: raw.createdAt ?? raw.created_at,
  };
}

function readList(payload: unknown): RawAccount[] {
  if (Array.isArray(payload)) return payload as RawAccount[];
  if (payload && typeof payload === "object") {
    const body = payload as Record<string, unknown>;
    if (Array.isArray(body.accounts)) return body.accounts as RawAccount[];
    if (Array.isArray(body.items)) return body.items as RawAccount[];
  }
  return [];
}

export const accountsService = {
  async list(): Promise<Account[]> {
    const payload = await apiRequest<unknown>("/accounts");
    return readList(payload).map(normaliseAccount);
  },

  async get(accountId: string): Promise<Account> {
    const payload = await apiRequest<RawAccount>(`/accounts/${accountId}`);
    return normaliseAccount(payload ?? {});
  },

  /** Ownership is decided by the backend from the bearer token. */
  async create(input: { currency?: string } = {}): Promise<Account> {
    const payload = await apiRequest<RawAccount>("/accounts", {
      method: "POST",
      body: { currency: input.currency ?? "INR" },
    });
    return normaliseAccount(payload ?? {});
  },
};
