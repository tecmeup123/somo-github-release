import { useQuery } from "@tanstack/react-query";
import { UserData } from "@/types/pixel";
import { ExternalLink, Trophy, Medal, Award } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

export default function InfluenceLeaderboard() {
  const { data: leaderboard = [], isLoading } = useQuery<UserData[]>({
    queryKey: ['/api/leaderboard'],
    refetchInterval: 60000, // Reduced from 10s to 60s - WebSocket handles real-time updates
    staleTime: 50000,
  });

  const getRankGradient = (rank: number) => {
    if (rank === 1) return "from-yellow-500/10 via-yellow-500/5 to-transparent";
    if (rank === 2) return "from-gray-400/10 via-gray-400/5 to-transparent";
    if (rank === 3) return "from-orange-600/10 via-orange-600/5 to-transparent";
    return "";
  };

  const getRankBadgeColor = (rank: number) => {
    if (rank === 1) return "bg-yellow-500";
    if (rank === 2) return "bg-gray-400";
    if (rank === 3) return "bg-orange-600";
    return "bg-muted";
  };

  const getRankIcon = (rank: number) => {
    if (rank === 1) return <Trophy className="w-4 h-4 text-yellow-500" />;
    if (rank === 2) return <Medal className="w-4 h-4 text-gray-400" />;
    if (rank === 3) return <Award className="w-4 h-4 text-orange-600" />;
    return null;
  };

  const getInfluenceBarWidth = (influence: number, maxInfluence: number) => {
    if (maxInfluence === 0) return 0;
    return Math.max(10, (influence / maxInfluence) * 100);
  };

  const maxInfluence = Math.max(...leaderboard.map(u => u.influence), 1);
  const top3 = leaderboard.slice(0, 3);
  const rest = leaderboard.slice(3);

  return (
    <div className="w-full max-w-full overflow-hidden" data-testid="leaderboard">
      <div className="flex items-center gap-2 mb-6">
        <Trophy className="w-5 h-5 text-yellow-500" />
        <h4 className="text-lg font-semibold">Top Influencers</h4>
      </div>
      
      {isLoading ? (
        <div className="space-y-3">
          {/* Skeleton for top 3 */}
          {[1, 2, 3].map((rank) => (
            <Card key={rank} className="border-none shadow-md">
              <CardContent className="p-5">
                <div className="flex items-center justify-between gap-4">
                  <div className="flex items-center gap-4 flex-1">
                    <Skeleton className="w-10 h-10 rounded-full" />
                    <div className="flex-1 space-y-2">
                      <Skeleton className="h-4 w-32" />
                      <Skeleton className="h-2 w-full" />
                    </div>
                  </div>
                  <div className="text-right">
                    <Skeleton className="h-8 w-20 mb-1" />
                    <Skeleton className="h-3 w-16" />
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
          {/* Skeleton for rest */}
          {[4, 5, 6, 7].map((rank) => (
            <div key={rank} className="flex items-center justify-between p-4 rounded-lg border border-border/50">
              <div className="flex items-center gap-3 flex-1">
                <Skeleton className="w-8 h-8 rounded" />
                <div className="space-y-2 flex-1">
                  <Skeleton className="h-3 w-28" />
                  <Skeleton className="h-2 w-full" />
                </div>
              </div>
              <Skeleton className="h-6 w-16" />
            </div>
          ))}
        </div>
      ) : leaderboard.length > 0 ? (
        <>
          {/* Top 3 Podium Cards */}
          {top3.length > 0 && (
            <div className="grid grid-cols-1 gap-3 mb-6">
              {top3.map((user, index) => {
                const rank = index + 1;
                const isCurrentUser = user.address === "0x891a...742d"; // Mock check
                
                return (
                  <Card 
                    key={user.id}
                    className={`border-none shadow-md bg-gradient-to-br ${getRankGradient(rank)} relative overflow-hidden`}
                    data-testid={`leaderboard-user-${rank}`}
                  >
                    <div className={`absolute top-0 right-0 w-32 h-32 ${
                      rank === 1 ? 'bg-yellow-500/5' : 
                      rank === 2 ? 'bg-gray-400/5' : 
                      'bg-orange-600/5'
                    } rounded-full blur-3xl -translate-y-16 translate-x-16`} />
                    <CardContent className="p-5 relative">
                      <div className="flex items-center justify-between gap-4">
                        <div className="flex items-center gap-4 flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <div className={`${getRankBadgeColor(rank)} w-10 h-10 rounded-full flex items-center justify-center font-bold text-white text-lg shadow-lg`}>
                              {rank}
                            </div>
                            {getRankIcon(rank)}
                          </div>
                          
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-2">
                              <div className="font-bold text-base truncate" data-testid={`text-user-address-${rank}`}>
                                {isCurrentUser ? 'You' : `${user.address.substring(0, 8)}...${user.address.substring(user.address.length - 6)}`}
                              </div>
                              <a
                                href={`https://pudge.explorer.nervos.org/address/${user.address}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="p-1 hover:bg-background/50 rounded transition-colors flex-shrink-0"
                                data-testid={`link-user-explorer-${rank}`}
                                onClick={(e) => e.stopPropagation()}
                              >
                                <ExternalLink className="w-3.5 h-3.5 text-primary opacity-60 hover:opacity-100" />
                              </a>
                            </div>
                            <div className="h-2 bg-muted/50 rounded-full overflow-hidden">
                              <div 
                                className={`h-full rounded-full transition-all duration-500 ${
                                  rank === 1 ? 'bg-yellow-500' :
                                  rank === 2 ? 'bg-gray-400' :
                                  'bg-orange-600'
                                }`}
                                style={{ width: `${getInfluenceBarWidth(user.influence, maxInfluence)}%` }}
                              />
                            </div>
                          </div>
                        </div>
                        
                        <div className="text-right">
                          <div 
                            className="text-2xl font-bold tabular-nums"
                            style={{ 
                              color: rank === 1 ? '#eab308' : 
                                     rank === 2 ? '#9ca3af' : 
                                     '#ea580c'
                            }}
                            data-testid={`text-influence-${rank}`}
                          >
                            {user.influence.toLocaleString()}
                          </div>
                          <div className="text-xs text-muted-foreground">influence</div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}

          {/* Rest of Leaderboard */}
          {rest.length > 0 && (
            <div className="space-y-2">
              {rest.map((user, index) => {
                const rank = index + 4;
                const isCurrentUser = user.address === "0x891a...742d";
                
                return (
                  <div 
                    key={user.id}
                    className={`flex items-center space-x-3 p-3 rounded-lg transition-all duration-200 ${
                      isCurrentUser 
                        ? 'bg-primary/10 border border-primary/30' 
                        : 'bg-muted/30 hover:bg-muted/50'
                    }`}
                    data-testid={`leaderboard-user-${rank}`}
                  >
                    <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center text-sm font-semibold">
                      {rank}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1.5 mb-1">
                        <div className="font-medium text-sm truncate" data-testid={`text-user-address-${rank}`}>
                          {isCurrentUser ? 'You' : `${user.address.substring(0, 6)}...${user.address.substring(user.address.length - 4)}`}
                        </div>
                        <a
                          href={`https://pudge.explorer.nervos.org/address/${user.address}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="p-0.5 hover:bg-background/50 rounded transition-colors flex-shrink-0"
                          data-testid={`link-user-explorer-${rank}`}
                          onClick={(e) => e.stopPropagation()}
                        >
                          <ExternalLink className="w-3 h-3 text-primary opacity-60 hover:opacity-100" />
                        </a>
                      </div>
                      <div className="h-1.5 bg-muted/50 rounded-full overflow-hidden">
                        <div 
                          className="h-full bg-primary rounded-full transition-all duration-300"
                          style={{ width: `${getInfluenceBarWidth(user.influence, maxInfluence)}%` }}
                        />
                      </div>
                    </div>
                    <div 
                      className="text-sm font-bold tabular-nums"
                      data-testid={`text-influence-${rank}`}
                    >
                      {user.influence.toLocaleString()}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </>
      ) : (
        <div className="text-center text-muted-foreground py-12" data-testid="no-users">
          <Trophy className="w-16 h-16 mx-auto mb-4 opacity-20" />
          <p className="text-lg font-medium mb-2">No Rankings Yet</p>
          <p className="text-sm">Be the first to claim a pixel and dominate the leaderboard!</p>
        </div>
      )}
    </div>
  );
}
