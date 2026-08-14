import { useEffect, type ReactNode } from "react";
import { useNavigate } from "@tanstack/react-router";
import { Lock } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { AppLoader } from "@/components/AppLoader";

/**
 * Only /(sessions) is public — everything else requires a real account.
 *
 * DEV-ONLY BYPASS: in local `vite dev` this gate is skipped entirely so the
 * dashboard is reachable without signing in (there's no Lovable OAuth broker
 * route locally, see /~oauth/initiate). `import.meta.env.DEV` is replaced at
 * build time, so this branch — and the bypass — is stripped out of
 * production builds and never ships.
 */
export function AuthGate({ children }: { children: ReactNode }) {
  const { user, isGuest, loading } = useAuth();
  const navigate = useNavigate();
  const allowed = import.meta.env.DEV || (!!user && !isGuest);

  useEffect(() => {
    if (!loading && !allowed) navigate({ to: "/auth", replace: true });
  }, [loading, allowed, navigate]);

  if (import.meta.env.DEV) return <>{children}</>;
  if (loading) return <AppLoader contained overlay visible />;
  if (allowed) return <>{children}</>;

  return (
    <div className="flex min-h-[60vh] w-full flex-1 items-center justify-center">
      <div className="card-surface flex flex-col items-center gap-3 px-8 py-10 text-center">
        <Lock className="size-5 text-[#F0736F]" strokeWidth={1.6} />
        <p className="text-[15px] text-[#F0F2F5]">Sign in required</p>
        <p className="max-w-[34ch] text-[13px] text-[#7A828D]">
          Taking you to the sign-in page…
        </p>
      </div>
    </div>
  );
}
