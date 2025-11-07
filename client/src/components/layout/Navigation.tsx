import { Link, useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Home, Grid, Trophy } from "lucide-react";

export default function Navigation() {
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
    <div className="hidden md:flex items-center gap-2">
      <nav className="flex items-center gap-1">
        {navLinks.map(({ href, label, icon: Icon }) => (
          <Link key={href} href={href}>
            <Button
              variant={isActive(href) ? "default" : "ghost"}
              size="sm"
              data-testid={`link-${label.toLowerCase().replace(' ', '-')}`}
            >
              <Icon className="h-4 w-4 mr-2" />
              {label}
            </Button>
          </Link>
        ))}
      </nav>
    </div>
  );
}
