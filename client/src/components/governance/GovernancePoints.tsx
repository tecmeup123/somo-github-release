import { useQuery } from '@tanstack/react-query';
import { useState, useEffect } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Trophy, TrendingUp, Calendar, Sparkles, HelpCircle } from 'lucide-react';

interface GovernancePointsProps {
  walletAddress: string;
}

interface GovernancePointsData {
  totalPoints: number;
  estimatedTokens: number;
  dailyPointRate: number;
  pixelCount: number;
  daysUntilSnapshot: number;
  formattedTokens: string;
  snapshotDate: string;
  mainnetLaunch: string;
}

export function GovernancePoints({ walletAddress }: GovernancePointsProps) {
  const { data, isLoading, error } = useQuery<GovernancePointsData>({
    queryKey: ['/api/governance/points', walletAddress],
    enabled: !!walletAddress,
    refetchInterval: 60000,
  });

  const [livePoints, setLivePoints] = useState<number>(data?.totalPoints ?? 0);

  useEffect(() => {
    if (data) {
      setLivePoints(data.totalPoints);
    }
  }, [data]);

  useEffect(() => {
    if (!data || data.dailyPointRate === 0) return;

    const pointsPerSecond = data.dailyPointRate / 86400;
    const interval = setInterval(() => {
      setLivePoints((prev) => prev + pointsPerSecond);
    }, 1000);

    return () => clearInterval(interval);
  }, [data]);

  if (isLoading) {
    return (
      <Card data-testid="card-governance-points-loading" className="border-none shadow-lg bg-gradient-to-br from-amber-500/10 via-amber-500/5 to-transparent">
        <CardContent className="p-8">
          <Skeleton className="h-32 w-full" />
        </CardContent>
      </Card>
    );
  }

  if (error || !data) {
    return null;
  }

  if (data.pixelCount === 0) {
    return (
      <Card data-testid="card-governance-points-empty" className="border-none shadow-lg bg-gradient-to-br from-amber-500/10 via-amber-500/5 to-transparent">
        <CardContent className="p-8 text-center space-y-4">
          <div className="inline-flex p-4 rounded-full bg-amber-500/10">
            <Trophy className="w-8 h-8 text-amber-500" />
          </div>
          <div className="space-y-2">
            <h3 className="text-xl font-bold">Start Earning Governance Tokens</h3>
            <p className="text-sm text-muted-foreground max-w-md mx-auto">
              Mint your first pixel to participate in the 350M token airdrop. Only minters earn points.
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  const snapshotDate = new Date(data.snapshotDate);
  const isAfterSnapshot = new Date() > snapshotDate;
  const liveTokens = livePoints / 4;

  return (
    <Card data-testid="card-governance-points" className="border-none shadow-lg bg-gradient-to-br from-amber-500/10 via-amber-500/5 to-transparent relative overflow-hidden">
      <div className="absolute top-0 right-0 w-64 h-64 bg-amber-500/5 rounded-full blur-3xl -translate-y-32 translate-x-32" />
      
      <CardContent className="p-8 relative">
        <div className="flex items-start justify-between mb-6">
          <div className="flex items-center gap-3">
            <div className="p-3 rounded-xl bg-amber-500/10">
              <Trophy className="w-6 h-6 text-amber-500" />
            </div>
            <div className="flex items-center gap-2">
              <div>
                <h3 className="text-lg font-bold">Governance Rewards</h3>
                <p className="text-xs text-muted-foreground">Live counter updating every second</p>
              </div>
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <button className="text-muted-foreground hover:text-foreground transition-colors">
                      <HelpCircle className="w-4 h-4" />
                    </button>
                  </TooltipTrigger>
                  <TooltipContent className="max-w-sm">
                    <p className="font-semibold mb-2">How It Works:</p>
                    <ul className="space-y-1 text-sm">
                      <li>• Only original minters earn governance points</li>
                      <li>• 4 points = 1 governance token</li>
                      <li>• Points accumulate daily until March 31, 2026</li>
                      <li>• Higher tiers earn bonus multipliers (up to 4x)</li>
                      <li>• Governance tokens are NOT tradeable on DEX</li>
                    </ul>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </div>
          </div>
          {isAfterSnapshot && (
            <Badge variant="outline" className="bg-amber-500/10 text-amber-500 border-amber-500/30">
              Final
            </Badge>
          )}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
          <div className="space-y-2" data-testid="section-total-points">
            <div className="flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-amber-500/60" />
              <p className="text-sm font-medium text-muted-foreground">Total Points</p>
            </div>
            <p className="text-4xl md:text-5xl font-bold text-amber-500 tabular-nums tracking-tight" data-testid="text-total-points">
              {livePoints.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
            </p>
          </div>

          <div className="space-y-2" data-testid="section-estimated-tokens">
            <div className="flex items-center gap-2">
              <Trophy className="w-4 h-4 text-foreground/60" />
              <p className="text-sm font-medium text-muted-foreground">Estimated Tokens</p>
            </div>
            <p className="text-4xl md:text-5xl font-bold tabular-nums tracking-tight" data-testid="text-estimated-tokens">
              {liveTokens.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
            </p>
          </div>
        </div>

        {!isAfterSnapshot && (
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pt-6 border-t border-border/50">
            <div className="flex items-center gap-2 text-muted-foreground">
              <TrendingUp className="w-4 h-4" />
              <span className="text-sm" data-testid="text-daily-rate">
                <span className="font-semibold text-foreground">+{data.dailyPointRate.toLocaleString()}</span> points per day
              </span>
            </div>
            <div className="flex items-center gap-2 text-amber-500">
              <Calendar className="w-4 h-4" />
              <span className="text-sm font-medium" data-testid="text-days-remaining">
                {Math.max(0, data.daysUntilSnapshot)} days until snapshot
              </span>
            </div>
          </div>
        )}
        {isAfterSnapshot && (
          <div className="text-center pt-6 border-t border-border/50 text-sm text-muted-foreground">
            Snapshot completed {snapshotDate.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
