import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Trophy, Crown, Medal } from "lucide-react";
import { formatCKB } from "@/utils/formatting";
import { Link } from "wouter";

interface LeaderboardEntry {
  id: string;
  address: string;
  pixelCount: number;
  totalCkb: number;
  influence: number;
  rank?: number;
}

export default function TopFoundersPreview() {
  const { data: leaderboard = [] } = useQuery<LeaderboardEntry[]>({
    queryKey: ['/api/leaderboard'],
    refetchInterval: 60000, // Reduced from 30s to 60s - WebSocket handles updates
    staleTime: 50000,
  });

  const topThree = leaderboard.slice(0, 3);

  const formatAddress = (address: string) => {
    if (!address) return '';
    return `${address.slice(0, 6)}...${address.slice(-4)}`;
  };

  const getRankIcon = (index: number) => {
    switch (index) {
      case 0:
        return <Crown className="w-4 h-4 text-[#DBAB00]" />;
      case 1:
        return <Medal className="w-4 h-4 text-gray-400" />;
      case 2:
        return <Medal className="w-4 h-4 text-amber-700" />;
      default:
        return null;
    }
  };

  const getRankColor = (index: number) => {
    switch (index) {
      case 0:
        return 'from-[#DBAB00]/20 to-[#DBAB00]/5';
      case 1:
        return 'from-gray-400/20 to-gray-400/5';
      case 2:
        return 'from-amber-700/20 to-amber-700/5';
      default:
        return 'from-muted/20 to-muted/5';
    }
  };

  if (topThree.length === 0) {
    return null;
  }

  return (
    <Card className="border-none shadow-md gradient-legendary territory-card pixel-pattern-bg" data-testid="top-founders-preview">
      <div className="decorative-orb-large decorative-orb-gold top-0 right-0 -translate-y-1/2 translate-x-1/2" />
      <div className="pixel-corner-accent pixel-corner-top-right text-yellow-500" />
      <CardHeader className="pb-3 relative z-10">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="p-1.5 rounded-lg bg-yellow-500/20 border border-yellow-500/30">
              <Trophy className="w-4 h-4 text-yellow-500" />
            </div>
            <CardTitle className="text-base">Top Founders</CardTitle>
          </div>
          <Link href="/leaderboard">
            <button className="text-xs text-primary hover:underline" data-testid="link-view-all">
              View All →
            </button>
          </Link>
        </div>
      </CardHeader>
      <CardContent className="space-y-2 relative z-10">
        {topThree.map((founder, index) => (
          <div
            key={founder.id}
            className={`flex items-center gap-3 p-2.5 rounded-lg bg-gradient-to-r ${getRankColor(index)} border border-border/50`}
            data-testid={`founder-rank-${index + 1}`}
          >
            <div className="flex items-center justify-center w-6 h-6 rounded-full bg-background/50">
              {getRankIcon(index)}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium truncate">
                {formatAddress(founder.address)}
              </p>
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <span>{founder.pixelCount || 0} pixels</span>
                <span>•</span>
                <span>{formatCKB(founder.totalCkb || 0)}</span>
              </div>
            </div>
            <div className="text-right">
              <p className="text-xs text-muted-foreground">Influence</p>
              <p className="text-sm font-bold text-primary">
                {(founder.influence || 0).toLocaleString()}
              </p>
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
