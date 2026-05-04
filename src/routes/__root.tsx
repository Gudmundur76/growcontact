import { Outlet, Link, createRootRoute, HeadContent, Scripts } from "@tanstack/react-router";

import appCss from "../styles.css?url";

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
      { name: "twitter:title", content: "Grow — The talent operating system" },
      {
        name: "twitter:description",
        content:
          "Source, screen, interview and hire from one calibrated AI platform.",
      },
    ],
    links: [
      {
        rel: "stylesheet",
        href: appCss,
      },
      { rel: "icon", type: "image/svg+xml", href: "/favicon.svg" },
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
  return <Outlet />;
}
