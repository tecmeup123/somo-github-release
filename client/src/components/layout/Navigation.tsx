import { Link, useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Grid, User, Trophy } from "lucide-react";

export default function Navigation() {
  const [location] = useLocation();

  const navLinks = [
    { href: "/app", label: "Canvas", icon: Grid },
    { href: "/my-pixels", label: "My Pixels", icon: User },
    { href: "/leaderboard", label: "Leaderboard", icon: Trophy },
  ];

  const isActive = (href: string) => {
    if (href === "/app") return location === "/app";
    return location.startsWith(href);
  };

  return (
    <div className="hidden md:flex items-center gap-2">
      <nav className="flex items-center gap-1">
        {navLinks.map(({ href, label, icon: Icon }) => {
          const active = isActive(href);
          return (
            <Link key={href} href={href}>
              <Button
                variant={active ? "default" : "ghost"}
                size="sm"
                className={active
                  ? "shadow-[0_0_14px_rgba(9,211,255,0.35)] hover:shadow-[0_0_20px_rgba(9,211,255,0.45)] transition-all duration-200"
                  : "hover:text-primary transition-all duration-200"
                }
                style={active ? { fontFamily: "var(--font-display)", fontSize: "0.72rem", letterSpacing: "0.04em" } : {}}
                data-testid={`link-${label.toLowerCase().replace(' ', '-')}`}
              >
                <Icon className={`h-4 w-4 mr-2 ${active ? "" : "opacity-70"}`} />
                {label}
              </Button>
            </Link>
          );
        })}
      </nav>
    </div>
  );
}
