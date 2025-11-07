import { CanvasStats } from "@/types/pixel";
import { formatCKB } from "@/utils/formatting";

interface GameStatsProps {
  stats?: CanvasStats;
}

export default function GameStats({ stats }: GameStatsProps) {
  if (!stats) return null;

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 mb-4">
        <div className="w-2 h-2 bg-secondary rounded-full animate-pulse"></div>
        <h3 className="text-lg font-bold font-display text-secondary uppercase tracking-wide">Game Status</h3>
      </div>
      
      <div className="grid grid-cols-1 gap-4">
        <div className="bg-card border border-border rounded-lg p-4 text-center group hover:scale-[1.01] transition-all duration-200" data-testid="stat-claimed">
          <div className="flex items-center justify-center mb-2">
            <div className="w-1.5 h-1.5 bg-primary rounded-full animate-pulse mr-2"></div>
            <div className="text-xs font-mono text-muted-foreground tracking-wider">PIXELS CLAIMED</div>
          </div>
          <div className="text-xl font-bold bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent font-mono">
            {stats.claimedPixels.toLocaleString()}
          </div>
        </div>
        
        <div className="bg-card border border-border rounded-lg p-4 text-center group hover:scale-[1.01] transition-all duration-200" data-testid="stat-locked">
          <div className="flex items-center justify-center mb-2">
            <div className="w-1.5 h-1.5 bg-accent rounded-full animate-pulse mr-2"></div>
            <div className="text-xs font-mono text-muted-foreground tracking-wider">CKB LOCKED</div>
          </div>
          <div className="text-xl font-bold bg-gradient-to-r from-accent to-primary bg-clip-text text-transparent font-mono">
            {formatCKB(stats.totalCKBLocked)}
          </div>
        </div>
        
        <div className="bg-card border border-border rounded-lg p-4 text-center group hover:scale-[1.01] transition-all duration-200" data-testid="stat-remaining">
          <div className="flex items-center justify-center mb-2">
            <div className="w-1.5 h-1.5 bg-secondary rounded-full animate-pulse mr-2"></div>
            <div className="text-xs font-mono text-muted-foreground tracking-wider">PIXELS AVAILABLE</div>
          </div>
          <div className="text-xl font-bold bg-gradient-to-r from-secondary to-accent bg-clip-text text-transparent font-mono">
            {stats.remainingPixels.toLocaleString()}
          </div>
        </div>
      </div>
    </div>
  );
}