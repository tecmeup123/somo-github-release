import { useState, useEffect } from "react";
import { useMutation, useQueryClient, useQuery } from "@tanstack/react-query";
import { ccc } from "@ckb-ccc/connector-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { getManhattanDistance, calculateTierFromDistance, calculatePriceFromTier, getTierColor, getContrastingTextColor, getPlatformFee } from "@/lib/canvas";
import { ClaimPixelRequest, PixelData } from "@/types/pixel";
import OwnershipHistoryTimeline from "./OwnershipHistoryTimeline";
import { getCKBExplorerUrl, getNetworkLabel } from "@/lib/explorer";
import { ExternalLink, CheckCircle2, Lock, AlertCircle, Trophy, Calendar } from "lucide-react";
import { calculateDailyPointsPerPixel, getTierMultiplier, getMonthKey, MONTHLY_MULTIPLIERS, GOVERNANCE_CONFIG } from "@shared/governance-utils";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { formatCKB } from "@/utils/formatting";

interface PixelClaimModalProps {
  selectedPixel: PixelData | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export default function PixelClaimModal({ selectedPixel, open, onOpenChange }: PixelClaimModalProps) {
  const signer = ccc.useSigner();
  const [userAddress, setUserAddress] = useState<string>("");
  const [referralCode, setReferralCode] = useState<string>("");
  
  const { toast } = useToast();
  const queryClient = useQueryClient();

  useEffect(() => {
    if (!signer) {
      setUserAddress("");
      return;
    }

    (async () => {
      try {
        const addr = await signer.getRecommendedAddress();
        setUserAddress(addr);
      } catch (error) {
        console.error("Error getting wallet address:", error);
      }
    })();
  }, [signer]);

  // Fetch mint status for the connected wallet (enforces 1-pixel-per-wallet)
  const { data: claimedTiersData } = useQuery<{
    hasAlreadyMinted: boolean;
    mintedPixel: { x: number; y: number; tier: string; id: string } | null;
  }>({
    queryKey: [`/api/users/${userAddress}/claimed-tiers`],
    enabled: !!userAddress && open,
  });

  const claimMutation = useMutation({
    mutationFn: async (data: ClaimPixelRequest) => {
      const response = await apiRequest('POST', '/api/pixels/claim', data);
      return response.json();
    },
    onSuccess: (data: any) => {
      const { sporeData } = data;
      
      if (sporeData) {
        const explorerUrl = getCKBExplorerUrl('transaction', sporeData.txHash);
        
        toast({
          title: "🎉 Pixel Claimed Successfully!",
          variant: "success",
          description: (
            <div className="space-y-2 mt-2" data-testid="toast-claim-success-modal">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-green-400" />
                <span className="text-sm">Spore NFT minted at ({selectedPixel?.x}, {selectedPixel?.y})</span>
              </div>
              <div className="space-y-1 text-xs text-muted-foreground">
                <div className="flex items-center gap-1">
                  <span>NFT ID:</span>
                  <code className="bg-secondary/50 px-1 py-0.5 rounded font-mono">
                    {sporeData.sporeId.slice(0, 10)}...{sporeData.sporeId.slice(-8)}
                  </code>
                </div>
                <div className="flex items-center gap-1">
                  <span>DNA:</span>
                  <code className="bg-secondary/50 px-1 py-0.5 rounded font-mono">{sporeData.dna}</code>
                </div>
                <div className="flex items-center gap-1">
                  <span>Network:</span>
                  <span className="font-medium">{getNetworkLabel()}</span>
                </div>
              </div>
              <div className="flex gap-2 pt-2">
                <a
                  href={explorerUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-1 text-xs text-primary hover:underline"
                  data-testid="link-explorer-modal"
                >
                  <ExternalLink className="w-3 h-3" />
                  View Transaction
                </a>
              </div>
            </div>
          ),
          duration: 8000,
        });
      } else {
        toast({
          title: "Pixel Claimed!",
          description: `Successfully minted Spore NFT for pixel (${selectedPixel?.x}, ${selectedPixel?.y})`,
          variant: "success",
        });
      }
      
      queryClient.invalidateQueries({ queryKey: ['/api/pixels'] });
      queryClient.invalidateQueries({ queryKey: ['/api/stats'] });
      queryClient.invalidateQueries({ 
        predicate: (query) => {
          const key = query.queryKey[0] as string;
          return key?.startsWith('/api/users');
        }
      });
      queryClient.invalidateQueries({ queryKey: ['/api/leaderboard'] });
      onOpenChange(false); // Close modal on success
    },
    onError: (error: any) => {
      toast({
        title: "Claim Failed",
        description: error.message || "Failed to claim pixel",
        variant: "destructive",
      });
    },
  });

  const handleClaim = async () => {
    if (!selectedPixel || !signer) {
      toast({
        title: "Wallet Not Connected",
        description: "Please connect your wallet to claim pixels",
        variant: "destructive",
      });
      return;
    }
    
    try {
      // Step 1: Call backend to prepare claim and get DNA with real mint numbers
      toast({
        title: "Preparing Claim",
        description: "Validating pixel and generating DNA...",
        variant: "info",
      });
      
      const prepareResponse = await apiRequest('POST', '/api/pixels/prepare-claim', {
        x: selectedPixel.x,
        y: selectedPixel.y,
        userAddress,
      });
      const prepareData = await prepareResponse.json();
      
      if (!prepareData.success) {
        throw new Error(prepareData.error || "Failed to prepare claim");
      }
      
      console.log("Claim prepared with DNA:", prepareData.dna);
      console.log("Mint numbers:", {
        tierMintNumber: prepareData.pixelData.tierMintNumber,
        globalMintNumber: prepareData.pixelData.globalMintNumber,
      });
      
      // Import mint function
      const { mintPixelSpore } = await import("@/lib/spore-mint");
      
      // Get admin cluster info from backend (need full cell data for skip mode)
      const clusterResponse = await fetch("/api/clusters/active");
      const clusterData = await clusterResponse.json();
      
      console.log("=== DEBUG: Cluster API Response ===");
      console.log("Full response:", JSON.stringify(clusterData, null, 2));
      console.log("cellData:", clusterData.cellData);
      if (clusterData.cellData) {
        console.log("cellData.lock:", clusterData.cellData.lock);
        console.log("cellData.type:", clusterData.cellData.type);
      }
      
      const clusterId = clusterData.exists ? clusterData.clusterId : undefined;
      const clusterTxHash = clusterData.exists ? clusterData.txHash : undefined;
      const clusterCellData = clusterData.exists ? clusterData.cellData : undefined;
      
      // Step 2: Mint Spore NFT on blockchain with real DNA
      toast({
        title: "Opening Wallet",
        description: "Please approve the transaction in your wallet...",
        variant: "info",
      });
      
      const mintResult = await mintPixelSpore({
        signer,
        x: selectedPixel.x,
        y: selectedPixel.y,
        tier: selectedPixel.tier,
        price: selectedPixel.price,
        clusterId,  // Cluster ID for Spore type script args
        clusterTxHash,  // Transaction hash where cluster cell was created
        clusterCellData,  // Full cluster cell data for skip mode manual injection
        dobContent: prepareData.dobContent, // Use backend-generated DNA with real mint numbers
      });
      
      console.log("Minted Spore NFT with:", {
        sporeId: mintResult.sporeId,
        txHash: mintResult.txHash,
        dna: mintResult.dna,
      });
      
      // Step 3: Finalize claim in backend after successful blockchain mint
      toast({
        title: "Finalizing Claim",
        description: "Saving pixel data...",
        variant: "info",
      });
      
      const finalizeResponse = await apiRequest('POST', '/api/pixels/finalize-claim', {
        x: selectedPixel.x,
        y: selectedPixel.y,
        userAddress,
        txHash: mintResult.txHash,
        sporeId: mintResult.sporeId,
        tierMintNumber: prepareData.pixelData.tierMintNumber,
        globalMintNumber: prepareData.pixelData.globalMintNumber,
        referralCode: referralCode.trim() || undefined,
      });
      const finalizeData = await finalizeResponse.json();
      
      if (!finalizeData.success) {
        throw new Error(finalizeData.error || "Failed to finalize claim");
      }
      
      // Show success toast
      const explorerUrl = getCKBExplorerUrl('transaction', mintResult.txHash);
      
      toast({
        title: "🎉 Pixel Claimed Successfully!",
        variant: "success",
        description: (
          <div className="space-y-2 mt-2" data-testid="toast-claim-success-modal">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-green-400" />
              <span className="text-sm">Spore NFT minted at ({selectedPixel?.x}, {selectedPixel?.y})</span>
            </div>
            <div className="space-y-1 text-xs text-muted-foreground">
              <div className="flex items-center gap-1">
                <span>NFT ID:</span>
                <code className="bg-secondary/50 px-1 py-0.5 rounded font-mono">
                  {mintResult.sporeId.slice(0, 10)}...{mintResult.sporeId.slice(-8)}
                </code>
              </div>
              <div className="flex items-center gap-1">
                <span>DNA:</span>
                <code className="bg-secondary/50 px-1 py-0.5 rounded font-mono">{mintResult.dna}</code>
              </div>
              <div className="flex items-center gap-1">
                <span>Tier Mint #:</span>
                <span className="font-bold text-green-400">{prepareData.pixelData.tierMintNumber}</span>
              </div>
              <div className="flex items-center gap-1">
                <span>Global Mint #:</span>
                <span className="font-bold text-blue-400">{prepareData.pixelData.globalMintNumber}</span>
              </div>
              <div className="flex items-center gap-1">
                <span>Network:</span>
                <span className="font-medium">{getNetworkLabel()}</span>
              </div>
            </div>
            <div className="flex gap-2 pt-2">
              <a
                href={explorerUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-1 text-xs text-primary hover:underline"
                data-testid="link-explorer-modal"
              >
                <ExternalLink className="w-3 h-3" />
                View Transaction
              </a>
            </div>
          </div>
        ),
        duration: 10000,
      });
      
      // Show referral status feedback if code was provided
      if (finalizeData.referral) {
        if (finalizeData.referral.status === 'success') {
          toast({
            title: "✨ Referral Applied!",
            description: finalizeData.referral.message || 'Your referrer received a governance boost.',
            variant: "success",
            duration: 5000,
          });
        } else {
          toast({
            title: "Referral Code Issue",
            description: finalizeData.referral.message || 'There was an issue processing your referral code.',
            variant: "destructive",
            duration: 5000,
          });
        }
      }
      
      // Invalidate queries to refresh data
      queryClient.invalidateQueries({ queryKey: ['/api/pixels'] });
      queryClient.invalidateQueries({ queryKey: ['/api/stats'] });
      queryClient.invalidateQueries({ 
        predicate: (query) => {
          const key = query.queryKey[0] as string;
          return key?.startsWith('/api/users');
        }
      });
      queryClient.invalidateQueries({ queryKey: ['/api/leaderboard'] });
      
      onOpenChange(false); // Close modal on success
    } catch (error: any) {
      toast({
        title: "Claim Failed",
        description: error.message || "Failed to claim pixel",
        variant: "destructive",
      });
    }
  };

  if (!selectedPixel) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[94vw] sm:max-w-xl p-3 sm:p-4" data-testid="claim-modal">
        <DialogHeader className="space-y-1">
          <DialogTitle className="flex items-center gap-2 flex-wrap text-sm sm:text-lg">
            <div className="w-2 h-2 bg-primary rounded-full animate-pulse flex-shrink-0"></div>
            <span className="font-bold font-display text-primary uppercase tracking-wide">Claim Pixel</span>
          </DialogTitle>
          <DialogDescription className="sr-only">
            View and claim pixel ({selectedPixel.x}, {selectedPixel.y}) on the SoMo canvas
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-1.5">
          {/* Main Pixel Preview Card */}
          <div className="p-1.5 sm:p-3 bg-secondary/10 border border-secondary/20 rounded-lg">
            <div className="flex items-center gap-2 sm:gap-3 mb-1.5">
              <div 
                className="w-12 h-12 sm:w-14 sm:h-14 rounded-lg border-2 flex items-center justify-center shadow-lg flex-shrink-0 relative overflow-hidden"
                style={{ 
                  backgroundColor: selectedPixel.claimed ? selectedPixel.bgcolor || getTierColor(selectedPixel.tier) : getTierColor(selectedPixel.tier),
                  color: selectedPixel.claimed ? selectedPixel.textColor || getContrastingTextColor(getTierColor(selectedPixel.tier)) : getContrastingTextColor(getTierColor(selectedPixel.tier)),
                  borderColor: selectedPixel.claimed ? selectedPixel.bgcolor || getTierColor(selectedPixel.tier) : getTierColor(selectedPixel.tier)
                }}
                data-testid="pixel-preview-large"
              >
                <div className="absolute inset-0 bg-gradient-to-br from-white/20 to-transparent"></div>
                <span className="text-[10px] sm:text-xs font-bold text-center leading-none relative z-10">
                  {selectedPixel.x},{selectedPixel.y}
                </span>
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-2 flex-wrap">
                  <span className="font-mono text-sm sm:text-lg font-bold break-all" data-testid="selected-coordinates">
                    ({selectedPixel.x}, {selectedPixel.y})
                  </span>
                  <div 
                    className="px-2 sm:px-3 py-0.5 sm:py-1 rounded-full text-[10px] sm:text-xs font-bold text-black whitespace-nowrap"
                    style={{ backgroundColor: getTierColor(selectedPixel.tier) }}
                    data-testid="selected-tier-badge"
                  >
                    {selectedPixel.tier.toUpperCase()}
                  </div>
                </div>
                <div className="grid grid-cols-1 gap-1.5 sm:gap-2 text-[11px] sm:text-xs overflow-hidden">
                  <div>
                    <span className="text-muted-foreground">Status:</span>
                    <span className={`ml-2 font-medium ${selectedPixel.claimed ? 'text-green-400' : 'text-blue-400'}`}>
                      {selectedPixel.claimed ? 'Claimed' : 'Available'}
                    </span>
                  </div>
                  <div className="space-y-1">
                    <div className="flex flex-wrap justify-between gap-x-2 gap-y-0.5">
                      <span className="text-muted-foreground">CKB Locked:</span>
                      <span className="font-mono font-bold">
                        {formatCKB(selectedPixel.price)}
                      </span>
                    </div>
                    {!selectedPixel.claimed && (
                      <>
                        <div className="flex flex-wrap justify-between gap-x-2 gap-y-0.5">
                          <span className="text-muted-foreground">Platform Fee:</span>
                          <span className="font-mono">
                            {formatCKB(getPlatformFee(selectedPixel.tier))}
                          </span>
                        </div>
                        <div className="flex flex-wrap justify-between gap-x-2 gap-y-0.5 pt-1 border-t border-border/30">
                          <span className="text-foreground font-semibold">Total:</span>
                          <span className="font-mono font-bold text-primary">
                            {formatCKB(selectedPixel.price + getPlatformFee(selectedPixel.tier))}
                          </span>
                        </div>
                      </>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* Governance Earning Preview */}
            <div className="p-1.5 sm:p-3 bg-gradient-to-br from-amber-500/10 via-amber-500/5 to-transparent border border-amber-500/20 rounded-lg mt-1.5">
              <div className="flex items-center gap-1.5 mb-1">
                <Trophy className="w-3 h-3 sm:w-3.5 sm:h-3.5 text-amber-500" />
                <h4 className="text-[11px] sm:text-xs font-semibold text-amber-500">Governance Rewards</h4>
              </div>
              
              {(() => {
                const now = new Date();
                const snapshotDate = GOVERNANCE_CONFIG.SNAPSHOT_DATE;
                const daysUntilSnapshot = Math.max(0, Math.ceil((snapshotDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)));
                
                const monthKey = getMonthKey(now);
                const monthMultiplier = monthKey ? MONTHLY_MULTIPLIERS[monthKey].multiplier : 1.0;
                const tierMultiplier = getTierMultiplier(selectedPixel.tier);
                const basePointsPerDay = calculateDailyPointsPerPixel();
                
                // Calculate points for minters (100%) and holders (25%)
                const minterDailyPoints = Math.floor(basePointsPerDay * monthMultiplier * tierMultiplier * GOVERNANCE_CONFIG.MINTER_MULTIPLIER);
                const holderDailyPoints = Math.floor(basePointsPerDay * monthMultiplier * tierMultiplier * GOVERNANCE_CONFIG.HOLDER_MULTIPLIER);
                
                const minterEstimatedTokens = Math.floor((minterDailyPoints * daysUntilSnapshot) / GOVERNANCE_CONFIG.POINTS_PER_TOKEN);
                const holderEstimatedTokens = Math.floor((holderDailyPoints * daysUntilSnapshot) / GOVERNANCE_CONFIG.POINTS_PER_TOKEN);
                
                const isMinter = !selectedPixel.claimed || (selectedPixel.minterId === selectedPixel.ownerId);
                
                return (
                  <div className="space-y-0.5 text-[10px] sm:text-xs">
                    {/* Show both rates if unclaimed, otherwise show relevant rate */}
                    {!selectedPixel.claimed ? (
                      <>
                        <div className="space-y-0.5 p-1 bg-green-500/10 border border-green-500/30 rounded">
                          <div className="flex items-center gap-1">
                            <Trophy className="w-2.5 h-2.5 text-green-500 flex-shrink-0" />
                            <span className="font-semibold text-green-500 text-[10px] sm:text-xs">Minter (100%)</span>
                          </div>
                          <div className="flex flex-wrap justify-between items-center gap-x-2 gap-y-0.5">
                            <span className="text-muted-foreground text-[10px]">Daily Points:</span>
                            <span className="font-bold text-amber-500 whitespace-nowrap text-[10px]">{minterDailyPoints.toLocaleString()} pts/day</span>
                          </div>
                          <div className="flex flex-wrap justify-between items-center gap-x-2 gap-y-0.5">
                            <span className="text-muted-foreground text-[10px]">Est. Tokens:</span>
                            <span className="font-bold text-foreground whitespace-nowrap text-[10px]">{minterEstimatedTokens.toLocaleString()}</span>
                          </div>
                        </div>
                        <div className="space-y-0.5 p-1 bg-blue-500/10 border border-blue-500/30 rounded">
                          <div className="flex items-center gap-1">
                            <span className="font-semibold text-blue-400 text-[10px] sm:text-xs">Holder (25%)</span>
                          </div>
                          <div className="flex flex-wrap justify-between items-center gap-x-2 gap-y-0.5">
                            <span className="text-muted-foreground text-[10px]">Daily Points:</span>
                            <span className="font-bold text-amber-500 whitespace-nowrap text-[10px]">{holderDailyPoints.toLocaleString()} pts/day</span>
                          </div>
                          <div className="flex flex-wrap justify-between items-center gap-x-2 gap-y-0.5">
                            <span className="text-muted-foreground text-[10px]">Est. Tokens:</span>
                            <span className="font-bold text-foreground whitespace-nowrap text-[10px]">{holderEstimatedTokens.toLocaleString()}</span>
                          </div>
                          <div className="text-[9px] sm:text-[10px] text-blue-300 mt-0.5">
                            💡 Secondary buyers earn 25%
                          </div>
                        </div>
                      </>
                    ) : (
                      <>
                        <div className={`flex items-center gap-1 mb-2 p-2 rounded ${isMinter ? 'bg-green-500/10 border border-green-500/30' : 'bg-blue-500/10 border border-blue-500/30'}`}>
                          {isMinter ? (
                            <>
                              <Trophy className="w-3 h-3 text-green-500 flex-shrink-0" />
                              <span className="font-semibold text-green-500 text-[11px] sm:text-xs">Minter (100%)</span>
                            </>
                          ) : (
                            <span className="font-semibold text-blue-400 text-[11px] sm:text-xs">Holder (25%)</span>
                          )}
                        </div>
                        <div className="flex flex-wrap justify-between items-center gap-x-2 gap-y-0.5">
                          <span className="text-muted-foreground">Daily Points:</span>
                          <span className="font-bold text-amber-500 whitespace-nowrap">{isMinter ? minterDailyPoints : holderDailyPoints} pts/day</span>
                        </div>
                        <div className="flex flex-wrap justify-between items-center gap-x-2 gap-y-0.5">
                          <span className="text-muted-foreground">Est. Tokens:</span>
                          <span className="font-bold text-foreground whitespace-nowrap">{isMinter ? minterEstimatedTokens : holderEstimatedTokens}</span>
                        </div>
                        {!isMinter && (
                          <div className="mt-2 p-2 bg-blue-500/10 border border-blue-500/30 rounded">
                            <span className="text-blue-300 text-[10px] sm:text-xs">
                              ℹ️ Holder: 25% rate. Tier badges included!
                            </span>
                          </div>
                        )}
                      </>
                    )}
                    <div className="flex flex-wrap items-center gap-1.5 pt-1 border-t border-amber-500/20 mt-1">
                      <Calendar className="w-2.5 h-2.5 text-amber-500 flex-shrink-0" />
                      <span className="text-amber-500 font-medium text-[10px] sm:text-xs">{daysUntilSnapshot} days until snapshot</span>
                    </div>
                  </div>
                );
              })()}
            </div>

            {/* Ownership Details for Claimed Pixels */}
            {selectedPixel.claimed && (
              <div className="pt-2 border-t border-border/30 mt-2 space-y-2">
                <div>
                  <h4 className="text-xs font-semibold text-primary mb-1.5">👑 Ownership Details</h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-2 sm:gap-4 text-[11px] sm:text-xs overflow-hidden">
                    <div className="break-all">
                      <span className="text-muted-foreground">Owner ID:</span>
                      <span className="ml-2 font-mono">{selectedPixel.ownerId?.slice(0, 8)}...</span>
                    </div>
                    {selectedPixel.claimedAt && (
                      <div>
                        <span className="text-muted-foreground">Claimed:</span>
                        <span className="ml-2">{new Date(selectedPixel.claimedAt).toLocaleDateString()}</span>
                      </div>
                    )}
                  </div>
                </div>
                
                {/* Ownership History Timeline */}
                <div className="border-t border-border/30 pt-2">
                  <OwnershipHistoryTimeline pixelId={selectedPixel.id} />
                </div>
              </div>
            )}
          </div>

          {/* 1-Pixel-Per-Wallet Restriction Alert */}
          {!selectedPixel.claimed && claimedTiersData && claimedTiersData.hasAlreadyMinted && claimedTiersData.mintedPixel && (
            <Alert className="border-orange-500/50 bg-orange-500/10 py-2" data-testid="alert-already-minted">
              <Lock className="h-3 w-3 sm:h-4 sm:w-4 text-orange-500 flex-shrink-0" />
              <AlertDescription className="text-[10px] sm:text-xs">
                <div className="space-y-0.5 sm:space-y-1">
                  <div>
                    <span className="font-semibold text-orange-500">Already Minted:</span>
                    <span className="ml-1">
                      You've minted a <span className="font-bold">{claimedTiersData.mintedPixel.tier}</span> pixel at ({claimedTiersData.mintedPixel.x}, {claimedTiersData.mintedPixel.y}).
                    </span>
                  </div>
                  <div className="text-[9px] sm:text-[10px] text-muted-foreground">
                    💡 <span className="font-medium">1 Pixel Per Wallet:</span> Each wallet can only mint ONE pixel (2,500 unique founders).
                  </div>
                </div>
              </AlertDescription>
            </Alert>
          )}

          {/* Action Tips */}
          {!selectedPixel.claimed && (!claimedTiersData || !claimedTiersData.hasAlreadyMinted) && (
            <div className="p-1.5 bg-accent/10 border border-accent/20 rounded-lg">
              <div className="flex items-start gap-1">
                <span className="text-accent text-[10px] flex-shrink-0">💡</span>
                <div className="text-[9px] sm:text-[10px] text-accent">
                  <span className="font-medium">Pro Tip:</span>
                  <span className="ml-1">
                    {selectedPixel.tier === 'legendary' ? 'Ultra rare - max governance!' :
                     selectedPixel.tier === 'epic' ? '2.5x governance multiplier!' :
                     selectedPixel.tier === 'rare' ? '1.5x governance potential.' :
                     'Choose wisely - 1 pixel per wallet!'}
                  </span>
                </div>
              </div>
            </div>
          )}

          {/* Referral Code Input */}
          {!selectedPixel.claimed && (!claimedTiersData || !claimedTiersData.hasAlreadyMinted) && (
            <div className="space-y-1">
              <label htmlFor="referralCode" className="text-[10px] font-medium text-muted-foreground">
                Referral Code <span className="text-[9px] text-accent">(Optional)</span>
              </label>
              <Input
                id="referralCode"
                type="text"
                placeholder="Enter referral code"
                value={referralCode}
                onChange={(e) => setReferralCode(e.target.value.toUpperCase())}
                className="!bg-[#1e2837] !border-[#1e2837] !text-white placeholder:text-gray-400 focus:!border-primary focus:!ring-1 focus:!ring-primary h-8 text-xs"
                style={{ backgroundColor: '#1e2837', color: '#ffffff', borderColor: '#1e2837' }}
                data-testid="input-referral-code"
                maxLength={10}
              />
              <p className="text-[9px] sm:text-[10px] text-muted-foreground">
                💫 Using a referral code gives the referrer a governance boost!
              </p>
            </div>
          )}

          {/* Claim Button */}
          {!selectedPixel.claimed && (
            <Button
              onClick={handleClaim}
              disabled={
                claimMutation.isPending || 
                !userAddress ||
                (claimedTiersData && claimedTiersData.hasAlreadyMinted)
              }
              className="cyber-button w-full py-1.5 sm:py-3 text-xs sm:text-base disabled:opacity-50 disabled:cursor-not-allowed"
              data-testid="button-claim-pixel"
            >
              <span className="relative z-10 flex items-center justify-center gap-1.5">
                {claimMutation.isPending ? (
                  "Claiming..."
                ) : !userAddress ? (
                  "Connect Wallet"
                ) : claimedTiersData && claimedTiersData.hasAlreadyMinted ? (
                  <>
                    <Lock className="w-3 h-3 sm:w-4 sm:h-4" />
                    <span className="text-xs sm:text-base">Already Minted</span>
                  </>
                ) : (
                  "🚀 Claim Pixel"
                )}
              </span>
            </Button>
          )}

          <div className="text-[9px] text-center text-muted-foreground border-t border-border/30 pt-1">
            Eternal, tradable land on Nervos CKB
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
