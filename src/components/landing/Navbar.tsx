import { ChevronDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import logo from "@/assets/logo.png";

const navItems = [
  { label: "Features", caret: true },
  { label: "Solutions", caret: false },
  { label: "Plans", caret: false },
  { label: "Learning", caret: true },
];

export function Navbar() {
  return (
    <>
      <nav className="w-full py-5 px-8 flex flex-row justify-between items-center relative z-20">
        <a href="/" className="flex items-center">
          <img src={logo} alt="Logo" className="h-8 w-auto" width={32} height={32} />
        </a>
        <div className="hidden md:flex items-center gap-1">
          {navItems.map((item) => (
            <button
              key={item.label}
              className="inline-flex items-center gap-1 text-foreground/90 text-base px-3 py-2 rounded-md hover:bg-white/5 transition-colors"
            >
              {item.label}
              {item.caret && <ChevronDown className="h-4 w-4 opacity-70" />}
            </button>
          ))}
        </div>
        <Button variant="heroSecondary" size="sm" className="rounded-full px-4 py-2">
          Sign Up
        </Button>
      </nav>
      <div className="mt-[3px] w-full h-px bg-gradient-to-r from-transparent via-foreground/20 to-transparent" />
    </>
  );
}