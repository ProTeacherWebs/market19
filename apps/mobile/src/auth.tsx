import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { createClient, getProfile, getToken, setProfile, setToken, type StoredProfile } from "./api";

type AuthState = {
  ready: boolean;
  token: string | null;
  profile: StoredProfile | null;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
};

const AuthContext = createContext<AuthState | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [ready, setReady] = useState(false);
  const [token, setTokenState] = useState<string | null>(null);
  const [profile, setProfileState] = useState<StoredProfile | null>(null);

  useEffect(() => {
    void (async () => {
      const [t, p] = await Promise.all([getToken(), getProfile()]);
      setTokenState(t);
      setProfileState(p);
      setReady(true);
    })();
  }, []);

  const value = useMemo<AuthState>(
    () => ({
      ready,
      token,
      profile,
      async login(email, password) {
        const res = await createClient().authEmail(email, password);
        await setToken(res.token);
        const next = {
          id: res.profile.id,
          displayName: res.profile.displayName,
          email: res.profile.email,
        };
        await setProfile(next);
        setTokenState(res.token);
        setProfileState(next);
      },
      async logout() {
        await setToken(null);
        await setProfile(null);
        setTokenState(null);
        setProfileState(null);
      },
    }),
    [ready, token, profile],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("AuthProvider missing");
  return ctx;
}
