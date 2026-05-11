import BottomNavigation from "./BottomNavigation";

interface MobileLayoutProps {
  children: React.ReactNode;
}

export default function MobileLayout({ children }: MobileLayoutProps) {
  return (
    <div className="min-h-screen flex flex-col mobile-layout mobile-safe-bottom" data-testid="home-page">
      {children}
      <BottomNavigation />
    </div>
  );
}
