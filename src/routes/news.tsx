import { createFileRoute } from "@tanstack/react-router";
import { Newspaper } from "lucide-react";
import { NewsPanel } from "@/components/journal/NewsPanel";

export const Route = createFileRoute("/news")({
  head: () => ({
    meta: [
      { title: "Macro News — Krekelstrat Terminal" },
      {
        name: "description",
        content:
          "USD economic calendar with red and orange folder high-impact events, bullish/bearish bias detection and daily navigation for futures traders.",
      },
      { property: "og:title", content: "Macro News — Krekelstrat Terminal" },
      {
        property: "og:description",
        content: "Red and orange folder USD news calendar with bias detection.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: NewsPage,
});

function NewsPage() {
  return (
    <div className="flex min-w-0 flex-1 flex-col gap-5">
      <header className="flex items-center gap-2">
        <Newspaper className="size-4 text-[#5ec8f5]" strokeWidth={1.6} />
        <h1 className="text-[18px] text-white" style={{ fontWeight: 560 }}>
          Macro News
        </h1>
      </header>
      <NewsPanel />
    </div>
  );
}
