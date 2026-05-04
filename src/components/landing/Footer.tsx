import { Link } from "@tanstack/react-router";

type FooterLink = { label: string; to?: "/" | "/about" | "/pricing" | "/signup" };

const columns: { title: string; links: FooterLink[] }[] = [
  {
    title: "Product",
    links: [
      { label: "Features" },
      { label: "Pricing", to: "/pricing" },
      { label: "Integrations" },
      { label: "Changelog" },
    ],
  },
  {
    title: "Company",
    links: [
      { label: "About", to: "/about" },
      { label: "Customers" },
      { label: "Careers" },
      { label: "Press" },
    ],
  },
  {
    title: "Resources",
    links: [
      { label: "Docs" },
      { label: "Hiring playbook" },
      { label: "Talent benchmarks" },
      { label: "Support" },
    ],
  },
];

export function Footer() {
  return (
    <footer className="relative px-6 pb-12 pt-24">
      <div className="mx-auto max-w-6xl">
        <div className="grid gap-12 border-t border-white/5 pt-16 md:grid-cols-[2fr_3fr]">
          <div>
            <div className="text-2xl font-semibold tracking-tight text-foreground">
              Grow
            </div>
            <p className="mt-4 max-w-sm text-sm text-muted-foreground">
              The talent operating system for high-growth teams.
            </p>
          </div>
          <div className="grid grid-cols-2 gap-8 sm:grid-cols-3">
            {columns.map((col) => (
              <div key={col.title}>
                <div className="text-sm font-semibold text-foreground">
                  {col.title}
                </div>
                <ul className="mt-4 space-y-3">
                  {col.links.map((l) => (
                    <li key={l.label}>
                      {l.to ? (
                        <Link
                          to={l.to}
                          className="text-sm text-muted-foreground transition-colors hover:text-foreground"
                        >
                          {l.label}
                        </Link>
                      ) : (
                        <a
                          href="#"
                          className="text-sm text-muted-foreground transition-colors hover:text-foreground"
                        >
                          {l.label}
                        </a>
                      )}
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>
        <div className="mt-12 flex flex-col items-start justify-between gap-4 text-xs text-muted-foreground sm:flex-row sm:items-center">
          <div>© {new Date().getFullYear()} Grow Labs, Inc.</div>
          <div className="flex gap-6">
            <a href="#" className="hover:text-foreground">Privacy</a>
            <a href="#" className="hover:text-foreground">Terms</a>
            <a href="#" className="hover:text-foreground">Security</a>
          </div>
        </div>
      </div>
    </footer>
  );
}