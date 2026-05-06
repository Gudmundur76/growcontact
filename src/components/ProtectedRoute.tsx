import { Navigate, Outlet } from "@tanstack/react-router";
import { useAuth } from "@/hooks/use-auth";

interface ProtectedRouteProps {
  /** Rendered as a child when used inline. Falls back to <Outlet /> when used as a layout route. */
  children?: React.ReactNode;
  redirectTo?: string;
}

export function ProtectedRoute({
  children,
  redirectTo = "/login",
}: ProtectedRouteProps) {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <span className="text-sm text-muted-foreground">Loading…</span>
      </div>
    );
  }

  if (!user) {
    return <Navigate to={redirectTo} />;
  }

  return <>{children ?? <Outlet />}</>;
}
