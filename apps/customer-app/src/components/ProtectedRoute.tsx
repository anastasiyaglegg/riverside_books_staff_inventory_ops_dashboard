import { type ReactNode } from "react";
import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "@/lib/auth-context";

// Gates a route on a Firebase session. While Firebase is still resolving the persisted
// session (loading), we show a placeholder rather than flashing the login screen at a
// returning, already-signed-in visitor.
export function ProtectedRoute({ children }: { children: ReactNode }) {
  const { user, loading } = useAuth();
  const location = useLocation();

  if (loading) {
    return <p className="text-sm text-stone-500">Loading…</p>;
  }
  if (!user) {
    // Remember where they were headed so we can send them back after login.
    return <Navigate to="/login" replace state={{ from: location.pathname }} />;
  }
  return <>{children}</>;
}
