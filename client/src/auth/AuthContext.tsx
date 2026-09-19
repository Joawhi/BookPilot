import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { apiGet, apiPost, getToken, setToken } from "../api/client";
import { LOCAL_DEV_USER } from "@shared/devAuth";
import type { AuthResponse, UserPublic } from "@shared/types";

interface AuthState {
  user: UserPublic | null;
  ready: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (email: string, password: string, displayName: string) => Promise<void>;
  logout: () => void;
}

const Ctx = createContext<AuthState | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<UserPublic | null>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const token = getToken();
        if (token) {
          try {
            const me = await apiGet<UserPublic>("/api/auth/me");
            if (!cancelled) setUser(me);
            return;
          } catch {
            setToken(null);
          }
        }
        let res: AuthResponse;
        try {
          res = await apiPost<AuthResponse>("/api/auth/login", {
            email: LOCAL_DEV_USER.email,
            password: LOCAL_DEV_USER.password,
          });
        } catch {
          try {
            res = await apiPost<AuthResponse>("/api/auth/register", {
              email: LOCAL_DEV_USER.email,
              password: LOCAL_DEV_USER.password,
              displayName: LOCAL_DEV_USER.displayName,
            });
          } catch {
            res = await apiPost<AuthResponse>("/api/auth/login", {
              email: LOCAL_DEV_USER.email,
              password: LOCAL_DEV_USER.password,
            });
          }
        }
        if (cancelled) return;
        setToken(res.token);
        setUser(res.user);
      } catch {
        setToken(null);
      } finally {
        if (!cancelled) setReady(true);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const value = useMemo<AuthState>(
    () => ({
      user,
      ready,
      async login(email, password) {
        const res = await apiPost<AuthResponse>("/api/auth/login", { email, password });
        setToken(res.token);
        setUser(res.user);
      },
      async register(email, password, displayName) {
        const res = await apiPost<AuthResponse>("/api/auth/register", { email, password, displayName });
        setToken(res.token);
        setUser(res.user);
      },
      logout() {
        setToken(null);
        setUser(null);
      },
    }),
    [user, ready],
  );

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useAuth() {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("useAuth outside provider");
  return ctx;
}
