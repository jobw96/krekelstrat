import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { LogOut } from "lucide-react";

import { useAuth } from "@/hooks/useAuth";
import { AppLoader } from "@/components/AppLoader";
import { PropFirmsView } from "@/components/journal/PropFirmsView";

export const Route = createFileRoute("/prop-firms")({
  head: () => ({
    meta: [
      { title: "Prop Firms — Krekelstrat Terminal" },
      {
        name: "description",
        content:
          "Prop firm dashboard tracking evaluation costs, payouts, ROI, pass and breach rates across Topstep, Apex, MyFundedFutures, Lucid and Tradeify accounts.",
      },
      { property: "og:title", content: "Prop Firms — Krekelstrat Terminal" },
      {
        property: "og:description",
        content: "Track challenge costs, payouts, ROI and pass/breach rates per futures prop firm.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: PropFirmsPage,
});

function PropFirmsPage() {
  const { user, isGuest, loading, signOut } = useAuth();
  const navigate = useNavigate();

  if (loading || !user) return <AppLoader />;

  return (
    <div className="flex min-w-0 flex-1 flex-col gap-3">
      <header className="flex items-center justify-between gap-3">
        <div className="flex min-w-0 flex-col gap-0.5">
          <h1 className="truncate text-[18px] text-white" style={{ fontWeight: 560 }}>
            Prop Firms
          </h1>
          <span className="text-[11px] text-[#7A828D]">
            Challenge costs, payouts and funded account performance
          </span>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          <span className="hidden rounded-full bg-white/6 px-3 py-1.5 text-[12px] text-[#9AA1AC] sm:inline">
            {isGuest ? "Guest mode · no login" : user.email}
          </span>
          {isGuest ? (
            <Link
              to="/auth"
              className="hover-lift inline-flex items-center gap-1.5 rounded-full bg-white/6 px-3 py-2 text-[13px] text-[#F0F2F5] hover:bg-white/12"
            >
              <LogOut className="size-3.5" /> Sign in
            </Link>
          ) : (
            <button
              onClick={async () => {
                await signOut();
                navigate({ to: "/auth" });
              }}
              className="hover-lift inline-flex items-center gap-1.5 rounded-full bg-white/6 px-3 py-2 text-[13px] text-[#F0F2F5] hover:bg-white/12"
            >
              <LogOut className="size-3.5" /> Log out
            </button>
          )}
        </div>
      </header>

      <PropFirmsView userId={user.id} />
    </div>
  );
}
