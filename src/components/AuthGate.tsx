import { useEffect, type ReactNode } from "react";
import { useNavigate } from "@tanstack/react-router";
import { Lock } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { AppLoader } from "@/components/AppLoader";

/** Only /(sessions) is public — everything else requires a real account. */
export function AuthGate({ children }: { children: ReactNode }) {
  const { user, isGuest, loading } = useAuth();
  const navigate = useNavigate();
  const allowed = !!user && !isGuest;

  useEffect(() => {
    if (!loading && !allowed) navigate({ to: "/auth", replace: true });
  }, [loading, allowed, navigate]);

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
