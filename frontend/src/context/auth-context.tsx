import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { onUnauthorized, tokenStore } from "@/services/api-client";
import { authService, type LoginInput, type RegisterInput } from "@/services/auth-service";
import type { AuthUser } from "@/types/api";

interface AuthContextValue {
  user: AuthUser | null;
  isAuthenticated: boolean;
  loading: boolean;
  login: (input: LoginInput) => Promise<void>;
  register: (input: RegisterInput) => Promise<{ signedIn: boolean }>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setIsAuthenticated(Boolean(tokenStore.get()));
    setUser(tokenStore.getUser<AuthUser>());
    setLoading(false);
  }, []);

  useEffect(() => {
    onUnauthorized(() => {
      setIsAuthenticated(false);
      setUser(null);
    });
  }, []);

  const login = useCallback(async (input: LoginInput) => {
    const session = await authService.login(input);
    authService.persist(session);
    setUser(session.user ?? { email: input.email });
    setIsAuthenticated(true);
  }, []);

  const register = useCallback(async (input: RegisterInput) => {
    const result = await authService.register(input);
    if (result.session) {
      authService.persist(result.session);
      setUser(result.session.user ?? { name: input.name, email: input.email });
      setIsAuthenticated(true);
      return { signedIn: true };
    }
    return { signedIn: false };
  }, []);

  const logout = useCallback(() => {
    authService.signOut();
    setUser(null);
    setIsAuthenticated(false);
  }, []);

  const value = useMemo(
    () => ({ user, isAuthenticated, loading, login, register, logout }),
    [user, isAuthenticated, loading, login, register, logout],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error("useAuth must be used within AuthProvider");
  return context;
}
