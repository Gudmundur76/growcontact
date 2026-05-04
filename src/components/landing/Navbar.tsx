import { useState } from "react";
import { Link } from "@tanstack/react-router";
import { Menu, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import logo from "@/assets/logo.png";

type NavTo = "/pricing" | "/customers" | "/blog" | "/about" | "/careers";

const links: { label: string; to: NavTo }[] = [
  { label: "Pricing", to: "/pricing" },
  { label: "Customers", to: "/customers" },
  { label: "Blog", to: "/blog" },
  { label: "About", to: "/about" },
  { label: "Careers", to: "/careers" },
];

export function Navbar() {
  const [open, setOpen] = useState(false);

  return (
    <>
      <nav
        aria-label="Primary"
        className="relative z-20 flex w-full flex-row items-center justify-between px-6 py-5 md:px-8"
      >
        <Link to="/" className="flex items-center gap-2" aria-label="Grow home">
          <img
            src={logo}
            alt="Grow"
            className="h-8 w-auto"
            width={32}
            height={32}
          />
          <span className="text-base font-semibold tracking-tight text-foreground">
            Grow
          </span>
        </Link>

        <div className="hidden items-center gap-1 md:flex">
          {links.map((l) => (
            <Link
              key={l.to}
              to={l.to}
              className="rounded-md px-3 py-2 text-sm text-foreground/80 transition-colors hover:bg-white/5 hover:text-foreground"
              activeProps={{ className: "text-foreground bg-white/5" }}
            >
              {l.label}
            </Link>
          ))}
        </div>

        <div className="flex items-center gap-2">
          <Button
            asChild
            variant="heroSecondary"
            size="sm"
            className="hidden rounded-full px-4 py-2 md:inline-flex"
          >
            <Link to="/signup">Start free trial</Link>
          </Button>
          <button
            type="button"
            aria-label={open ? "Close menu" : "Open menu"}
            aria-expanded={open}
            onClick={() => setOpen((v) => !v)}
            className="inline-flex items-center justify-center rounded-md p-2 text-foreground hover:bg-white/5 md:hidden"
          >
            {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
        </div>
      </nav>
      <div className="mt-[3px] h-px w-full bg-gradient-to-r from-transparent via-foreground/20 to-transparent" />

      {open && (
        <div className="md:hidden">
          <div className="liquid-glass mx-4 mt-3 rounded-2xl bg-card/60 p-3">
            <ul className="flex flex-col">
              {links.map((l) => (
                <li key={l.to}>
                  <Link
                    to={l.to}
                    onClick={() => setOpen(false)}
                    className="block rounded-xl px-4 py-3 text-base text-foreground/90 hover:bg-white/5"
                  >
                    {l.label}
                  </Link>
                </li>
              ))}
            </ul>
            <div className="mt-2 px-1 pb-1">
              <Button
                asChild
                variant="hero"
                className="w-full justify-center rounded-full"
              >
                <Link to="/signup" onClick={() => setOpen(false)}>
                  Start free trial
                </Link>
              </Button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}