import { createContext, useCallback, useContext, useEffect, useState, ReactNode } from "react";
import { hostingerApi, type ApiUser } from "@/lib/hostingerApi";

export type AppRole = "admin" | "editor" | "author" | "contributor" | "reader";

export interface CmsUser {
  id: string;
  email: string;
  display_name: string;
  slug: string;
  avatar_url?: string | null;
  bio?: string | null;
  role_title?: string | null;
  points: number;
  total_points_earned: number;
  email_verified: boolean;
  totp_enabled: boolean;
}

interface CmsAuthCtx {
  user: CmsUser | null;
  session: { user: CmsUser } | null;
  roles: AppRole[];
  loading: boolean;
  isAdmin: boolean;
  isStaff: boolean;
  isContributor: boolean;
  signIn: (email: string, password: string) => Promise<{ error: string | null; user?: CmsUser; roles?: AppRole[]; requires_2fa?: boolean; two_factor_token?: string }>;
  complete2fa: (two_factor_token: string, code: string) => Promise<{ error: string | null; roles?: AppRole[] }>;
  signUp: (email: string, password: string, displayName: string) => Promise<{ error: string | null; user?: CmsUser; roles?: AppRole[] }>;
  signOut: () => Promise<void>;
  refresh: () => Promise<void>;
  googleSignInUrl: string;
}

const Ctx = createContext<CmsAuthCtx | null>(null);

const normalizeUser = (apiUser: ApiUser): CmsUser => ({
  id: String(apiUser.id),
  email: apiUser.email,
  display_name: apiUser.display_name,
  slug: apiUser.slug,
  avatar_url: apiUser.avatar_url,
  bio: apiUser.bio,
  role_title: apiUser.role_title,
  points: apiUser.points ?? 0,
  total_points_earned: apiUser.total_points_earned ?? 0,
  email_verified: Boolean(apiUser.email_verified),
  totp_enabled: Boolean(apiUser.totp_enabled),
});

export const CmsAuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<CmsUser | null>(null);
  const [roles, setRoles] = useState<AppRole[]>([]);
  const [loading, setLoading] = useState(true);

  const applyUser = useCallback((apiUser: ApiUser | null) => {
    if (!apiUser) {
      setUser(null);
      setRoles([]);
      return;
    }
    setUser(normalizeUser(apiUser));
    setRoles((apiUser.roles ?? []) as AppRole[]);
  }, []);

  const refresh = useCallback(async () => {
    if (!hostingerApi.hasSessionToken()) {
      applyUser(null);
      return;
    }
    try {
      const res = await hostingerApi.me();
      if (!res || !res.user) {
        throw new Error("Invalid auth response from server.");
      }
      applyUser(res.user);
    } catch {
      applyUser(null);
    }
  }, [applyUser]);

  useEffect(() => {
    const referralCode = new URLSearchParams(window.location.search).get("ref");
    if (referralCode && /^[a-zA-Z0-9_-]{6,64}$/.test(referralCode)) {
      localStorage.setItem("tradingle_referral_code", referralCode);
    }

    refresh().finally(() => setLoading(false));
  }, [refresh]);

  const signIn = useCallback(async (email: string, password: string) => {
    try {
      const res = await hostingerApi.login(email, password);
      if (!res || !res.user) {
        throw new Error("Invalid auth response from server.");
      }
      // Two-factor enabled: no session is created from credentials alone. The
      // login flow must now present an authenticator-code step.
      if (res.requires_2fa && res.two_factor_token) {
        return { error: null, requires_2fa: true, two_factor_token: res.two_factor_token };
      }
      applyUser(res.user);
      return { error: null, user: normalizeUser(res.user), roles: (res.user.roles ?? []) as AppRole[] };
    } catch (e: unknown) {
      const errorMessage = e instanceof Error ? e.message : "Sign in failed";
      return { error: errorMessage };
    }
  }, [applyUser]);

  const complete2fa = useCallback(async (two_factor_token: string, code: string) => {
    try {
      const res = await hostingerApi.login2fa(two_factor_token, code);
      if (!res || !res.user) {
        throw new Error("Invalid authentication response from server.");
      }
      applyUser(res.user);
      return { error: null, roles: (res.user.roles ?? []) as AppRole[] };
    } catch (e: unknown) {
      const errorMessage = e instanceof Error ? e.message : "Two-factor verification failed";
      return { error: errorMessage };
    }
  }, [applyUser]);

  const signUp = useCallback(async (email: string, password: string, displayName: string) => {
    try {
      const res = await hostingerApi.register(displayName, email, password);
      if (!res || !res.user) {
        throw new Error("Invalid auth response from server.");
      }
      applyUser(res.user);
      return { error: null, user: normalizeUser(res.user), roles: (res.user.roles ?? []) as AppRole[] };
    } catch (e: unknown) {
      const errorMessage = e instanceof Error ? e.message : "Sign up failed";
      return { error: errorMessage };
    }
  }, [applyUser]);

  const signOut = useCallback(async () => {
    try {
      await hostingerApi.logout();
    } finally {
      applyUser(null);
    }
  }, [applyUser]);

  return (
    <Ctx.Provider value={{
      user,
      session: user ? { user } : null,
      roles,
      loading,
      isAdmin: roles.includes("admin"),
      isStaff: roles.includes("admin") || roles.includes("editor"),
      isContributor: roles.includes("contributor") || roles.includes("author") || roles.includes("admin") || roles.includes("editor"),
      signIn,
      complete2fa,
      signUp,
      signOut,
      refresh,
      googleSignInUrl: hostingerApi.googleLoginUrl(),
    }}>
      {children}
    </Ctx.Provider>
  );
};

export const useCmsAuth = () => {
  const c = useContext(Ctx);
  if (!c) throw new Error("useCmsAuth must be used within CmsAuthProvider");
  return c;
};
