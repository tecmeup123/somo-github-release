import { Link, useLocation } from "wouter";
import { Home, Grid, Trophy } from "lucide-react";

export default function BottomNavigation() {
  const [location] = useLocation();

  const navLinks = [
    { href: "/app", label: "Canvas", icon: Home },
    { href: "/my-pixels", label: "My Pixels", icon: Grid },
    { href: "/leaderboard", label: "Leaderboard", icon: Trophy },
  ];

  const isActive = (href: string) => {
    if (href === "/app") return location === "/app";
    return location.startsWith(href);
  };

  return (
    <nav className="md:hidden fixed bottom-0 left-0 right-0 z-50 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 border-t border-primary/20 shadow-sm">
      <div className="flex items-center justify-around px-1 py-2">
        {navLinks.map(({ href, label, icon: Icon }) => {
          const active = isActive(href);
          return (
            <Link key={href} href={href}>
              <button
                className={`flex flex-col items-center gap-0.5 px-3 py-1.5 rounded-md transition-all duration-200 ${
                  active
                    ? "bg-primary/20 text-primary"
                    : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
                }`}
                data-testid={`bottom-nav-${label.toLowerCase().replace(' ', '-')}`}
              >
                <Icon className={`h-4 w-4 ${active ? "scale-110" : ""}`} />
                <span className="text-[10px] font-medium">{label}</span>
              </button>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
