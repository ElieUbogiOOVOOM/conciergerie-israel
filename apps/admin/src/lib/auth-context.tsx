"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import {
  accessTokenExpiry,
  getAccessToken,
  login as apiLogin,
  logout as apiLogout,
  refresh as apiRefresh,
} from "./api";

type AuthStatus = "loading" | "authenticated" | "unauthenticated";

interface AuthContextValue {
  status: AuthStatus;
  /** Email de l'admin connecté (décodé du JWT), si disponible. */
  email: string | null;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

/** Marge avant expiration pour déclencher le refresh silencieux (60 s). */
const REFRESH_MARGIN_MS = 60_000;

/** Email encodé dans l'access token courant (pour l'affichage). */
function currentEmail(): string | null {
  const token = getAccessToken();
  if (!token) return null;
  try {
    return (JSON.parse(atob(token.split(".")[1] ?? "")) as { email?: string }).email ?? null;
  } catch {
    return null;
  }
}

/**
 * Fournit l'état d'authentification au back-office. Au montage, tente un refresh
 * silencieux (réhydrate la session si le cookie refresh httpOnly est valide),
 * puis planifie un refresh anticipé avant chaque expiration d'access token.
 */
export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [status, setStatus] = useState<AuthStatus>("loading");
  const [email, setEmail] = useState<string | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const clearTimer = useCallback(() => {
    if (timer.current) {
      clearTimeout(timer.current);
      timer.current = null;
    }
  }, []);

  // Programme le prochain refresh silencieux juste avant l'expiration du token.
  const scheduleRefresh = useCallback(() => {
    clearTimer();
    const expiry = accessTokenExpiry();
    if (!expiry) return;
    const delay = Math.max(expiry - Date.now() - REFRESH_MARGIN_MS, 5_000);
    timer.current = setTimeout(() => {
      void apiRefresh().then((ok) => {
        if (ok) {
          setEmail(currentEmail());
          scheduleRefresh();
        } else {
          setStatus("unauthenticated");
          setEmail(null);
        }
      });
    }, delay);
  }, [clearTimer]);

  useEffect(() => {
    let active = true;
    void apiRefresh().then((ok) => {
      if (!active) return;
      setStatus(ok ? "authenticated" : "unauthenticated");
      setEmail(ok ? currentEmail() : null);
      if (ok) scheduleRefresh();
    });
    return () => {
      active = false;
      clearTimer();
    };
  }, [scheduleRefresh, clearTimer]);

  const login = useCallback(
    async (mail: string, password: string) => {
      await apiLogin(mail, password);
      setStatus("authenticated");
      setEmail(currentEmail());
      scheduleRefresh();
    },
    [scheduleRefresh],
  );

  const logout = useCallback(async () => {
    clearTimer();
    await apiLogout();
    setStatus("unauthenticated");
    setEmail(null);
  }, [clearTimer]);

  const value = useMemo<AuthContextValue>(
    () => ({ status, email, login, logout }),
    [status, email, login, logout],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

/** Accès au contexte d'authentification. */
export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error("useAuth doit être utilisé dans <AuthProvider>.");
  }
  return ctx;
}
