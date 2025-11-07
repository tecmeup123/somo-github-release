import { useQuery } from "@tanstack/react-query";
import { Sparkles, Crown, Gem, Zap, Loader2 } from "lucide-react";
import { CanvasStats } from "@/types/pixel";
import { formatCKB } from "@/utils/formatting";
import { getTierColor } from "@shared/canvas-utils";
import type { PixelTier } from "@shared/canvas-utils";

interface MobileTierSelectorProps {
  onTierSelect: (tier: PixelTier) => void;
}

// Static tier prices (CKB locked per tier)
const TIER_PRICES: Record<PixelTier, number> = {
  legendary: 100000,
  epic: 50000,
  rare: 25000,
  common: 5000,
};

export default function MobileTierSelector({ onTierSelect }: MobileTierSelectorProps) {
  const { data: stats, isLoading } = useQuery<CanvasStats>({
    queryKey: ['/api/stats'],
    refetchInterval: 5000,
  });

  const getAvailableCount = (tier: PixelTier) => {
    if (!stats?.tierTotals || !stats?.tierCounts) return 0;
    return stats.tierTotals[tier] - stats.tierCounts[tier];
  };

  const tiers = [
    {
      id: 'legendary' as const,
      name: 'Legendary',
      icon: Crown,
      color: getTierColor('legendary'),
      gradient: 'from-[#DBAB00]/20 to-[#DBAB00]/5',
      borderColor: 'border-[#DBAB00]/30',
      description: 'Center pixels - Maximum influence',
    },
    {
      id: 'epic' as const,
      name: 'Epic',
      icon: Gem,
      color: getTierColor('epic'),
      gradient: 'from-[#FFBDFC]/20 to-[#FFBDFC]/5',
      borderColor: 'border-[#FFBDFC]/30',
      description: 'High value - Strong positioning',
    },
    {
      id: 'rare' as const,
      name: 'Rare',
      icon: Zap,
      color: getTierColor('rare'),
      gradient: 'from-[#09D3FF]/20 to-[#09D3FF]/5',
      borderColor: 'border-[#09D3FF]/30',
      description: 'Strategic spots - Good influence',
    },
    {
      id: 'common' as const,
      name: 'Common',
      icon: Sparkles,
      color: getTierColor('common'),
      gradient: 'from-[#66C084]/20 to-[#66C084]/5',
      borderColor: 'border-[#66C084]/30',
      description: 'Entry level - Build your presence',
    },
  ];

  const progress = stats?.totalPixels 
    ? (((stats.claimedPixels || 0) / stats.totalPixels) * 100) 
    : 0;

  const formatProgress = (progress: number) => {
    if (progress === 0) return '0.0';
    if (progress < 0.1) return progress.toFixed(3);
    if (progress < 1) return progress.toFixed(2);
    return progress.toFixed(1);
  };

  // Loading state
  if (isLoading) {
    return (
      <div className="space-y-4 p-4" data-testid="mobile-tier-selector-loading">
        <div className="text-center mb-4">
          <h2 className="text-xl font-bold text-primary mb-1">Choose Your Tier</h2>
          <p className="text-xs text-muted-foreground">Loading tiers...</p>
        </div>
        <div className="flex items-center justify-center py-12">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4 p-4" data-testid="mobile-tier-selector">
      {/* Clean Header */}
      <div className="text-center mb-4">
        <h2 className="text-xl font-bold text-primary mb-1">Choose Your Tier</h2>
        <p className="text-xs text-muted-foreground">Select a tier to claim a random pixel</p>
      </div>

      {/* Simplified Tier Cards */}
      <div className="space-y-2.5">
        {tiers.map((tier) => {
          const available = getAvailableCount(tier.id);
          const price = TIER_PRICES[tier.id];
          const Icon = tier.icon;
          const isAvailable = available > 0;

          return (
            <button
              key={tier.id}
              onClick={() => isAvailable && onTierSelect(tier.id)}
              disabled={!isAvailable}
              className={`w-full border-2 ${tier.borderColor} rounded-lg p-3 transition-all duration-200 ${
                isAvailable 
                  ? 'bg-card hover:shadow-md active:scale-[0.98] cursor-pointer' 
                  : 'bg-muted/20 opacity-50 cursor-not-allowed'
              }`}
              data-testid={`tier-select-${tier.id}`}
            >
              <div className="flex items-center gap-3">
                <div 
                  className="w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0"
                  style={{ backgroundColor: `${tier.color}20` }}
                >
                  <Icon className="w-5 h-5" style={{ color: tier.color }} />
                </div>
                
                <div className="flex-1 text-left min-w-0">
                  <div className="flex items-baseline gap-2">
                    <h3 className="text-base font-bold" style={{ color: tier.color }}>
                      {tier.name}
                    </h3>
                    <span className="text-xs text-muted-foreground">
                      {available} left
                    </span>
                  </div>
                  <div className="text-sm font-bold font-mono mt-0.5" style={{ color: tier.color }}>
                    {formatCKB(price)}
                  </div>
                </div>

                {isAvailable && (
                  <div className="text-xl text-muted-foreground flex-shrink-0">→</div>
                )}
              </div>
            </button>
          );
        })}
      </div>

      {/* Desktop Notice - More Subtle */}
      <div className="mt-4 p-3 bg-muted/20 rounded-lg border border-border/50">
        <p className="text-xs text-center text-muted-foreground">
          💡 Use desktop to view the interactive canvas
        </p>
      </div>
    </div>
  );
}
