import { useCallback } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "./useAuth";
import { toast } from "@/hooks/use-toast";

/**
 * Action-level auth guard.
 *
 * Wrap any handler that performs a write/personalized action (form submit,
 * publish, queue, archive, edit-navigate, save, settings change, etc.).
 * Read-only browsing of pages stays public — only the action itself is
 * gated. If the user is not signed in, we route to /auth and preserve the
 * current path via `?next=` so they return after login.
 */
export function useRequireAuthAction() {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  return useCallback(
    <T extends (...args: any[]) => any>(action: T) => {
      return ((...args: Parameters<T>) => {
        if (loading) return;
        if (!user) {
          const next = encodeURIComponent(location.pathname + location.search + location.hash);
          toast({
            title: "로그인이 필요한 작업입니다",
            description: "이 작업을 계속하려면 먼저 로그인하세요.",
          });
          navigate(`/auth?next=${next}`);
          return;
        }
        return action(...args);
      }) as T;
    },
    [user, loading, navigate, location.pathname, location.search, location.hash],
  );
}
