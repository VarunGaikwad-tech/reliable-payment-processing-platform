import { ApiError, apiRequest } from "./api-client";
import type { AppNotification } from "@/types/api";

/**
 * Notification integration is isolated here. The backend produces notifications
 * asynchronously (outbox -> Kafka -> consumer); a read endpoint may not be
 * exposed yet. In that case `list()` reports `available: false` and the UI says
 * so honestly — no placeholder notifications are ever fabricated.
 */

export interface NotificationsResult {
  available: boolean;
  notifications: AppNotification[];
}

interface RawNotification {
  id?: string;

  title?: string;
  message?: string;
  body?: string;

  type?: string;
  read?: boolean;
  isRead?: boolean;

  amount?: string | number;
  currency?: string;
  status?: string;

  transactionId?: string;
  transaction_id?: string;

  counterpartyName?: string;
  counterparty_name?: string;

  counterpartyAccountNumber?: string;
  counterparty_account_number?: string;

  createdAt?: string;
  created_at?: string;
}

function normalise(
    raw: RawNotification,
    index: number
  ): AppNotification {
    return {
      id: String(raw.id ?? index),

      title: raw.title,

      message:
        raw.message ??
        raw.body,

      type: raw.type,

      read:
        raw.read ??
        raw.isRead,

      amount:
        raw.amount,

      currency:
        raw.currency,

      status:
        raw.status,

      transactionId:
        raw.transactionId ??
        raw.transaction_id,

      counterpartyName:
        raw.counterpartyName ??
        raw.counterparty_name,

      counterpartyAccountNumber:
        raw.counterpartyAccountNumber ??
        raw.counterparty_account_number,

      createdAt:
        raw.createdAt ??
        raw.created_at,
    };
  }

function readList(payload: unknown): RawNotification[] {
  if (Array.isArray(payload)) return payload as RawNotification[];
  if (payload && typeof payload === "object") {
    const body = payload as Record<string, unknown>;
    if (Array.isArray(body.notifications)) return body.notifications as RawNotification[];
    if (Array.isArray(body.items)) return body.items as RawNotification[];
  }
  return [];
}

export const notificationsService = {
  /** Reads GET /api/notifications when the backend exposes it. */
  async list(): Promise<NotificationsResult> {
    try {
      const payload = await apiRequest<unknown>("/notifications");
      return { available: true, notifications: readList(payload).map(normalise) };
    } catch (error) {
      if (error instanceof ApiError && (error.status === 404 || error.status === 501)) {
        return { available: false, notifications: [] };
      }
      throw error;
    }
  },
};
