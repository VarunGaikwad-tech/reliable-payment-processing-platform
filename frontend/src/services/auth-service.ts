import { apiRequest, tokenStore } from "./api-client";
import type { AuthResult, AuthUser } from "@/types/api";

interface RawAuthResponse {
  token?: string;
  accessToken?: string;
  user?: AuthUser;
  [key: string]: unknown;
}

/** Read the token from whichever field the backend uses, without inventing one. */
function readAuthResult(raw: RawAuthResponse | null): AuthResult {
  const token = raw?.token ?? raw?.accessToken;
  if (!token || typeof token !== "string") {
    throw new Error("The sign-in response did not include an authentication token.");
  }
  return { token, user: raw?.user ?? null };
}

export interface RegisterInput {
  name: string;
  email: string;
  password: string;
}

export interface LoginInput {
  email: string;
  password: string;
}

export const authService = {
  async register(input: RegisterInput): Promise<{ user: AuthUser | null; session: AuthResult | null }> {
    const raw = await apiRequest<RawAuthResponse | null>("/auth/register", {
      method: "POST",
      body: input,
      auth: false,
    });
    // Some deployments return a token on register, some don't. Both are fine.
    const token = raw?.token ?? raw?.accessToken;
    if (typeof token === "string" && token) {
      const session = readAuthResult(raw);
      return { user: session.user, session };
    }
    return { user: raw?.user ?? null, session: null };
  },

  async login(input: LoginInput): Promise<AuthResult> {
    const raw = await apiRequest<RawAuthResponse | null>("/auth/login", {
      method: "POST",
      body: input,
      auth: false,
    });
    return readAuthResult(raw);
  },

  persist(session: AuthResult) {
    tokenStore.set(session.token);
    if (session.user) tokenStore.setUser(session.user);
  },

  signOut() {
    tokenStore.clear();
  },
};
