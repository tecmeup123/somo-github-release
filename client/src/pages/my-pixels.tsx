import { useQuery } from "@tanstack/react-query";
import { useState, useEffect, useMemo } from "react";
import { ccc } from "@ckb-ccc/connector-react";
import Header from "@/components/layout/Header";
import MobileLayout from "@/components/layout/MobileLayout";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { PixelData } from "@/types/pixel";
import { Skeleton } from "@/components/ui/skeleton";
import { ExternalLink, Send, Flame, Grid as GridIcon, Sparkles, Share2, Gift, Copy, Crown, Medal, TrendingUp } from "lucide-react";
import { TransferPixelDialog } from "@/components/wallet/TransferPixelDialog";
import { MeltPixelDialog } from "@/components/wallet/MeltPixelDialog";
import { formatCKB } from "@/utils/formatting";
import { Badge } from "@/components/ui/badge";
import { getTierColor, getContrastingTextColor } from "@shared/canvas-utils";
import { formatDistanceToNow } from "date-fns";
import { GovernancePoints } from "@/components/governance/GovernancePoints";
import { useToast } from "@/hooks/use-toast";

export default function MyPixels() {
  const signer = ccc.useSigner();
  const { toast } = useToast();
  const [walletAddress, setWalletAddress] = useState<string>("");
  const [selectedPixel, setSelectedPixel] = useState<PixelData | null>(null);
  const [showTransfer, setShowTransfer] = useState(false);
  const [showMelt, setShowMelt] = useState(false);

  useEffect(() => {
    if (!signer) {
      setWalletAddress("");
      return;
    }

    (async () => {
      try {
        const addr = await signer.getRecommendedAddress();
        setWalletAddress(addr);
      } catch (error) {
        console.error("Error getting wallet address:", error);
      }
    })();
  }, [signer]);

  const { data: myPixels = [], isLoading } = useQuery<PixelData[]>({
    queryKey: [`/api/users/${walletAddress}/pixels`],
    enabled: !!walletAddress,
  });

  const { data: referralStats } = useQuery<{
    referralCode: string;
    totalReferrals: number;
    currentBoostLevel: number;
    maxBoostLevel: number;
    boostMultiplier: number;
    expiresAt: string | null;
  }>({
    queryKey: [`/api/referrals/stats/${walletAddress}`],
    enabled: !!walletAddress,
  });

  // Sort pixels by tier (best first)
  const sortedPixels = useMemo(() => {
    const result = [...myPixels];
    const tierOrder = { legendary: 0, epic: 1, rare: 2, common: 3 };
    result.sort((a, b) => 
      (tierOrder[a.tier as keyof typeof tierOrder] || 99) - (tierOrder[b.tier as keyof typeof tierOrder] || 99)
    );
    return result;
  }, [myPixels]);

  // Calculate stats
  const stats = useMemo(() => {
    const tierCounts = { legendary: 0, epic: 0, rare: 0, common: 0 };
    myPixels.forEach(pixel => {
      if (pixel.tier in tierCounts) {
        tierCounts[pixel.tier as keyof typeof tierCounts]++;
      }
    });
    return { tierCounts };
  }, [myPixels]);

  const getTierIcon = (tier: string) => {
    const icons = {
      legendary: "🏆",
      epic: "💎",
      rare: "🔷",
      common: "🟢"
    };
    return icons[tier as keyof typeof icons] || "⬜";
  };

  const handleTransfer = (pixel: PixelData) => {
    setSelectedPixel(pixel);
    setShowTransfer(true);
  };

  const handleMelt = (pixel: PixelData) => {
    setSelectedPixel(pixel);
    setShowMelt(true);
  };

  const handleSharePixel = async (pixel: PixelData) => {
    const shareData = {
      title: `My Pixel (${pixel.x}, ${pixel.y}) on SoMo`,
      text: `Check out my ${pixel.tier} pixel at coordinates (${pixel.x}, ${pixel.y})!`,
      url: window.location.origin + `/?pixel=${pixel.x},${pixel.y}`
    };
    
    try {
      if (navigator.share) {
        await navigator.share(shareData);
      } else {
        await navigator.clipboard.writeText(`${shareData.text} ${shareData.url}`);
        alert('Link copied to clipboard!');
      }
    } catch (error) {
      console.error('Error sharing:', error);
    }
  };

  const handleCopyReferralCode = async () => {
    if (!referralStats?.referralCode) return;
    
    try {
      await navigator.clipboard.writeText(referralStats.referralCode);
      toast({
        title: "Referral Code Copied!",
        description: "Share it to unlock governance boosters and earn more points together",
        variant: "success",
      });
    } catch (error) {
      console.error('Error copying referral code:', error);
      toast({
        title: "Copy Failed",
        description: "Unable to copy referral code. Please try again.",
        variant: "destructive",
      });
    }
  };

  const handleShareReferralCode = async () => {
    if (!referralStats?.referralCode) return;
    
    const shareData = {
      title: 'Join SoMo with my referral code!',
      text: `🎨 Join the SoMo movement and earn governance tokens! Use my referral code: ${referralStats.referralCode} for a boost! 🚀`,
      url: window.location.origin + `/?ref=${referralStats.referralCode}`
    };
    
    try {
      if (navigator.share) {
        await navigator.share(shareData);
      } else {
        await navigator.clipboard.writeText(`${shareData.text} ${shareData.url}`);
        alert('Referral link copied to clipboard!');
      }
    } catch (error) {
      console.error('Error sharing referral code:', error);
    }
  };

  if (!walletAddress) {
    return (
      <MobileLayout>
        <Header />
        <main className="flex-1 container max-w-4xl mx-auto px-4 py-8">
          <Card className="border-dashed">
            <CardContent className="text-center py-16">
              <GridIcon className="h-16 w-16 mx-auto mb-4 text-muted-foreground/50" />
              <h2 className="text-xl md:text-2xl font-bold mb-2">Connect Your Wallet</h2>
              <p className="text-sm md:text-base text-muted-foreground">
                Connect your wallet to view your pixel collection
              </p>
            </CardContent>
          </Card>
        </main>
      </MobileLayout>
    );
  }

  return (
    <MobileLayout>
      <Header />
      
      <main className="flex-1 pb-safe">
        <div className="container max-w-4xl mx-auto px-3 py-4 md:px-6 md:py-8 space-y-4 md:space-y-6">
          {/* Governance Points */}
          <GovernancePoints walletAddress={walletAddress} />

          {/* Quick Stats */}
          {myPixels.length > 0 && (
            <div className="grid grid-cols-3 gap-2 md:gap-4">
              <Card className="border-blue-500/30 bg-blue-500/5" data-testid="section-pixels-owned">
                <CardContent className="p-3 md:p-4 text-center">
                  <GridIcon className="w-5 h-5 md:w-6 md:h-6 mx-auto mb-1 md:mb-2 text-blue-500" />
                  <div className="text-xl md:text-3xl font-bold text-blue-500 tabular-nums" data-testid="text-pixels-owned">
                    {myPixels.length}
                  </div>
                  <div className="text-[10px] md:text-xs text-muted-foreground mt-0.5 md:mt-1">Pixels</div>
                </CardContent>
              </Card>

              <Card className="border-primary/30 bg-primary/5" data-testid="section-total-locked">
                <CardContent className="p-3 md:p-4 text-center">
                  <Sparkles className="w-5 h-5 md:w-6 md:h-6 mx-auto mb-1 md:mb-2 text-primary" />
                  <div className="text-xl md:text-3xl font-bold text-primary tabular-nums" data-testid="text-total-locked">
                    {formatCKB(myPixels.reduce((sum, p) => sum + (p.price || 0), 0))}
                  </div>
                  <div className="text-[10px] md:text-xs text-muted-foreground mt-0.5 md:mt-1">CKB</div>
                </CardContent>
              </Card>

              <Card className="border-amber-500/30 bg-amber-500/5" data-testid="section-referral-stats">
                <CardContent className="p-3 md:p-4 text-center">
                  <Gift className="w-5 h-5 md:w-6 md:h-6 mx-auto mb-1 md:mb-2 text-amber-500" />
                  {referralStats && referralStats.referralCode ? (
                    <>
                      <div className="text-xl md:text-3xl font-bold text-amber-500 tabular-nums">
                        {referralStats.totalReferrals}
                      </div>
                      <div className="text-[10px] md:text-xs text-muted-foreground mt-0.5 md:mt-1">Refs</div>
                    </>
                  ) : (
                    <>
                      <div className="text-xl md:text-3xl font-bold text-muted-foreground tabular-nums">0</div>
                      <div className="text-[10px] md:text-xs text-muted-foreground mt-0.5 md:mt-1">Refs</div>
                    </>
                  )}
                </CardContent>
              </Card>
            </div>
          )}

          {/* Referral Card (if has code) */}
          {referralStats?.referralCode && (
            <Card className="border-amber-500/30 bg-gradient-to-r from-amber-500/10 to-transparent">
              <CardContent className="p-3 md:p-4">
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2 min-w-0">
                    <Gift className="w-5 h-5 md:w-6 md:h-6 text-amber-500 flex-shrink-0" />
                    <div className="min-w-0">
                      <div className="text-xs md:text-sm text-muted-foreground">Your Referral Code</div>
                      <code className="text-sm md:text-lg font-bold font-mono text-amber-500" data-testid="text-referral-code">
                        {referralStats.referralCode}
                      </code>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <Badge variant="secondary" className="text-xs">
                      {referralStats.boostMultiplier.toFixed(2)}x
                    </Badge>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={handleShareReferralCode}
                      data-testid="button-share-referral"
                      className="h-11 px-3"
                    >
                      <Share2 className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={handleCopyReferralCode}
                      data-testid="button-copy-referral"
                      className="h-11 px-3"
                    >
                      <Copy className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Tier Breakdown (if has pixels) */}
          {myPixels.length > 0 && (
            <Card>
              <CardContent className="p-3 md:p-4">
                <div className="flex items-center gap-2 mb-3">
                  <TrendingUp className="w-4 h-4 md:w-5 md:h-5 text-primary" />
                  <h3 className="text-sm md:text-base font-semibold">Collection Breakdown</h3>
                </div>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                  {Object.entries(stats.tierCounts).map(([tier, count]) => (
                    <div key={tier} className="flex items-center gap-2 p-2 rounded-lg bg-muted/50">
                      <span className="text-base md:text-lg">{getTierIcon(tier)}</span>
                      <div className="min-w-0">
                        <div className="text-xs text-muted-foreground capitalize truncate">{tier}</div>
                        <div className="text-sm md:text-base font-bold tabular-nums">{count}</div>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Pixels Grid */}
          {isLoading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 md:gap-4">
              {[...Array(6)].map((_, i) => (
                <Skeleton key={i} className="h-32 md:h-36 rounded-lg" />
              ))}
            </div>
          ) : myPixels.length === 0 ? (
            <Card className="border-dashed">
              <CardContent className="text-center py-12 md:py-16">
                <div className="relative inline-block mb-4">
                  <div className="absolute inset-0 bg-primary/20 blur-3xl rounded-full"></div>
                  <GridIcon className="relative h-16 w-16 md:h-20 md:w-20 text-primary/60" strokeWidth={1.5} />
                </div>
                <h3 className="text-lg md:text-2xl font-bold mb-2">Start Your Collection</h3>
                <p className="text-sm md:text-base text-muted-foreground max-w-sm mx-auto mb-6">
                  The canvas awaits! Claim your first pixel and begin building your influence.
                </p>
                <div className="flex flex-col sm:flex-row gap-2 md:gap-3 justify-center">
                  <Button size="lg" asChild className="w-full sm:w-auto">
                    <a href="/">Explore Canvas</a>
                  </Button>
                  <Button size="lg" variant="outline" asChild className="w-full sm:w-auto">
                    <a href="/leaderboard">View Leaderboard</a>
                  </Button>
                </div>
              </CardContent>
            </Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 md:gap-4">
              {sortedPixels.map((pixel) => {
                const explorerUrl = pixel.sporeTxHash 
                  ? `https://pudge.explorer.nervos.org/transaction/${pixel.sporeTxHash}`
                  : `https://pudge.explorer.nervos.org/address/${walletAddress}`;
                
                return (
                  <Card
                    key={`${pixel.x}-${pixel.y}`}
                    className="group relative overflow-hidden hover:shadow-lg transition-all duration-200 border-border/50 hover:border-primary/50 active:scale-[0.98]"
                    data-testid={`card-pixel-${pixel.x}-${pixel.y}`}
                  >
                    {/* Rarity Badge */}
                    {(pixel.tier === 'legendary' || pixel.tier === 'epic') && (
                      <div className="absolute top-2 right-2 z-10">
                        {pixel.tier === 'legendary' ? (
                          <div className="p-1.5 rounded-full bg-yellow-500/20 backdrop-blur-sm">
                            <Crown className="h-4 w-4 text-yellow-500" />
                          </div>
                        ) : (
                          <div className="p-1.5 rounded-full bg-purple-500/20 backdrop-blur-sm">
                            <Sparkles className="h-3.5 w-3.5 text-purple-500" />
                          </div>
                        )}
                      </div>
                    )}
                    
                    <CardContent className="p-3 md:p-4">
                      <div className="flex items-start gap-3">
                        {/* Pixel Preview */}
                        <div 
                          className="w-14 h-14 md:w-16 md:h-16 rounded-lg flex-shrink-0 flex items-center justify-center text-xs font-bold border-2 shadow-sm cursor-pointer"
                          style={{ 
                            backgroundColor: pixel.bgcolor || getTierColor(pixel.tier),
                            color: pixel.textColor || getContrastingTextColor(getTierColor(pixel.tier)),
                            borderColor: pixel.bgcolor || getTierColor(pixel.tier)
                          }}
                          onClick={() => window.location.href = `/?pixel=${pixel.x},${pixel.y}`}
                        >
                          {pixel.x},{pixel.y}
                        </div>

                        {/* Pixel Info */}
                        <div className="flex-1 min-w-0">
                          <h3 className="text-base md:text-lg font-bold font-mono mb-1">
                            ({pixel.x}, {pixel.y})
                          </h3>
                          <div className="flex items-center gap-2 flex-wrap mb-2">
                            <Badge 
                              variant="secondary" 
                              className="text-[10px] md:text-xs px-1.5 py-0 h-5"
                              style={{
                                color: getTierColor(pixel.tier),
                                backgroundColor: getTierColor(pixel.tier) + '20'
                              }}
                            >
                              {pixel.tier}
                            </Badge>
                            <span className="text-xs md:text-sm font-semibold text-foreground/80">
                              {formatCKB(pixel.price || 0)}
                            </span>
                          </div>
                          {pixel.claimedAt && (
                            <div className="text-[10px] md:text-xs text-muted-foreground">
                              {formatDistanceToNow(new Date(pixel.claimedAt), { addSuffix: true })}
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Action Buttons - 2x2 grid on mobile for proper touch targets */}
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-2 mt-3">
                        <Button
                          variant="outline"
                          size="sm"
                          className="h-11 text-xs px-3 justify-center"
                          onClick={() => handleSharePixel(pixel)}
                        >
                          <Share2 className="h-4 w-4 mr-1.5" />
                          <span>Share</span>
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          className="h-11 text-xs px-3 justify-center"
                          onClick={() => handleTransfer(pixel)}
                          data-testid={`button-transfer-${pixel.x}-${pixel.y}`}
                        >
                          <Send className="h-4 w-4 mr-1.5" />
                          <span>Send</span>
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          className="h-11 text-xs px-3 justify-center"
                          onClick={() => handleMelt(pixel)}
                          data-testid={`button-melt-${pixel.x}-${pixel.y}`}
                        >
                          <Flame className="h-4 w-4 mr-1.5" />
                          <span>Melt</span>
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          className="h-11 text-xs px-3 justify-center"
                          asChild
                        >
                          <a
                            href={explorerUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex items-center"
                          >
                            <ExternalLink className="h-4 w-4 mr-1.5" />
                            <span>View</span>
                          </a>
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </div>
      </main>

      {/* Dialogs */}
      {selectedPixel && (
        <>
          <TransferPixelDialog
            pixel={selectedPixel}
            userAddress={walletAddress}
            open={showTransfer}
            onOpenChange={setShowTransfer}
          />
          <MeltPixelDialog
            pixel={selectedPixel}
            userAddress={walletAddress}
            open={showMelt}
            onOpenChange={setShowMelt}
          />
        </>
      )}
    </MobileLayout>
  );
}
