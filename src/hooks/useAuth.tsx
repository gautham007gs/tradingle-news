import { createContext, useContext, useState, useEffect, ReactNode, useCallback } from "react";
import { hostingerApi, type ApiUser } from "@/lib/hostingerApi";

interface User {
  id?: number;
  name: string;
  email: string;
  avatar?: string;
  joinedAt: string;
  slug?: string;
  roles?: string[];
}

interface AuthContextType {
  user: User | null;
  isAuthModalOpen: boolean;
  openAuthModal: () => void;
  closeAuthModal: () => void;
  signIn: (email: string, password: string, name?: string) => Promise<void>;
  signUp: (name: string, email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | null>(null);

const normalizeUser = (apiUser: ApiUser): User => ({
  id: apiUser.id,
  name: apiUser.display_name || apiUser.email.split("@")[0],
  email: apiUser.email,
  avatar: apiUser.avatar_url || undefined,
  joinedAt: new Date().toISOString(),
  slug: apiUser.slug,
  roles: apiUser.roles ?? [],
});

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);

  useEffect(() => {
    const referralCode = new URLSearchParams(window.location.search).get("ref");
    if (referralCode && /^[a-zA-Z0-9_-]{6,64}$/.test(referralCode)) {
      localStorage.setItem("tradingle_referral_code", referralCode);
    }

    hostingerApi.absorbOAuthTokenFromHash();
    hostingerApi.me()
      .then((res) => {
        if (res.user) {
          setUser(normalizeUser(res.user));
        } else {
          setUser(null);
        }
      })
      .catch(() => setUser(null));
  }, []);

  const openAuthModal = useCallback(() => setIsAuthModalOpen(true), []);
  const closeAuthModal = useCallback(() => setIsAuthModalOpen(false), []);

  const signIn = useCallback(async (email: string, password: string) => {
    try {
      const res = await hostingerApi.login(email, password);
      setUser(normalizeUser(res.user));
      setIsAuthModalOpen(false);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Login failed. Please try again.";
      throw error; // Re-throw for modal to handle
    }
  }, []);

  const signUp = useCallback(async (name: string, email: string, password: string) => {
    try {
      const res = await hostingerApi.register(name, email, password);
      setUser(normalizeUser(res.user));
      setIsAuthModalOpen(false);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Registration failed. Please try again.";
      throw error; // Re-throw for modal to handle
    }
  }, []);

  const signOut = useCallback(async () => {
    try {
      await hostingerApi.logout();
    } finally {
      setUser(null);
    }
  }, []);

  return (
    <AuthContext.Provider value={{ user, isAuthModalOpen, openAuthModal, closeAuthModal, signIn, signUp, signOut }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
};
