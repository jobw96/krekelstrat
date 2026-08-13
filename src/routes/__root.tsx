import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
  Outlet,
  Link,
  createRootRouteWithContext,
  useRouter,
  useRouterState,
  HeadContent,
  Scripts,
} from "@tanstack/react-router";
import { useEffect, useState, type ReactNode } from "react";

import { AppRail } from "../components/AppRail";
import { AppLoader } from "../components/AppLoader";
import { AuthGate } from "../components/AuthGate";

import appCss from "../styles.css?url";
import { reportLovableError } from "../lib/lovable-error-reporting";

function NotFoundComponent() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="max-w-md text-center">
        <h1 className="text-7xl font-bold text-foreground">404</h1>
        <h2 className="mt-4 text-xl font-semibold text-foreground">Page not found</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          The page you're looking for doesn't exist or has been moved.
        </p>
        <div className="mt-6">
          <Link
            to="/"
            className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
          >
            Go home
          </Link>
        </div>
      </div>
    </div>
  );
}

function ErrorComponent({ error, reset }: { error: Error; reset: () => void }) {
  console.error(error);
  const router = useRouter();
  useEffect(() => {
    reportLovableError(error, { boundary: "tanstack_root_error_component" });
  }, [error]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="max-w-md text-center">
        <h1 className="text-xl font-semibold tracking-tight text-foreground">
          This page didn't load
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Something went wrong on our end. You can try refreshing or head back home.
        </p>
        <div className="mt-6 flex flex-wrap justify-center gap-2">
          <button
            onClick={() => {
              router.invalidate();
              reset();
            }}
            className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
          >
            Try again
          </button>
          <a
            href="/"
            className="inline-flex items-center justify-center rounded-md border border-input bg-background px-4 py-2 text-sm font-medium text-foreground transition-colors hover:bg-accent"
          >
            Go home
          </a>
        </div>
      </div>
    </div>
  );
}

export const Route = createRootRouteWithContext<{ queryClient: QueryClient }>()({
  head: () => ({
    meta: [
      { charSet: "utf-8" },
      { name: "viewport", content: "width=device-width, initial-scale=1" },
      { title: "Krekelstrat Terminal" },
      {
        name: "description",
        content:
          "Live trading sessions, killzone countdowns and a full trading journal for index futures traders.",
      },
      { name: "author", content: "Krekelstrat" },
      { property: "og:title", content: "Krekelstrat Terminal" },
      {
        property: "og:description",
        content: "Live trading sessions, killzone countdowns and a full trading journal.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
      { name: "theme-color", content: "#08090a" },
      { name: "apple-mobile-web-app-capable", content: "yes" },
      { name: "apple-mobile-web-app-status-bar-style", content: "black-translucent" },
      { name: "apple-mobile-web-app-title", content: "Krekelstrat" },
    ],
    links: [
      {
        rel: "stylesheet",
        href: appCss,
      },
      { rel: "preconnect", href: "https://fonts.googleapis.com" },
      { rel: "preconnect", href: "https://fonts.gstatic.com", crossOrigin: "anonymous" },
      {
        rel: "stylesheet",
        href: "https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600&family=JetBrains+Mono:wght@400;500&display=swap",
      },
      { rel: "icon", type: "image/png", href: "/favicon.png" },
      { rel: "apple-touch-icon", href: "/apple-touch-icon.png" },
      { rel: "manifest", href: "/manifest.webmanifest" },
    ],
  }),
  shellComponent: RootShell,
  component: RootComponent,
  notFoundComponent: NotFoundComponent,
  errorComponent: ErrorComponent,
});

function RootShell({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <head>
        <HeadContent />
      </head>
      <body>
        {children}
        <Scripts />
      </body>
    </html>
  );
}

function RootComponent() {
  const { queryClient } = Route.useRouteContext();
  const pathname = useRouterState({ select: (s) => s.resolvedLocation?.pathname ?? s.location.pathname });
  const transitioning = useRouterState(
    { select: (s) => s.status === "pending" || s.isLoading || s.isTransitioning },
  );
  const [hydrated, setHydrated] = useState(false);
  const [showLoader, setShowLoader] = useState(true);

  useEffect(() => {
    const id = requestAnimationFrame(() => setHydrated(true));
    return () => cancelAnimationFrame(id);
  }, []);

  const busy = !hydrated || transitioning;

  // Jump back to the top instantly while the view is faded out, so the
  // sticky rail never re-positions mid-animation.
  useEffect(() => {
    if (typeof window !== "undefined") window.scrollTo(0, 0);
  }, [pathname]);

  // Only show the overlay when a transition actually takes a while,
  // so quick route swaps are a single clean fade instead of a flash.
  useEffect(() => {
    if (!busy) {
      setShowLoader(false);
      return;
    }
    const t = setTimeout(() => setShowLoader(true), 180);
    return () => clearTimeout(t);
  }, [busy]);
  const bare = pathname.startsWith("/auth");
  const isPublic = pathname === "/";

  return (
    <QueryClientProvider client={queryClient}>
      {bare ? (
        <>
          <div
            key={pathname}
            className="transition-opacity duration-150 ease-linear"
            style={{ opacity: busy ? 0 : 1 }}
          >
            {/* Required: nested routes render here. Removing <Outlet /> breaks all child routes. */}
            <Outlet />
          </div>
          <AppLoader overlay visible={busy && showLoader} />
        </>
      ) : (
        <main className="app-shell min-h-screen">
          <div className="flex w-full gap-4 px-3 pb-24 pt-4 sm:px-5 lg:pb-4 lg:pl-[92px]">
            {/* The rail is outside every route transition and loading layer. */}
            <AppRail />
            <div className="relative min-h-[calc(100vh-32px)] min-w-0 flex-1">
              <div
                key={pathname}
                className="flex min-h-[calc(100vh-32px)] min-w-0 w-full gap-4 transition-opacity duration-150 ease-linear"
                style={{ opacity: busy ? 0 : 1 }}
              >
                {isPublic ? <Outlet /> : <AuthGate><Outlet /></AuthGate>}
              </div>
              <AppLoader contained overlay visible={busy && showLoader} />
            </div>
          </div>
        </main>
      )}
    </QueryClientProvider>
  );
}
