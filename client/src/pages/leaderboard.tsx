import { useState } from "react";
import Header from "@/components/layout/Header";
import MobileLayout from "@/components/layout/MobileLayout";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useQuery } from "@tanstack/react-query";
import { Trophy, Users, Sparkles, Gift, Crown, Medal, ExternalLink } from "lucide-react";
import { formatCKB, formatCompactNumber } from "@/utils/formatting";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";

interface LeaderboardEntry {
  id: string;
  address: string;
  influence: number;
  pixelCount: number;
  totalCkb: number;
}

interface ReferralLeaderboardEntry {
  userId: string;
  address: string;
  referralCode: string;
  totalReferrals: number;
  currentBoostLevel: number;
}

export default function Leaderboard() {
  const [activeTab, setActiveTab] = useState<"influence" | "referrals">("influence");
  
  const { data: stats } = useQuery<{
    totalPixels: number;
    claimedPixels: number;
    totalCKBLocked: number;
  }>({
    queryKey: ['/api/stats'],
    refetchInterval: 5000,
  });

  const { data: leaderboard = [], isLoading } = useQuery<LeaderboardEntry[]>({
    queryKey: ['/api/leaderboard'],
    refetchInterval: 10000,
  });

  const { data: referralLeaderboard = [], isLoading: isReferralLoading } = useQuery<ReferralLeaderboardEntry[]>({
    queryKey: ['/api/referrals/leaderboard'],
    refetchInterval: 10000,
  });

  const topInfluence = leaderboard[0]?.influence || 0;
  const totalFounders = leaderboard.length;

  const formatAddress = (address: string) => {
    if (!address) return '';
    return `${address.slice(0, 8)}...${address.slice(-6)}`;
  };

  const formatAddressMobile = (address: string) => {
    if (!address) return '';
    return `${address.slice(0, 6)}...${address.slice(-4)}`;
  };

  const getRankIcon = (index: number) => {
    switch (index) {
      case 0:
        return <Crown className="w-4 h-4 md:w-5 md:h-5 text-[#DBAB00]" />;
      case 1:
        return <Medal className="w-4 h-4 md:w-5 md:h-5 text-gray-400" />;
      case 2:
        return <Medal className="w-4 h-4 md:w-5 md:h-5 text-amber-700" />;
      default:
        return null;
    }
  };

  const getRankColor = (index: number) => {
    switch (index) {
      case 0:
        return 'bg-[#DBAB00]/10 border-[#DBAB00]/30';
      case 1:
        return 'bg-gray-400/10 border-gray-400/30';
      case 2:
        return 'bg-amber-700/10 border-amber-700/30';
      default:
        return 'bg-muted/50 border-border/30';
    }
  };

  return (
    <MobileLayout>
      <Header />
      
      <main className="flex-1 pb-safe">
        <div className="container max-w-4xl mx-auto px-3 py-4 md:px-6 md:py-8 space-y-4 md:space-y-6">
          {/* Hero Stats - Mobile Optimized */}
          <div className="grid grid-cols-3 gap-2 md:gap-4">
            <Card className="border-green-500/30 bg-green-500/5">
              <CardContent className="p-3 md:p-4 text-center">
                <Users className="w-5 h-5 md:w-6 md:h-6 mx-auto mb-1 md:mb-2 text-green-500" />
                <div className="text-xl md:text-3xl font-bold text-green-500 tabular-nums" data-testid="text-total-founders">
                  {totalFounders}
                </div>
                <div className="text-[10px] md:text-xs text-muted-foreground mt-0.5 md:mt-1">Founders</div>
              </CardContent>
            </Card>

            <Card className="border-primary/30 bg-primary/5">
              <CardContent className="p-3 md:p-4 text-center">
                <Sparkles className="w-5 h-5 md:w-6 md:h-6 mx-auto mb-1 md:mb-2 text-primary" />
                <div className="text-xl md:text-3xl font-bold text-primary tabular-nums" data-testid="text-total-ckb-locked">
                  {formatCompactNumber(stats?.totalCKBLocked || 0)}
                </div>
                <div className="text-[10px] md:text-xs text-muted-foreground mt-0.5 md:mt-1">CKB Locked</div>
              </CardContent>
            </Card>

            <Card className="border-yellow-500/30 bg-yellow-500/5">
              <CardContent className="p-3 md:p-4 text-center">
                <Trophy className="w-5 h-5 md:w-6 md:h-6 mx-auto mb-1 md:mb-2 text-yellow-500" />
                <div className="text-xl md:text-3xl font-bold text-yellow-500 tabular-nums" data-testid="text-top-influence">
                  {topInfluence.toFixed(1)}
                </div>
                <div className="text-[10px] md:text-xs text-muted-foreground mt-0.5 md:mt-1">Top Score</div>
              </CardContent>
            </Card>
          </div>

          {/* Tabs */}
          <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as "influence" | "referrals")}>
            <TabsList className="grid w-full grid-cols-2 h-11 md:h-12">
              <TabsTrigger value="influence" className="text-sm md:text-base" data-testid="tab-influence">
                <Trophy className="w-4 h-4 mr-1.5 md:mr-2" />
                <span className="hidden sm:inline">Influence</span>
                <span className="sm:hidden">Top</span>
              </TabsTrigger>
              <TabsTrigger value="referrals" className="text-sm md:text-base" data-testid="tab-referrals">
                <Gift className="w-4 h-4 mr-1.5 md:mr-2" />
                Referrals
              </TabsTrigger>
            </TabsList>
            
            {/* Influence Leaderboard */}
            <TabsContent value="influence" className="mt-4 space-y-2 md:space-y-3">
              {isLoading ? (
                <div className="space-y-2">
                  {[...Array(10)].map((_, i) => (
                    <Skeleton key={i} className="h-16 md:h-20 w-full rounded-lg" />
                  ))}
                </div>
              ) : leaderboard.length === 0 ? (
                <Card className="border-dashed">
                  <CardContent className="text-center py-12 md:py-16">
                    <Trophy className="h-12 w-12 md:h-16 md:w-16 mx-auto mb-3 md:mb-4 text-muted-foreground/50" />
                    <h3 className="text-lg md:text-xl font-bold mb-2">No Rankings Yet</h3>
                    <p className="text-sm md:text-base text-muted-foreground max-w-sm mx-auto">
                      Be the first to claim a pixel and appear on the leaderboard!
                    </p>
                  </CardContent>
                </Card>
              ) : (
                <div className="space-y-2">
                  {leaderboard.map((entry, index) => {
                    const explorerUrl = `https://pudge.explorer.nervos.org/address/${entry.address}`;
                    
                    return (
                      <Card
                        key={entry.id}
                        className={`border transition-all duration-200 ${getRankColor(index)} hover:shadow-lg active:scale-[0.98]`}
                        data-testid={`leaderboard-entry-${index + 1}`}
                      >
                        <CardContent className="p-3 md:p-4">
                          <div className="flex items-center gap-2 md:gap-3">
                            {/* Rank Badge */}
                            <div className="flex items-center justify-center w-9 h-9 md:w-11 md:h-11 rounded-full bg-background/80 backdrop-blur flex-shrink-0 border-2 border-background/50">
                              {index < 3 ? (
                                getRankIcon(index)
                              ) : (
                                <span className="text-xs md:text-sm font-bold text-muted-foreground">
                                  #{index + 1}
                                </span>
                              )}
                            </div>

                            {/* User Info */}
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-1.5 md:gap-2 mb-1">
                                <p className="text-xs md:text-sm font-mono font-semibold truncate">
                                  <span className="hidden sm:inline">{formatAddress(entry.address)}</span>
                                  <span className="sm:hidden">{formatAddressMobile(entry.address)}</span>
                                </p>
                                <a
                                  href={explorerUrl}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="text-primary/60 hover:text-primary transition-colors flex-shrink-0"
                                  data-testid={`link-explorer-${index + 1}`}
                                  onClick={(e) => e.stopPropagation()}
                                >
                                  <ExternalLink className="w-3 h-3" />
                                </a>
                              </div>
                              <div className="flex items-center gap-2 flex-wrap">
                                <Badge variant="secondary" className="text-[10px] md:text-xs px-1.5 py-0 h-5">
                                  <Trophy className="w-2.5 h-2.5 md:w-3 md:h-3 mr-1" />
                                  {entry.pixelCount}
                                </Badge>
                                <span className="text-[10px] md:text-xs text-muted-foreground">
                                  {formatCKB(entry.totalCkb || 0)}
                                </span>
                              </div>
                            </div>

                            {/* Influence Score */}
                            <div className="text-right flex-shrink-0">
                              <div className="text-[10px] md:text-xs text-muted-foreground mb-0.5">Score</div>
                              <div className="text-base md:text-xl font-bold text-primary tabular-nums">
                                {(entry.influence || 0).toFixed(1)}
                              </div>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    );
                  })}
                </div>
              )}
            </TabsContent>
            
            {/* Referral Leaderboard */}
            <TabsContent value="referrals" className="mt-4 space-y-2 md:space-y-3">
              {isReferralLoading ? (
                <div className="space-y-2">
                  {[...Array(10)].map((_, i) => (
                    <Skeleton key={i} className="h-16 md:h-20 w-full rounded-lg" />
                  ))}
                </div>
              ) : referralLeaderboard.length === 0 ? (
                <Card className="border-dashed">
                  <CardContent className="text-center py-12 md:py-16">
                    <Gift className="h-12 w-12 md:h-16 md:w-16 mx-auto mb-3 md:mb-4 text-muted-foreground/50" />
                    <h3 className="text-lg md:text-xl font-bold mb-2">No Referrals Yet</h3>
                    <p className="text-sm md:text-base text-muted-foreground max-w-sm mx-auto">
                      Be the first to refer friends and earn governance boosts!
                    </p>
                  </CardContent>
                </Card>
              ) : (
                <div className="space-y-2">
                  {referralLeaderboard.map((entry, index) => {
                    const explorerUrl = `https://pudge.explorer.nervos.org/address/${entry.address}`;
                    
                    return (
                      <Card
                        key={entry.userId}
                        className={`border transition-all duration-200 ${getRankColor(index)} hover:shadow-lg active:scale-[0.98]`}
                        data-testid={`referral-entry-${index + 1}`}
                      >
                        <CardContent className="p-3 md:p-4">
                          <div className="flex items-center gap-2 md:gap-3">
                            {/* Rank Badge */}
                            <div className="flex items-center justify-center w-9 h-9 md:w-11 md:h-11 rounded-full bg-background/80 backdrop-blur flex-shrink-0 border-2 border-background/50">
                              {index < 3 ? (
                                getRankIcon(index)
                              ) : (
                                <span className="text-xs md:text-sm font-bold text-muted-foreground">
                                  #{index + 1}
                                </span>
                              )}
                            </div>

                            {/* User Info */}
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-1.5 md:gap-2 mb-1">
                                <p className="text-xs md:text-sm font-mono font-semibold truncate">
                                  <span className="hidden sm:inline">{formatAddress(entry.address)}</span>
                                  <span className="sm:hidden">{formatAddressMobile(entry.address)}</span>
                                </p>
                                <a
                                  href={explorerUrl}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="text-primary/60 hover:text-primary transition-colors flex-shrink-0"
                                  data-testid={`link-explorer-referral-${index + 1}`}
                                  onClick={(e) => e.stopPropagation()}
                                >
                                  <ExternalLink className="w-3 h-3" />
                                </a>
                              </div>
                              <div className="flex items-center gap-2 flex-wrap">
                                <Badge variant="secondary" className="text-[10px] md:text-xs px-1.5 py-0 h-5 font-mono">
                                  {entry.referralCode}
                                </Badge>
                                <span className="text-[10px] md:text-xs text-muted-foreground">
                                  {(1 + entry.currentBoostLevel / 100).toFixed(2)}x boost
                                </span>
                              </div>
                            </div>

                            {/* Referral Count */}
                            <div className="text-right flex-shrink-0">
                              <div className="text-[10px] md:text-xs text-muted-foreground mb-0.5">Refs</div>
                              <div className="text-base md:text-xl font-bold text-amber-500 tabular-nums">
                                {entry.totalReferrals}
                              </div>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    );
                  })}
                </div>
              )}
            </TabsContent>
          </Tabs>
        </div>
      </main>
    </MobileLayout>
  );
}
