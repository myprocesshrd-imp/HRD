import { createFileRoute, redirect } from "@tanstack/react-router";

export const Route = createFileRoute("/")({
  beforeLoad: () => {
    // Read session from localStorage (same key used by AuthProvider)
    try {
      const raw = typeof window !== "undefined" ? localStorage.getItem("hrpulse.session") : null;
      const user = raw ? JSON.parse(raw) : null;
      if (user?.role === "employee") {
        throw redirect({ to: "/home" });
      }
    } catch (e) {
      // If redirect was thrown, rethrow it
      if (e && typeof e === "object" && "isRedirect" in e) throw e;
    }
    throw redirect({ to: "/home" });
  },
});
