import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { createClient, getStoredToken, setStoredToken } from "./api";
import { bootstrapTelegram, readInitData } from "./telegram";

type Profile = {
  id: string;
  displayName: string;
  telegramUserId: string;
};

type AuthState = {
  ready: boolean;
  isTelegram: boolean;
  token: string | null;
  profile: Profile | null;
  error: string | null;
  refresh: () => Promise<void>;
};

const AuthContext = createContext<AuthState | null>(null);

const PROFILE_KEY = "velin_tg_profile";

export function AuthProvider({ children }: { children: ReactNode }) {
  const [ready, setReady] = useState(false);
  const [isTelegram, setIsTelegram] = useState(false);
  const [token, setToken] = useState<string | null>(getStoredToken());
  const [profile, setProfile] = useState<Profile | null>(() => {
    try {
      const raw = localStorage.getItem(PROFILE_KEY);
      return raw ? (JSON.parse(raw) as Profile) : null;
    } catch {
      return null;
    }
  });
  const [error, setError] = useState<string | null>(null);

  const refresh = async () => {
    setError(null);
    const boot = bootstrapTelegram();
    setIsTelegram(boot.isTelegram);

    const initData = readInitData();
    if (!initData) {
      if (import.meta.env.DEV && import.meta.env.VITE_DEV_INIT_DATA) {
        const client = createClient();
        const res = await client.authTelegram(String(import.meta.env.VITE_DEV_INIT_DATA));
        setStoredToken(res.token);
        setToken(res.token);
        setProfile(res.profile);
        localStorage.setItem(PROFILE_KEY, JSON.stringify(res.profile));
        return;
      }
      setError(boot.isTelegram ? "Нет initData от Telegram" : "Откройте Mini App внутри Telegram");
      return;
    }

    const client = createClient();
    const res = await client.authTelegram(initData);
    setStoredToken(res.token);
    setToken(res.token);
    setProfile(res.profile);
    localStorage.setItem(PROFILE_KEY, JSON.stringify(res.profile));
  };

  useEffect(() => {
    void (async () => {
      try {
        await refresh();
      } catch (e) {
        setError(e instanceof Error ? e.message : "Ошибка входа");
      } finally {
        setReady(true);
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const value = useMemo(
    () => ({ ready, isTelegram, token, profile, error, refresh }),
    [ready, isTelegram, token, profile, error],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("AuthProvider missing");
  return ctx;
}
