import { useState } from "react";
import { Link } from "@tanstack/react-router";
import { Menu, X, LogOut, User as UserIcon, Shield, Video } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import logo from "@/assets/logo.png";
import { useAuth } from "@/hooks/use-auth";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";
import { toast } from "sonner";

type NavTo =
  | "/pricing"
  | "/customers"
  | "/blog"
  | "/about"
  | "/careers"
  | "/sourcing"
  | "/screening"
  | "/analytics"
  | "/integrations";

const links: { label: string; to: NavTo }[] = [
  { label: "AI Sourcing", to: "/sourcing" },
  { label: "Screening", to: "/screening" },
  { label: "Interview Copilot", to: "/interview-copilot" as NavTo },
  { label: "Analytics", to: "/analytics" },
  { label: "Pricing", to: "/pricing" },
  { label: "Integrations", to: "/integrations" },
  { label: "Customers", to: "/customers" },
  { label: "Blog", to: "/blog" },
  { label: "About", to: "/about" },
];

export function Navbar() {
  const [open, setOpen] = useState(false);
  const { user, loading } = useAuth();

  const { data: profile } = useQuery({
    queryKey: ["nav-profile", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const [{ data: p }, { data: roles }] = await Promise.all([
        supabase.from("profiles").select("name, company").eq("user_id", user!.id).maybeSingle(),
        supabase.from("user_roles").select("role").eq("user_id", user!.id),
      ]);
      return {
        name: p?.name ?? "",
        company: p?.company ?? "",
        isAdmin: !!roles?.some((r) => r.role === "admin"),
      };
    },
  });

  const displayName = profile?.name?.trim() || user?.email?.split("@")[0] || "Account";
  const initials = displayName
    .split(/\s+/)
    .map((s) => s[0])
    .filter(Boolean)
    .slice(0, 2)
    .join("")
    .toUpperCase();

  async function handleSignOut() {
    const { error } = await supabase.auth.signOut();
    if (error) toast.error(error.message);
    else toast.success("Signed out");
  }

  return (
    <>
      <nav
        aria-label="Primary"
        className="relative z-20 flex w-full flex-row items-center justify-between px-6 py-5 md:px-8"
      >
        <Link to="/" className="flex items-center gap-2" aria-label="Grow home">
          <img src={logo} alt="Grow" className="h-8 w-auto" width={32} height={32} />
          <span className="text-base font-semibold tracking-tight text-foreground">Grow</span>
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
          {!loading && user ? (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button
                  type="button"
                  aria-label="Open account menu"
                  className="hidden items-center gap-2 rounded-full border border-white/10 bg-white/5 py-1 pr-3 pl-1 text-sm text-foreground transition-colors hover:bg-white/10 md:inline-flex"
                >
                  <Avatar className="h-7 w-7">
                    <AvatarFallback className="bg-primary/20 text-xs font-medium text-foreground">
                      {initials || "?"}
                    </AvatarFallback>
                  </Avatar>
                  <span className="max-w-[140px] truncate">{displayName}</span>
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-64">
                <DropdownMenuLabel className="font-normal">
                  <div className="flex flex-col gap-0.5">
                    <span className="truncate text-sm font-medium">{displayName}</span>
                    <span className="truncate text-xs text-muted-foreground">{user.email}</span>
                    {profile?.company ? (
                      <span className="truncate text-xs text-muted-foreground">
                        {profile.company}
                      </span>
                    ) : null}
                  </div>
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem asChild>
                  <Link to="/account" className="cursor-pointer">
                    <UserIcon className="mr-2 h-4 w-4" />
                    Account settings
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuItem asChild>
                  <Link to="/interview" className="cursor-pointer">
                    <Video className="mr-2 h-4 w-4" />
                    Interview Copilot
                  </Link>
                </DropdownMenuItem>
                {profile?.isAdmin ? (
                  <DropdownMenuItem asChild>
                    <Link to="/admin" className="cursor-pointer">
                      <Shield className="mr-2 h-4 w-4" />
                      Admin
                    </Link>
                  </DropdownMenuItem>
                ) : null}
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  onClick={handleSignOut}
                  className="cursor-pointer text-destructive focus:text-destructive"
                >
                  <LogOut className="mr-2 h-4 w-4" />
                  Sign out
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          ) : !loading ? (
            <>
              <Link
                to="/login"
                className="hidden rounded-md px-3 py-2 text-sm text-foreground/80 transition-colors hover:bg-white/5 hover:text-foreground md:inline-flex"
              >
                Sign in
              </Link>
              <Button
                asChild
                variant="heroSecondary"
                size="sm"
                className="hidden rounded-full px-4 py-2 md:inline-flex"
              >
                <Link to="/signup">Start free trial</Link>
              </Button>
            </>
          ) : null}
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
              {user ? (
                <div className="space-y-2">
                  <Button asChild variant="hero" className="w-full justify-center rounded-full">
                    <Link to="/account" onClick={() => setOpen(false)}>
                      Account
                    </Link>
                  </Button>
                  <Button
                    variant="heroSecondary"
                    className="w-full justify-center rounded-full"
                    onClick={() => {
                      setOpen(false);
                      handleSignOut();
                    }}
                  >
                    Sign out
                  </Button>
                </div>
              ) : (
                <div className="space-y-2">
                  <Button asChild variant="hero" className="w-full justify-center rounded-full">
                    <Link to="/signup" onClick={() => setOpen(false)}>
                      Start free trial
                    </Link>
                  </Button>
                  <Button
                    asChild
                    variant="heroSecondary"
                    className="w-full justify-center rounded-full"
                  >
                    <Link to="/login" onClick={() => setOpen(false)}>
                      Sign in
                    </Link>
                  </Button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
