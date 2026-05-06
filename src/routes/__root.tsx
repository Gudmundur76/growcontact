import { Outlet, Link, createRootRoute, HeadContent, Scripts } from "@tanstack/react-router";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useState } from "react";
import { AuthProvider } from "@/contexts/AuthContext";

import appCss from "../styles.css?url";
import { Toaster } from "@/components/ui/sonner";

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

export const Route = createRootRoute({
  head: () => ({
    meta: [
      { charSet: "utf-8" },
      { name: "viewport", content: "width=device-width, initial-scale=1" },
      {
        title: "Grow — The talent operating system for high-growth teams",
      },
      {
        name: "description",
        content:
          "Grow is the AI talent operating system. Source, screen, interview and hire your next 10 people from one calibrated platform.",
      },
      { name: "author", content: "Grow Labs, Inc." },
      { name: "theme-color", content: "#0b0b10" },
      {
        property: "og:title",
        content: "Grow — The talent operating system",
      },
      {
        property: "og:description",
        content:
          "Source, screen, interview and hire from one calibrated AI platform. 14-day free trial.",
      },
      { property: "og:type", content: "website" },
      { property: "og:site_name", content: "Grow" },
      { name: "twitter:card", content: "summary_large_image" },
      { name: "twitter:title", content: "Grow contact" },
      {
        name: "twitter:description",
        content:
          "Source, screen, interview and hire from one calibrated AI platform.",
      },
      { property: "og:image", content: "https://pub-bb2e103a32db4e198524a2e9ed8f35b4.r2.dev/619b56c4-eb2b-476b-80fb-b55a066ffc5f/id-preview-d21d0f50--e1107b25-62a7-46ae-ab03-790d77a20251.lovable.app-1777895398072.png" },
      { name: "twitter:image", content: "https://pub-bb2e103a32db4e198524a2e9ed8f35b4.r2.dev/619b56c4-eb2b-476b-80fb-b55a066ffc5f/id-preview-d21d0f50--e1107b25-62a7-46ae-ab03-790d77a20251.lovable.app-1777895398072.png" },
    ],
    links: [
      {
        rel: "stylesheet",
        href: appCss,
      },
      { rel: "icon", type: "image/svg+xml", href: "/favicon.svg" },
      {
        rel: "alternate",
        type: "application/rss+xml",
        title: "Grow Blog",
        href: "https://grow.contact/rss.xml",
      },
    ],
    scripts: [
      {
        type: "application/ld+json",
        children: JSON.stringify({
          "@context": "https://schema.org",
          "@type": "Organization",
          name: "Grow",
          url: "https://grow.contact",
          logo: "https://grow.contact/favicon.svg",
          sameAs: [],
        }),
      },
    ],
  }),
  shellComponent: RootShell,
  component: RootComponent,
  notFoundComponent: NotFoundComponent,
});

function RootShell({ children }: { children: React.ReactNode }) {
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
  const [queryClient] = useState(() => new QueryClient());
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <Outlet />
        <Toaster />
      </AuthProvider>
    </QueryClientProvider>
  );
}
