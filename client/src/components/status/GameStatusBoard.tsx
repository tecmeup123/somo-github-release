import { usePixelData } from "@/hooks/usePixelData";
import { CanvasStats } from "@/types/pixel";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Grid, CheckCircle2, TrendingUp } from "lucide-react";

export default function GameStatusBoard() {
  const { stats, isLoadingStats } = usePixelData();
  const canvasStats = stats as CanvasStats;
  
  const progress = canvasStats?.totalPixels 
    ? (((canvasStats.claimedPixels || 0) / canvasStats.totalPixels) * 100) 
    : 0;

  const formatProgress = (progress: number) => {
    if (progress === 0) return '0.0';
    if (progress < 0.1) return progress.toFixed(3);
    if (progress < 1) return progress.toFixed(2);
    return progress.toFixed(1);
  };

  if (isLoadingStats) {
    return (
      <div className="grid grid-cols-3 gap-2 md:gap-4" data-testid="status-board">
        {[1, 2, 3].map((i) => (
          <Card key={i}>
            <CardContent className="p-3 md:p-4 text-center">
              <Skeleton className="w-5 h-5 md:w-6 md:h-6 mx-auto mb-1 md:mb-2" />
              <Skeleton className="h-6 md:h-8 w-16 md:w-20 mx-auto mb-0.5 md:mb-1" />
              <Skeleton className="h-3 w-12 mx-auto" />
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  return (
    <div className="grid grid-cols-3 gap-2 md:gap-4" data-testid="status-board">
      {/* Available Pixels */}
      <Card className="border-blue-500/30 bg-blue-500/5">
        <CardContent className="p-3 md:p-4 text-center">
          <Grid className="w-5 h-5 md:w-6 md:h-6 mx-auto mb-1 md:mb-2 text-blue-500" />
          <div className="text-xl md:text-3xl font-bold text-blue-500 tabular-nums" data-testid="text-remaining-pixels">
            {canvasStats?.remainingPixels?.toLocaleString() || '2,500'}
          </div>
          <div className="text-[10px] md:text-xs text-muted-foreground mt-0.5 md:mt-1">Available</div>
        </CardContent>
      </Card>

      {/* Claimed Pixels */}
      <Card className="border-green-500/30 bg-green-500/5">
        <CardContent className="p-3 md:p-4 text-center">
          <CheckCircle2 className="w-5 h-5 md:w-6 md:h-6 mx-auto mb-1 md:mb-2 text-green-500" />
          <div className="text-xl md:text-3xl font-bold text-green-500 tabular-nums" data-testid="text-claimed-pixels">
            {canvasStats?.claimedPixels?.toLocaleString() || '0'}
          </div>
          <div className="text-[10px] md:text-xs text-muted-foreground mt-0.5 md:mt-1">Claimed</div>
        </CardContent>
      </Card>

      {/* Progress */}
      <Card className="border-primary/30 bg-primary/5">
        <CardContent className="p-3 md:p-4 text-center">
          <TrendingUp className="w-5 h-5 md:w-6 md:h-6 mx-auto mb-1 md:mb-2 text-primary" />
          <div className="text-xl md:text-3xl font-bold text-primary tabular-nums" data-testid="text-progress-percentage">
            {formatProgress(progress)}%
          </div>
          <div className="text-[10px] md:text-xs text-muted-foreground mt-0.5 md:mt-1">Complete</div>
        </CardContent>
      </Card>
    </div>
  );
}