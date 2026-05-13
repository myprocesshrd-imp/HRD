// Mock auth: persists session in localStorage. Replace with real JWT later.
import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { MOCK_USERS, type MockUser, type Role } from "./mock-data";

interface AuthCtx {
  user: MockUser | null;
  isAuthenticated: boolean;
  login: (email: string, password: string) => Promise<MockUser>;
  logout: () => void;
  hasRole: (...r: Role[]) => boolean;
}

const Ctx = createContext<AuthCtx | null>(null);
const STORAGE_KEY = "hrpulse.session";

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<MockUser | null>(null);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    try {
      const raw = typeof window !== "undefined" ? localStorage.getItem(STORAGE_KEY) : null;
      if (raw) setUser(JSON.parse(raw));
    } catch {}
    setHydrated(true);
  }, []);

  const login = async (email: string, password: string) => {
    const found = MOCK_USERS.find(
      (u) => u.email.toLowerCase() === email.trim().toLowerCase() && u.password === password
    );
    if (!found) throw new Error("Invalid credentials");
    setUser(found);
    if (typeof window !== "undefined") localStorage.setItem(STORAGE_KEY, JSON.stringify(found));
    return found;
  };

  const logout = () => {
    setUser(null);
    if (typeof window !== "undefined") localStorage.removeItem(STORAGE_KEY);
  };

  const hasRole = (...roles: Role[]) => !!user && roles.includes(user.role);

  if (!hydrated) return null;

  return (
    <Ctx.Provider value={{ user, isAuthenticated: !!user, login, logout, hasRole }}>
      {children}
    </Ctx.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
