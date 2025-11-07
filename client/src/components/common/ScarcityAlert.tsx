import { CanvasStats } from "@/types/pixel";

interface ScarcityAlertProps {
  stats?: CanvasStats;
  onShareToX: () => void;
}

export default function ScarcityAlert({ stats, onShareToX }: ScarcityAlertProps) {
  const legendaryRemaining = stats?.tierTotals?.legendary ? 
    stats.tierTotals.legendary - (stats.tierCounts?.legendary || 0) : 0;

  return (
    <div className="bg-card border border-accent/20 rounded-lg p-4 relative overflow-hidden" data-testid="scarcity-alert">
      <div className="absolute top-0 right-0 w-16 h-16 bg-accent/5 rounded-full -translate-y-8 translate-x-8"></div>
      <div className="relative z-10">
        <div className="flex items-center gap-2 mb-4">
          <div className="w-2 h-2 bg-accent rounded-full animate-pulse"></div>
          <h4 className="text-sm font-bold bg-gradient-to-r from-accent to-primary bg-clip-text text-transparent font-display tracking-wide uppercase">
            Scarcity Alert
          </h4>
        </div>
        <div className="text-center space-y-2 mb-4">
          <div className="text-xs text-muted-foreground font-mono uppercase tracking-wide">
            Legendary Pixels Remaining
          </div>
          <div className="text-2xl font-bold bg-gradient-to-r from-accent to-secondary bg-clip-text text-transparent font-mono">
            {legendaryRemaining}
          </div>
        </div>
        <button
          onClick={onShareToX}
          className="w-full px-4 py-2 bg-gradient-to-r from-accent/10 to-primary/10 border border-accent/30 rounded-lg text-xs font-mono tracking-wide transition-all duration-300 hover:from-accent/20 hover:to-primary/20"
          data-testid="button-share-x"
        >
          📡 Share Progress
        </button>
      </div>
    </div>
  );
}