import { TIER_COLORS } from "@/constants/canvas";

export default function TierLegend() {
  const tiers = [
    { name: 'LEGENDARY', color: TIER_COLORS.legendary, glow: '0 0 15px rgba(255, 215, 0, 0.6)' },
    { name: 'EPIC', color: TIER_COLORS.epic, glow: '0 0 12px rgba(147, 51, 234, 0.6)' },
    { name: 'RARE', color: TIER_COLORS.rare, glow: '0 0 10px rgba(59, 130, 246, 0.6)' },
    { name: 'COMMON', color: TIER_COLORS.common, glow: 'none' },
  ];

  return (
    <div className="mt-6 md:mt-8 pt-6 border-t border-border/50">
      <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4">
        <div className="flex flex-wrap items-center gap-4">
          {tiers.map((tier) => (
            <div key={tier.name} className="flex items-center space-x-3 group">
              <div 
                className="w-4 h-4 rounded-md border-2 border-white/20 transition-all duration-300 group-hover:scale-110" 
                style={{ 
                  background: tier.color,
                  boxShadow: tier.glow
                }}
              />
              <span className="text-sm font-mono font-bold tracking-wider text-foreground/90 group-hover:text-primary transition-colors">
                {tier.name}
              </span>
            </div>
          ))}
        </div>
        <div className="text-right">
          <div className="text-primary font-bold font-mono tracking-wide">
            CENTER = MORE VALUABLE
          </div>
        </div>
      </div>
    </div>
  );
}