import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import Header from "@/components/layout/Header";
import MobileLayout from "@/components/layout/MobileLayout";
import PixelCanvas from "@/components/canvas/PixelCanvas";
import MobileTierSelector from "@/components/canvas/MobileTierSelector";
import PixelClaimModal from "@/components/canvas/PixelClaimModal";
import GameStatusBoard from "@/components/status/GameStatusBoard";
import GovernanceBanner from "@/components/canvas/GovernanceBanner";
import RecentActivity from "@/components/canvas/RecentActivity";
import TopFoundersPreview from "@/components/canvas/TopFoundersPreview";
import { PixelData } from "@/types/pixel";

export default function Home() {
  const [selectedPixel, setSelectedPixel] = useState<PixelData | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isMobile, setIsMobile] = useState(false);

  const { data: pixels = [] } = useQuery<PixelData[]>({
    queryKey: ['/api/pixels'],
  });

  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768);
    };
    
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  const handlePixelSelect = (pixel: PixelData | null) => {
    setSelectedPixel(pixel);
    if (pixel) {
      setIsModalOpen(true);
    }
  };

  const handleTierSelect = (tier: 'legendary' | 'epic' | 'rare' | 'common') => {
    const availablePixels = pixels.filter(p => p.tier === tier && !p.ownerId);
    
    if (availablePixels.length > 0) {
      const randomPixel = availablePixels[Math.floor(Math.random() * availablePixels.length)];
      handlePixelSelect(randomPixel);
    }
  };

  const handleModalClose = (open: boolean) => {
    setIsModalOpen(open);
    if (!open) {
      setSelectedPixel(null);
    }
  };

  return (
    <MobileLayout>
      <Header />
      
      <main className="flex-1 pb-safe">
        <div className="container max-w-6xl mx-auto px-3 py-4 md:px-6 md:py-8 space-y-4 md:space-y-6">
          {/* Stats Bar */}
          <GameStatusBoard />

          {/* Canvas + Sidebar Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-[1fr_320px] gap-4 md:gap-6">
            {/* Canvas Section */}
            <div>
              {isMobile ? (
                <MobileTierSelector onTierSelect={handleTierSelect} />
              ) : (
                <PixelCanvas 
                  onPixelSelect={handlePixelSelect}
                  selectedPixel={selectedPixel}
                />
              )}
            </div>

            {/* Sidebar */}
            <div className="flex flex-col gap-4 md:gap-6">
              <RecentActivity />
              <TopFoundersPreview />
            </div>
          </div>

          {/* Governance Banner */}
          <GovernanceBanner />
        </div>
      </main>

      {/* Pixel Claim Modal */}
      <PixelClaimModal
        selectedPixel={selectedPixel}
        open={isModalOpen}
        onOpenChange={handleModalClose}
      />
    </MobileLayout>
  );
}
