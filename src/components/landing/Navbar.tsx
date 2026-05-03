import { ChevronDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
} from "@/components/ui/dropdown-menu";
import logo from "@/assets/logo.png";

const featuresItems = [
  { label: "AI Sourcing", desc: "Find top talent automatically" },
  { label: "Smart Screening", desc: "Filter candidates with AI" },
  { label: "Interview Copilot", desc: "Live guidance during interviews" },
  { label: "Analytics", desc: "Hiring insights at a glance" },
];

const learningItems = [
  { label: "Documentation", desc: "Guides and API reference" },
  { label: "Tutorials", desc: "Step-by-step walkthroughs" },
  { label: "Webinars", desc: "Live sessions with experts" },
  { label: "Blog", desc: "Latest news and insights" },
];

const simpleItems = ["Solutions", "Plans"];

function NavDropdown({
  label,
  items,
}: {
  label: string;
  items: { label: string; desc: string }[];
}) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger className="inline-flex items-center gap-1 text-foreground/90 text-base px-3 py-2 rounded-md hover:bg-white/5 transition-colors outline-none data-[state=open]:bg-white/5">
        {label}
        <ChevronDown className="h-4 w-4 opacity-70 transition-transform data-[state=open]:rotate-180" />
      </DropdownMenuTrigger>
      <DropdownMenuContent
        align="center"
        sideOffset={10}
        className="liquid-glass bg-card/60 border-0 rounded-2xl p-2 min-w-[280px] text-foreground"
      >
        {items.map((item) => (
          <DropdownMenuItem
            key={item.label}
            className="flex flex-col items-start gap-0.5 rounded-xl px-3 py-2.5 cursor-pointer focus:bg-white/5 focus:text-foreground"
          >
            <span className="text-sm font-medium text-foreground">{item.label}</span>
            <span className="text-xs text-muted-foreground">{item.desc}</span>
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

export function Navbar() {
  return (
    <>
      <nav className="w-full py-5 px-8 flex flex-row justify-between items-center relative z-20">
        <a href="/" className="flex items-center">
          <img src={logo} alt="Logo" className="h-8 w-auto" width={32} height={32} />
        </a>
        <div className="hidden md:flex items-center gap-1">
          <NavDropdown label="Features" items={featuresItems} />
          {simpleItems.map((label) => (
            <button
              key={label}
              className="inline-flex items-center text-foreground/90 text-base px-3 py-2 rounded-md hover:bg-white/5 transition-colors"
            >
              {label}
            </button>
          ))}
          <NavDropdown label="Learning" items={learningItems} />
        </div>
        <Button variant="heroSecondary" size="sm" className="rounded-full px-4 py-2">
          Sign Up
        </Button>
      </nav>
      <div className="mt-[3px] w-full h-px bg-gradient-to-r from-transparent via-foreground/20 to-transparent" />
    </>
  );
}