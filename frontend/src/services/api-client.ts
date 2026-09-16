/**
 * Centralised HTTP client for the existing payment backend.
 * Every API call in the app goes through here: base URL, bearer token,
 * error normalisation and X-Request-Id capture live in one place.
 */

export const API_BASE_URL: string =
  (import.meta.env.VITE_API_BASE_URL as string | undefined)?.replace(/\/$/, "") || "http://localhost:3000/api";

const TOKEN_KEY = "pp.auth.token";
const USER_KEY = "pp.auth.user";

export const tokenStore = {
  get(): string | null {
    try {
      return localStorage.getItem(TOKEN_KEY);
    } catch {
      return null;
    }
  },
  set(token: string) {
    try {
      localStorage.setItem(TOKEN_KEY, token);
    } catch {
      /* storage unavailable */
    }
  },
  clear() {
    try {
      localStorage.removeItem(TOKEN_KEY);
      localStorage.removeItem(USER_KEY);
    } catch {
      /* storage unavailable */
    }
  },
  getUser<T>(): T | null {
    try {
      const raw = localStorage.getItem(USER_KEY);
      return raw ? (JSON.parse(raw) as T) : null;
    } catch {
      return null;
    }
  },
  setUser(user: unknown) {
    try {
      localStorage.setItem(USER_KEY, JSON.stringify(user));
    } catch {
      /* storage unavailable */
    }
  },
};

let unauthorizedHandler: (() => void) | null = null;
export function onUnauthorized(handler: () => void) {
  unauthorizedHandler = handler;
}

export class ApiError extends Error {
  status: number;
  requestId?: string;
  retryAfterSeconds?: number;

  constructor(message: string, status: number, requestId?: string, retryAfterSeconds?: number) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.requestId = requestId;
    this.retryAfterSeconds = retryAfterSeconds;
  }
}

function friendlyMessage(status: number, backendMessage?: string, retryAfter?: number): string {
  if (status === 401) return "Your session has expired. Please sign in again.";
  if (status === 403) return "You do not have permission to perform this action.";
  if (status === 404) return backendMessage || "We could not find what you were looking for.";
  if (status === 409) return backendMessage || "This request conflicts with the current state of your account.";
  if (status === 429) {
    return retryAfter
      ? `Too many requests. Please wait ${retryAfter} seconds and try again.`
      : "Too many requests. Please wait a moment and try again.";
  }
  if (status >= 500) return "The service is temporarily unavailable. Please try again shortly.";
  return backendMessage || "Something went wrong. Please check your details and try again.";
}

/** Pull a message out of { success:false, error:{ message } } without leaking traces. */
function extractBackendMessage(payload: unknown): string | undefined {
  if (!payload || typeof payload !== "object") return undefined;
  const body = payload as Record<string, unknown>;
  const error = body.error;
  if (typeof error === "string") return sanitise(error);
  if (error && typeof error === "object") {
    const message = (error as Record<string, unknown>).message;
    if (typeof message === "string") return sanitise(message);
    const details = (error as Record<string, unknown>).details;
    if (Array.isArray(details)) {
      const first = details.find((d) => typeof d === "string" || (d && typeof d === "object"));
      if (typeof first === "string") return sanitise(first);
      if (first && typeof first === "object") {
        const msg = (first as Record<string, unknown>).message;
        if (typeof msg === "string") return sanitise(msg);
      }
    }
  }
  if (typeof body.message === "string") return sanitise(body.message);
  return undefined;
}

/** Never surface stack traces or database internals to the user. */
function sanitise(message: string): string | undefined {
  const trimmed = message.trim();
  if (!trimmed) return undefined;
  if (trimmed.length > 200) return undefined;
  if (/\bat\s+\w+\s+\(|node_modules|\/src\/|pg_|SQLSTATE|relation ".*" does not exist/i.test(trimmed)) return undefined;
  return trimmed;
}

export interface RequestOptions {
  method?: "GET" | "POST" | "PATCH" | "PUT" | "DELETE";
  body?: unknown;
  headers?: Record<string, string>;
  /** Attach the bearer token (default true). */
  auth?: boolean;
  signal?: AbortSignal;
}

export async function apiRequest<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const { method = "GET", body, headers = {}, auth = true, signal } = options;
  const token = auth ? tokenStore.get() : null;

  const requestHeaders: Record<string, string> = { Accept: "application/json", ...headers };
  if (body !== undefined) requestHeaders["Content-Type"] = "application/json";
  if (token) requestHeaders.Authorization = `Bearer ${token}`;

  let response: Response;
  try {
    response = await fetch(`${API_BASE_URL}${path}`, {
      method,
      headers: requestHeaders,
      body: body === undefined ? undefined : JSON.stringify(body),
      signal,
    });
  } catch {
    throw new ApiError(
      "Cannot reach the payment service. Check your connection and that the API is running.",
      0,
    );
  }

  const requestId = response.headers.get("X-Request-Id") ?? undefined;
  const retryAfterHeader = response.headers.get("Retry-After");
  const retryAfterSeconds = retryAfterHeader && /^\d+$/.test(retryAfterHeader) ? Number(retryAfterHeader) : undefined;

  let payload: unknown = null;
  const text = await response.text();
  if (text) {
    try {
      payload = JSON.parse(text);
    } catch {
      payload = null;
    }
  }

  if (!response.ok) {
    if (response.status === 401 && token) handleUnauthorized();
    throw new ApiError(
      friendlyMessage(response.status, extractBackendMessage(payload), retryAfterSeconds),
      response.status,
      requestId,
      retryAfterSeconds,
    );
  }

  if (payload && typeof payload === "object" && "data" in (payload as Record<string, unknown>)) {
    return (payload as Record<string, unknown>).data as T;
  }
  return payload as T;
}

/** Called by the auth layer when a 401 means the session must be dropped. */
export function handleUnauthorized() {
  tokenStore.clear();
  unauthorizedHandler?.();
}
