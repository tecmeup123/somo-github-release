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
      case 0: return <Crown className="w-4 h-4 md:w-5 md:h-5 text-[#DBAB00]" />;
      case 1: return <Medal className="w-4 h-4 md:w-5 md:h-5 text-gray-400" />;
      case 2: return <Medal className="w-4 h-4 md:w-5 md:h-5 text-amber-700" />;
      default: return null;
    }
  };

  const getRankStyle = (index: number) => {
    switch (index) {
      case 0: return {
        className: 'border-[#DBAB00]/40 shadow-[0_0_24px_rgba(219,171,0,0.18)]',
        bg: 'bg-gradient-to-r from-[#DBAB00]/12 to-transparent',
      };
      case 1: return {
        className: 'border-gray-400/30 shadow-[0_0_14px_rgba(156,163,175,0.10)]',
        bg: 'bg-gradient-to-r from-gray-400/8 to-transparent',
      };
      case 2: return {
        className: 'border-amber-700/30 shadow-[0_0_14px_rgba(180,83,9,0.12)]',
        bg: 'bg-gradient-to-r from-amber-700/8 to-transparent',
      };
      default: return {
        className: 'border-border/30',
        bg: 'bg-muted/20',
      };
    }
  };

  return (
    <MobileLayout>
      <Header />

      <main className="flex-1 pb-safe relative">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[700px] h-[350px] bg-primary/[0.03] blur-[140px] rounded-full pointer-events-none" />
        <div className="container max-w-4xl mx-auto px-3 py-4 md:px-6 md:py-8 space-y-4 md:space-y-6 relative z-10">

          {/* Page heading */}
          <div className="flex items-center gap-3">
            <Trophy className="w-6 h-6 text-primary" style={{ filter: "drop-shadow(0 0 6px rgba(9,211,255,0.6))" }} />
            <h1
              className="text-2xl md:text-3xl font-bold"
              style={{
                fontFamily: "var(--font-display)",
                background: "linear-gradient(90deg, #09D3FF, #FFBDFC)",
                WebkitBackgroundClip: "text",
                WebkitTextFillColor: "transparent",
              }}
            >
              Leaderboard
            </h1>
          </div>

          {/* Hero Stats */}
          <div className="grid grid-cols-3 gap-2 md:gap-4">
            <Card className="border-green-500/30 bg-green-500/5 shadow-[0_0_16px_rgba(102,192,132,0.10)]">
              <CardContent className="p-3 md:p-4 text-center">
                <Users className="w-5 h-5 md:w-6 md:h-6 mx-auto mb-1 md:mb-2 text-green-500" />
                <div className="text-xl md:text-3xl font-bold text-green-500 tabular-nums" data-testid="text-total-founders">
                  {totalFounders}
                </div>
                <div className="text-xs text-muted-foreground mt-0.5 md:mt-1">Founders</div>
              </CardContent>
            </Card>

            <Card className="border-primary/30 bg-primary/5 shadow-[0_0_16px_rgba(9,211,255,0.10)]">
              <CardContent className="p-3 md:p-4 text-center">
                <Sparkles className="w-5 h-5 md:w-6 md:h-6 mx-auto mb-1 md:mb-2 text-primary" />
                <div className="text-xl md:text-3xl font-bold text-primary tabular-nums" data-testid="text-total-ckb-locked">
                  {formatCompactNumber(stats?.totalCKBLocked || 0)}
                </div>
                <div className="text-xs text-muted-foreground mt-0.5 md:mt-1">CKB Locked</div>
              </CardContent>
            </Card>

            <Card className="border-yellow-500/30 bg-yellow-500/5 shadow-[0_0_16px_rgba(219,171,0,0.10)]">
              <CardContent className="p-3 md:p-4 text-center">
                <Trophy className="w-5 h-5 md:w-6 md:h-6 mx-auto mb-1 md:mb-2 text-yellow-500" />
                <div className="text-xl md:text-3xl font-bold text-yellow-500 tabular-nums" data-testid="text-top-influence">
                  {topInfluence.toFixed(1)}
                </div>
                <div className="text-xs text-muted-foreground mt-0.5 md:mt-1">Top Score</div>
              </CardContent>
            </Card>
          </div>

          {/* Tabs */}
          <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as "influence" | "referrals")}>
            <TabsList className="grid w-full grid-cols-2 h-11 md:h-12">
              <TabsTrigger value="influence" className="text-sm md:text-base" data-testid="tab-influence">
                <Trophy className="w-4 h-4 mr-1.5 md:mr-2" />
                Influence
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
                    const { className: rankClass, bg: rankBg } = getRankStyle(index);
                    const explorerUrl = `https://pudge.explorer.nervos.org/address/${entry.address}`;
                    const isTopThree = index < 3;

                    return (
                      <Card
                        key={entry.id}
                        className={`border transition-all duration-200 ${rankClass} hover:shadow-lg active:scale-[0.98] overflow-hidden`}
                        data-testid={`leaderboard-entry-${index + 1}`}
                      >
                        <div className={`${rankBg}`}>
                          <CardContent className="p-3 md:p-4">
                            <div className="flex items-center gap-2 md:gap-3">
                              {/* Rank Badge */}
                              <div
                                className={`flex items-center justify-center w-9 h-9 md:w-11 md:h-11 rounded-full flex-shrink-0 ${
                                  isTopThree
                                    ? 'bg-background/80 backdrop-blur border-2 border-background/50'
                                    : 'bg-muted/40'
                                }`}
                              >
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
                                  <Badge variant="secondary" className="text-xs px-1.5 py-0 h-5">
                                    <Trophy className="w-2.5 h-2.5 md:w-3 md:h-3 mr-1" />
                                    {entry.pixelCount}
                                  </Badge>
                                  <span className="text-xs text-muted-foreground">
                                    {formatCKB(entry.totalCkb || 0)}
                                  </span>
                                </div>
                              </div>

                              {/* Influence Score */}
                              <div className="text-right flex-shrink-0">
                                <div className="text-xs text-muted-foreground mb-0.5">Score</div>
                                <div className={`text-base md:text-xl font-bold tabular-nums ${
                                  index === 0 ? 'text-[#DBAB00]' :
                                  index === 1 ? 'text-gray-300' :
                                  index === 2 ? 'text-amber-700' :
                                  'text-primary'
                                }`}>
                                  {(entry.influence || 0).toFixed(1)}
                                </div>
                              </div>
                            </div>
                          </CardContent>
                        </div>
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
                    const { className: rankClass, bg: rankBg } = getRankStyle(index);
                    const explorerUrl = `https://pudge.explorer.nervos.org/address/${entry.address}`;

                    return (
                      <Card
                        key={entry.userId}
                        className={`border transition-all duration-200 ${rankClass} hover:shadow-lg active:scale-[0.98] overflow-hidden`}
                        data-testid={`referral-entry-${index + 1}`}
                      >
                        <div className={`${rankBg}`}>
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
                                  <Badge variant="secondary" className="text-xs px-1.5 py-0 h-5 font-mono">
                                    {entry.referralCode}
                                  </Badge>
                                  <span className="text-xs text-muted-foreground">
                                    {(1 + entry.currentBoostLevel / 100).toFixed(2)}x boost
                                  </span>
                                </div>
                              </div>

                              {/* Referral Count */}
                              <div className="text-right flex-shrink-0">
                                <div className="text-xs text-muted-foreground mb-0.5">Refs</div>
                                <div className={`text-base md:text-xl font-bold tabular-nums ${
                                  index === 0 ? 'text-[#DBAB00]' :
                                  index === 1 ? 'text-gray-300' :
                                  index === 2 ? 'text-amber-700' :
                                  'text-amber-500'
                                }`}>
                                  {entry.totalReferrals}
                                </div>
                              </div>
                            </div>
                          </CardContent>
                        </div>
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
