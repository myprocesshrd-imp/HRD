import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import type { MockUser, Role } from "./mock-data";
import { idmsLogin } from "@/services/idms.service";

interface AuthCtx {
  user: MockUser | null;
  isAuthenticated: boolean;
  login: (employeeCode: string, password: string) => Promise<MockUser>;
  logout: () => void;
  hasRole: (...r: Role[]) => boolean;
}

const Ctx = createContext<AuthCtx | null>(null);
const STORAGE_KEY = "hrpulse.session";

function mockLogin(employeeCode: string, password: string): MockUser {
  throw new Error("Invalid credentials");
}

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

  const login = async (employeeCode: string, password: string) => {
    console.log("[Auth] Login attempt:", employeeCode);

    // 1. Try IDMS → Supabase
    const syncResult = await idmsLogin(employeeCode, password);
    if (syncResult?.success) {
      console.log("[Auth] IDMS login OK, role:", syncResult.role);
      const matched: MockUser = {
        id: syncResult.employeeCode,
        employeeCode: syncResult.employeeCode,
        email: syncResult.email,
        password: "",
        nameTh: syncResult.nameTh,
        nameEn: syncResult.nameEn,
        role: syncResult.role,
        department: syncResult.department,
        businessUnit: syncResult.businessUnit,
        level: syncResult.level,
        location: syncResult.location,
        avatarUrl: syncResult.avatarUrl,
      };
      setUser(matched);
      if (typeof window !== "undefined") localStorage.setItem(STORAGE_KEY, JSON.stringify(matched));
      return matched;
    }

    // 2. Fallback to mock users
    console.log("[Auth] Falling back to mock auth...");
    try {
      const mockUser = mockLogin(employeeCode, password);
      setUser(mockUser);
      if (typeof window !== "undefined") localStorage.setItem(STORAGE_KEY, JSON.stringify(mockUser));
      return mockUser;
    } catch (err) {
      console.error("[Auth] Mock login failed:", err);
      throw err;
    }
  };

  const logout = async () => {
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
