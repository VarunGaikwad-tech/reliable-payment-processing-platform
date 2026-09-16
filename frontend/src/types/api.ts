/**
 * Types describing the payment backend's REST responses.
 * Monetary values arrive as BIGINT paise and may be serialised as strings,
 * so they are always typed as `string | number` and handled with BigInt.
 */

export type Paise = string | number;

export interface Counterparty {
  name: string;
  accountNumber: string;
}

export interface AuthUser {
  id?: string;
  name?: string;
  email?: string;
}

export interface AuthResult {
  token: string;
  user: AuthUser | null;
}

export interface Account {
  id: string;
  accountNumber: string;
  balance: Paise;
  currency: string;
  status: string;
  createdAt?: string;
}

export type TransactionDirection = "sent" | "received" | "other";

export interface Transaction {
  id: string;
  fromAccountId?: string;
  toAccountId?: string;

  amount: Paise;
  currency: string;
  status: string;
  type?: string;

  sender?: Counterparty;
  receiver?: Counterparty;

  failureReason?: string | null;
  createdAt?: string;
  completedAt?: string | null;
}

export interface Pagination {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

export interface TransactionPage {
  transactions: Transaction[];
  pagination: Pagination;
}

export interface AppNotification {
  id: string;
  title?: string;
  message?: string;
  type?: string;
  read?: boolean;

  amount?: Paise;
  currency?: string;
  status?: string;

  counterpartyName?: string;
  counterpartyAccountNumber?: string;

  transactionId?: string;
  createdAt?: string;
}