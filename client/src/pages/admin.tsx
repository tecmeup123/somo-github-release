import { useState, useEffect } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { ccc } from "@ckb-ccc/connector-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { useToast } from "@/hooks/use-toast";
import { Shield, Database, CheckCircle, AlertCircle, ExternalLink, Plus, TrendingUp, Users, Coins, Clock, Share2, RefreshCw, Sparkles, Info } from "lucide-react";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { getExplorerClusterUrl } from "@shared/ccc-client";
import { formatDistanceToNow } from "date-fns";

interface DashboardStats {
  platformHealth: {
    totalMinted: number;
    totalLockedCKB: number;
    uniqueFounders: number;
    lastMintTime: string | null;
  };
  tierDistribution: {
    tier: string;
    minted: number;
    total: number;
  }[];
  recentActivity: {
    id: string;
    walletAddress: string;
    tier: string;
    pixelX: number;
    pixelY: number;
    ckbAmount: number;
    timestamp: string;
    txHash: string;
  }[];
}

interface ClusterStatus {
  exists: boolean;
  clusterId?: string;
  name?: string;
  description?: string;
  createdAt?: string;
}

interface Cluster {
  id: string;
  clusterId: string;
  name: string;
  description: string;
  adminAddress: string | null;
  txHash: string;
  isActive: boolean;
  createdAt: string;
}

export default function Admin() {
  const { client, open } = ccc.useCcc();
  const signer = ccc.useSigner();
  const [isAuthorized, setIsAuthorized] = useState<boolean | null>(null);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [clusterName, setClusterName] = useState("SoMo Pixel Canvas");
  const { toast } = useToast();

  // Fetch dashboard stats with polling
  const { data: dashboardStats, isLoading: statsLoading } = useQuery<DashboardStats>({
    queryKey: ['/api/admin/dashboard-stats'],
    enabled: isAuthorized === true,
    refetchInterval: 30000, // Refresh every 30 seconds
  });

  // Fetch cluster status
  const { data: clusterStatus } = useQuery<ClusterStatus>({
    queryKey: ['/api/admin/cluster-status'],
    enabled: isAuthorized === true,
  });

  // Fetch all clusters
  const { data: clustersData } = useQuery<{ clusters: Cluster[] }>({
    queryKey: ['/api/admin/clusters'],
    enabled: isAuthorized === true,
  });

  // Check if connected wallet is authorized admin
  useEffect(() => {
    const checkAdminStatus = async () => {
      if (!signer) {
        setIsAuthorized(false);
        return;
      }

      try {
        const walletAddress = await signer.getRecommendedAddress();
        
        // Check with server if this wallet is admin
        const response = await apiRequest('POST', '/api/admin/check', {
          walletAddress
        });
        const data = await response.json();
        
        setIsAuthorized(data.isAdmin);
      } catch (error) {
        console.error("Error checking admin status:", error);
        setIsAuthorized(false);
      }
    };

    checkAdminStatus();
  }, [signer]);

  const createClusterMutation = useMutation({
    mutationFn: async () => {
      if (!signer || !client) {
        throw new Error("Wallet not connected");
      }

      const walletAddress = await signer.getRecommendedAddress();
      
      // Import cluster minting function
      const { mintSoMoCluster } = await import("@/lib/cluster-mint");
      
      // Show wallet prompt
      toast({
        title: "Opening Wallet",
        description: "Please approve the cluster creation transaction in your wallet...",
        variant: "info",
      });
      
      // Mint cluster on blockchain - this opens the wallet for signature
      const mintResult = await mintSoMoCluster({
        signer,
        name: clusterName,
        description: "SoMo Pixel Canvas - Governance-focused collaborative NFT on Nervos CKB",
      });

      // Send cluster data to backend for storage (including full cell data for skip mode)
      const response = await apiRequest('POST', '/api/admin/create-cluster', {
        walletAddress,
        clusterId: mintResult.clusterId,
        txHash: mintResult.txHash,
        name: clusterName,
        cellData: mintResult.cellData, // Full cluster cell data for skip mode minting
      });

      return await response.json();
    },
    onSuccess: (data) => {
      toast({
        title: "Success!",
        description: `Cluster "${clusterName}" created successfully.`,
        variant: "success",
      });
      queryClient.invalidateQueries({ queryKey: ['/api/admin/cluster-status'] });
      queryClient.invalidateQueries({ queryKey: ['/api/admin/clusters'] });
      setShowCreateForm(false);
      setClusterName("SoMo Pixel Canvas");
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to create cluster",
        variant: "destructive"
      });
    }
  });

  const setActiveClusterMutation = useMutation({
    mutationFn: async (clusterId: string) => {
      if (!signer) {
        throw new Error("Wallet not connected");
      }

      const walletAddress = await signer.getRecommendedAddress();
      
      const response = await apiRequest('POST', '/api/admin/set-active-cluster', {
        walletAddress,
        clusterId,
      });

      return await response.json();
    },
    onSuccess: () => {
      toast({
        title: "Success!",
        description: "Active cluster updated successfully.",
        variant: "success",
      });
      queryClient.invalidateQueries({ queryKey: ['/api/admin/cluster-status'] });
      queryClient.invalidateQueries({ queryKey: ['/api/admin/clusters'] });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to set active cluster",
        variant: "destructive"
      });
    }
  });

  const initializeCountersMutation = useMutation({
    mutationFn: async () => {
      if (!signer) {
        throw new Error("Wallet not connected");
      }

      const walletAddress = await signer.getRecommendedAddress();
      
      const response = await apiRequest('POST', '/api/admin/initialize-counters', {
        walletAddress,
      });

      return await response.json();
    },
    onSuccess: () => {
      toast({
        title: "Success!",
        description: "Mint counters initialized successfully.",
        variant: "success",
      });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to initialize counters",
        variant: "destructive"
      });
    }
  });

  const handleCreateCluster = () => {
    createClusterMutation.mutate();
  };

  const formatCKB = (amount: number): string => {
    if (amount >= 1_000_000) {
      return `${(amount / 1_000_000).toFixed(2)}M`;
    } else if (amount >= 1_000) {
      return `${(amount / 1_000).toFixed(0)}K`;
    }
    return amount.toLocaleString();
  };

  const getTierColor = (tier: string): string => {
    switch (tier) {
      case 'legendary': return 'text-yellow-500';
      case 'epic': return 'text-purple-500';
      case 'rare': return 'text-blue-500';
      case 'common': return 'text-gray-400';
      default: return 'text-gray-400';
    }
  };

  const getTierBadgeColor = (tier: string): string => {
    switch (tier) {
      case 'legendary': return 'bg-yellow-500/20 text-yellow-500 border-yellow-500/50';
      case 'epic': return 'bg-purple-500/20 text-purple-500 border-purple-500/50';
      case 'rare': return 'bg-blue-500/20 text-blue-500 border-blue-500/50';
      case 'common': return 'bg-gray-500/20 text-gray-400 border-gray-500/50';
      default: return 'bg-gray-500/20 text-gray-400 border-gray-500/50';
    }
  };

  if (isAuthorized === null) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
          <p className="mt-4 text-muted-foreground">Checking authorization...</p>
        </div>
      </div>
    );
  }

  if (!isAuthorized) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-6">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <Shield className="h-12 w-12 text-destructive mx-auto mb-4" />
            <CardTitle>Unauthorized Access</CardTitle>
            <CardDescription>
              {signer 
                ? "Your wallet is not authorized for admin access."
                : "Connect your admin wallet to access this panel."}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Alert>
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                {signer
                  ? "Only the authorized admin wallet can access this panel. Please switch to the correct wallet."
                  : "Admin access requires wallet authentication."}
              </AlertDescription>
            </Alert>
            {!signer && (
              <Button 
                onClick={() => open()} 
                className="w-full"
                data-testid="button-connect-wallet"
              >
                Connect Wallet
              </Button>
            )}
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <TooltipProvider>
      <div className="min-h-screen bg-background">
        <main className="p-4 md:p-6 max-w-6xl mx-auto">
          <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-gradient-to-br from-primary/20 to-primary/5">
                  <Shield className="h-8 w-8 text-primary" />
                </div>
                <div>
                  <h1 className="text-2xl md:text-3xl font-bold bg-gradient-to-r from-primary to-primary/60 bg-clip-text text-transparent">
                    Admin Dashboard
                  </h1>
                  <div className="flex items-center gap-2">
                    <p className="text-sm text-muted-foreground">Platform health and activity</p>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <div className="flex items-center gap-1 text-xs text-muted-foreground cursor-help">
                          <RefreshCw className="h-3 w-3 animate-spin-slow" />
                          <span className="hidden sm:inline">Live</span>
                        </div>
                      </TooltipTrigger>
                      <TooltipContent>
                        <p>Auto-refreshes every 30 seconds</p>
                      </TooltipContent>
                    </Tooltip>
                  </div>
                </div>
              </div>
              {dashboardStats && dashboardStats.platformHealth.totalMinted > 0 && (
                <Button 
                  onClick={async () => {
                    const stats = dashboardStats.platformHealth;
                    const shareText = `🚀 SoMo Update: ${stats.uniqueFounders.toLocaleString()} founders strong! ${formatCKB(stats.totalLockedCKB)} CKB locked on @NervosNetwork. The pixel canvas revolution is here! 🎨\n\n#SoMo #Web3 #CKB #NFT`;
                    
                    if (navigator.share) {
                      try {
                        await navigator.share({
                          text: shareText,
                          url: window.location.origin,
                        });
                      } catch (err) {
                        // User cancelled or error occurred
                      }
                    } else {
                      // Fallback to Twitter
                      const twitterUrl = `https://twitter.com/intent/tweet?text=${encodeURIComponent(shareText)}&url=${encodeURIComponent(window.location.origin)}`;
                      window.open(twitterUrl, '_blank');
                    }
                  }}
                  variant="outline"
                  size="sm"
                  data-testid="button-share-stats"
                >
                  <Share2 className="h-4 w-4 md:mr-2" />
                  <span className="hidden md:inline">Share Stats</span>
                </Button>
              )}
            </div>

          {/* Platform Health Overview */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {statsLoading ? (
              // Loading skeletons
              <>
                {[1, 2, 3, 4].map((i) => (
                  <Card key={i} className="overflow-hidden">
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                      <div className="h-4 w-24 bg-muted animate-pulse rounded" />
                      <div className="h-4 w-4 bg-muted animate-pulse rounded" />
                    </CardHeader>
                    <CardContent>
                      <div className="h-8 w-32 bg-muted animate-pulse rounded mb-2" />
                      <div className="h-3 w-40 bg-muted animate-pulse rounded" />
                    </CardContent>
                  </Card>
                ))}
              </>
            ) : (
              <>
                <Card className="overflow-hidden border-l-4 border-l-blue-500 hover:shadow-lg transition-shadow">
                  <div className="absolute top-0 right-0 w-20 h-20 bg-gradient-to-br from-blue-500/10 to-transparent rounded-bl-full" />
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 relative">
                    <CardTitle className="text-sm font-medium flex items-center gap-2">
                      Pixels Minted
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Info className="h-3 w-3 text-muted-foreground cursor-help" data-testid="info-pixels-minted" />
                        </TooltipTrigger>
                        <TooltipContent>
                          <p>Total pixels claimed as NFTs</p>
                        </TooltipContent>
                      </Tooltip>
                    </CardTitle>
                    <div className="p-2 rounded-lg bg-blue-500/10">
                      <TrendingUp className="h-4 w-4 text-blue-500" />
                    </div>
                  </CardHeader>
                  <CardContent className="relative">
                    <div className="text-2xl font-bold" data-testid="stat-minted">
                      {dashboardStats?.platformHealth.totalMinted || 0} <span className="text-muted-foreground text-lg">/ 2,500</span>
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">
                      {dashboardStats?.platformHealth.totalMinted 
                        ? `${((dashboardStats.platformHealth.totalMinted / 2500) * 100).toFixed(1)}% complete`
                        : 'No pixels minted yet'}
                    </p>
                  </CardContent>
                </Card>

                <Card className="overflow-hidden border-l-4 border-l-green-500 hover:shadow-lg transition-shadow">
                  <div className="absolute top-0 right-0 w-20 h-20 bg-gradient-to-br from-green-500/10 to-transparent rounded-bl-full" />
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 relative">
                    <CardTitle className="text-sm font-medium flex items-center gap-2">
                      CKB Locked
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Info className="h-3 w-3 text-muted-foreground cursor-help" data-testid="info-ckb-locked" />
                        </TooltipTrigger>
                        <TooltipContent>
                          <p>Total CKB locked in pixels (recoverable by melting)</p>
                        </TooltipContent>
                      </Tooltip>
                    </CardTitle>
                    <div className="p-2 rounded-lg bg-green-500/10">
                      <Coins className="h-4 w-4 text-green-500" />
                    </div>
                  </CardHeader>
                  <CardContent className="relative">
                    <div className="text-2xl font-bold" data-testid="stat-locked-ckb">
                      {formatCKB(dashboardStats?.platformHealth.totalLockedCKB || 0)} <span className="text-lg">CKB</span>
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">
                      Fully recoverable by melting
                    </p>
                  </CardContent>
                </Card>

                <Card className="overflow-hidden border-l-4 border-l-purple-500 hover:shadow-lg transition-shadow">
                  <div className="absolute top-0 right-0 w-20 h-20 bg-gradient-to-br from-purple-500/10 to-transparent rounded-bl-full" />
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 relative">
                    <CardTitle className="text-sm font-medium flex items-center gap-2">
                      Unique Founders
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Info className="h-3 w-3 text-muted-foreground cursor-help" data-testid="info-unique-founders" />
                        </TooltipTrigger>
                        <TooltipContent>
                          <p>Number of unique wallets that have minted pixels</p>
                        </TooltipContent>
                      </Tooltip>
                    </CardTitle>
                    <div className="p-2 rounded-lg bg-purple-500/10">
                      <Users className="h-4 w-4 text-purple-500" />
                    </div>
                  </CardHeader>
                  <CardContent className="relative">
                    <div className="text-2xl font-bold" data-testid="stat-founders">
                      {dashboardStats?.platformHealth.uniqueFounders || 0}
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">
                      Max 2,500 founders possible
                    </p>
                  </CardContent>
                </Card>

                <Card className="overflow-hidden border-l-4 border-l-orange-500 hover:shadow-lg transition-shadow">
                  <div className="absolute top-0 right-0 w-20 h-20 bg-gradient-to-br from-orange-500/10 to-transparent rounded-bl-full" />
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 relative">
                    <CardTitle className="text-sm font-medium flex items-center gap-2">
                      Last Mint
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Info className="h-3 w-3 text-muted-foreground cursor-help" data-testid="info-last-mint" />
                        </TooltipTrigger>
                        <TooltipContent>
                          <p>Time since the most recent pixel was minted</p>
                        </TooltipContent>
                      </Tooltip>
                    </CardTitle>
                    <div className="p-2 rounded-lg bg-orange-500/10">
                      <Clock className="h-4 w-4 text-orange-500" />
                    </div>
                  </CardHeader>
                  <CardContent className="relative">
                    <div className="text-2xl font-bold" data-testid="stat-last-mint">
                      {dashboardStats?.platformHealth.lastMintTime 
                        ? (() => {
                            try {
                              return formatDistanceToNow(new Date(dashboardStats.platformHealth.lastMintTime), { addSuffix: true });
                            } catch {
                              return 'Unknown';
                            }
                          })()
                        : 'Never'}
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">
                      Latest minting activity
                    </p>
                  </CardContent>
                </Card>
              </>
            )}
          </div>

          {/* Tier Distribution */}
          <Card>
            <CardHeader>
              <CardTitle>Tier Distribution</CardTitle>
              <CardDescription>Minting progress across all tiers</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                {dashboardStats?.tierDistribution
                  .sort((a, b) => {
                    const order = { legendary: 0, epic: 1, rare: 2, common: 3 };
                    return order[a.tier as keyof typeof order] - order[b.tier as keyof typeof order];
                  })
                  .map((tier) => {
                    const percentage = tier.total > 0 ? (tier.minted / tier.total) * 100 : 0;
                    return (
                      <div key={tier.tier} className="space-y-2" data-testid={`tier-${tier.tier}`}>
                        <div className="flex items-center justify-between">
                          <span className={`text-sm font-medium capitalize ${getTierColor(tier.tier)}`}>
                            {tier.tier}
                          </span>
                          <span className="text-xs text-muted-foreground">
                            {tier.minted}/{tier.total}
                          </span>
                        </div>
                        <div className="w-full bg-muted rounded-full h-2">
                          <div 
                            className={`h-2 rounded-full transition-all ${
                              tier.tier === 'legendary' ? 'bg-yellow-500' :
                              tier.tier === 'epic' ? 'bg-purple-500' :
                              tier.tier === 'rare' ? 'bg-blue-500' :
                              'bg-gray-400'
                            }`}
                            style={{ width: `${percentage}%` }}
                          />
                        </div>
                        <p className="text-xs text-muted-foreground">
                          {percentage.toFixed(1)}% minted
                        </p>
                      </div>
                    );
                  })}
              </div>
            </CardContent>
          </Card>

          {/* Recent Activity */}
          <Card>
            <CardHeader>
              <div className="flex items-center gap-2">
                <Sparkles className="h-5 w-5 text-primary" />
                <div>
                  <CardTitle>Recent Activity</CardTitle>
                  <CardDescription>Latest pixel minting transactions</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {!dashboardStats?.recentActivity || dashboardStats.recentActivity.length === 0 ? (
                <div className="text-center py-12">
                  <div className="relative mx-auto w-20 h-20 mb-4">
                    <div className="absolute inset-0 bg-gradient-to-br from-primary/20 to-primary/5 rounded-full animate-pulse" />
                    <Database className="h-12 w-12 absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 text-muted-foreground" />
                  </div>
                  <h3 className="font-semibold text-lg mb-2">No Activity Yet</h3>
                  <p className="text-sm text-muted-foreground max-w-sm mx-auto">
                    The canvas is waiting! Once users start minting pixels, you'll see their activity here.
                  </p>
                </div>
              ) : (
                <div className="space-y-3">
                  {dashboardStats.recentActivity.map((activity) => (
                    <div 
                      key={activity.id} 
                      className="flex items-center justify-between p-4 rounded-lg border bg-gradient-to-r from-muted/50 to-transparent hover:from-muted hover:shadow-md transition-all"
                      data-testid={`activity-${activity.id}`}
                    >
                      <div className="flex-1 min-w-0 space-y-1">
                        <div className="flex items-center gap-2">
                          <Badge variant="outline" className={`${getTierBadgeColor(activity.tier)} font-semibold`}>
                            {activity.tier}
                          </Badge>
                          <span className="text-xs text-muted-foreground font-mono bg-muted px-2 py-0.5 rounded">
                            ({activity.pixelX}, {activity.pixelY})
                          </span>
                        </div>
                        <p className="text-sm font-mono truncate text-muted-foreground">
                          {activity.walletAddress?.slice(0, 10)}...{activity.walletAddress?.slice(-8)}
                        </p>
                        <p className="text-xs text-muted-foreground flex items-center gap-1">
                          <Clock className="h-3 w-3" />
                          {activity.timestamp 
                            ? (() => {
                                try {
                                  return formatDistanceToNow(new Date(activity.timestamp), { addSuffix: true });
                                } catch {
                                  return 'Unknown time';
                                }
                              })()
                            : 'Unknown time'}
                        </p>
                      </div>
                      <div className="text-right flex flex-col items-end">
                        <p className="text-lg font-bold">{formatCKB(activity.ckbAmount)}</p>
                        <p className="text-xs text-muted-foreground">CKB</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          <Separator />

          {/* Cluster Management */}
          <Card className="border-2">
            <CardHeader>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-gradient-to-br from-blue-500/20 to-blue-500/5">
                    <Database className="h-5 w-5 text-blue-500" />
                  </div>
                  <div>
                    <CardTitle className="flex items-center gap-2">
                      Cluster Management
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Info className="h-4 w-4 text-muted-foreground cursor-help" data-testid="info-active-cluster" />
                        </TooltipTrigger>
                        <TooltipContent className="max-w-xs">
                          <p>A Spore cluster is a collection container on the blockchain that groups pixel NFTs together. Users mint pixels into the active cluster.</p>
                        </TooltipContent>
                      </Tooltip>
                    </CardTitle>
                    <CardDescription>
                      Manage Spore clusters for pixel NFT minting
                    </CardDescription>
                  </div>
                </div>
                <div className="flex gap-2">
                  <Button 
                    onClick={() => initializeCountersMutation.mutate()}
                    variant="outline"
                    size="sm"
                    disabled={initializeCountersMutation.isPending}
                    data-testid="button-initialize-counters"
                    title="Initialize or reset mint number counters based on current pixel state"
                  >
                    <RefreshCw className={`h-4 w-4 mr-2 ${initializeCountersMutation.isPending ? 'animate-spin' : ''}`} />
                    {initializeCountersMutation.isPending ? 'Initializing...' : 'Init Counters'}
                  </Button>
                  <Button 
                    onClick={() => setShowCreateForm(!showCreateForm)}
                    variant="outline"
                    size="sm"
                    data-testid="button-toggle-create-form"
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    {showCreateForm ? 'Cancel' : 'Create New'}
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Create Cluster Form */}
              {showCreateForm && (
                <div className="space-y-4 p-5 border-2 border-dashed rounded-lg bg-gradient-to-br from-muted/50 to-muted/20">
                  <div className="flex items-center gap-2">
                    <Sparkles className="h-5 w-5 text-primary" />
                    <h3 className="font-semibold text-lg">Create New Cluster</h3>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    This will create a new Spore cluster on the Nervos CKB blockchain for organizing pixel NFTs.
                  </p>
                  
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="cluster-name" className="text-sm font-medium">Cluster Name</Label>
                      <Input
                        id="cluster-name"
                        value={clusterName}
                        onChange={(e) => setClusterName(e.target.value)}
                        placeholder="SoMo Pixel Canvas"
                        className="border-2"
                        data-testid="input-cluster-name"
                      />
                      <p className="text-xs text-muted-foreground">
                        Choose a memorable name for your pixel collection
                      </p>
                    </div>
                  </div>

                  <div className="flex gap-2">
                    <Button 
                      onClick={handleCreateCluster}
                      disabled={createClusterMutation.isPending || !clusterName.trim()}
                      className="bg-gradient-to-r from-primary to-primary/80"
                      data-testid="button-create-cluster"
                    >
                      {createClusterMutation.isPending ? (
                        <>
                          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-current mr-2"></div>
                          Creating...
                        </>
                      ) : (
                        <>
                          <Database className="h-4 w-4 mr-2" />
                          Create Cluster
                        </>
                      )}
                    </Button>
                  </div>
                </div>
              )}

              {/* All Clusters List */}
              {clustersData && clustersData.clusters.length > 0 ? (
                <div className="space-y-3">
                  {clustersData.clusters.map((cluster) => (
                    <div 
                      key={cluster.id}
                      className={`space-y-4 p-5 border rounded-lg transition-all ${
                        cluster.isActive 
                          ? 'bg-gradient-to-br from-green-500/5 to-transparent border-green-500/30' 
                          : 'bg-muted/30 hover:bg-muted/50'
                      }`}
                      data-testid={`cluster-${cluster.id}`}
                    >
                      <div className="flex items-center justify-between">
                        <div>
                          <div className="flex items-center gap-2 mb-1">
                            {cluster.isActive && <CheckCircle className="h-5 w-5 text-green-500" />}
                            <h3 className="font-semibold text-lg">{cluster.name}</h3>
                          </div>
                          <p className="text-sm text-muted-foreground flex items-center gap-1">
                            <Clock className="h-3 w-3" />
                            Created {new Date(cluster.createdAt).toLocaleDateString('en-US', { 
                              year: 'numeric', 
                              month: 'long', 
                              day: 'numeric' 
                            })}
                          </p>
                        </div>
                        {cluster.isActive ? (
                          <Badge variant="default" className="bg-green-500 hover:bg-green-600 shadow-lg shadow-green-500/20">
                            <span className="flex items-center gap-1">
                              <span className="h-2 w-2 bg-white rounded-full animate-pulse" />
                              Active
                            </span>
                          </Badge>
                        ) : (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setActiveClusterMutation.mutate(cluster.clusterId)}
                            disabled={setActiveClusterMutation.isPending}
                            data-testid={`button-set-active-${cluster.id}`}
                          >
                            {setActiveClusterMutation.isPending ? "Setting..." : "Set Active"}
                          </Button>
                        )}
                      </div>

                      <div className="space-y-2">
                        <Label className="text-xs font-medium text-muted-foreground">Cluster ID</Label>
                        <div className="font-mono text-xs bg-muted/80 p-3 rounded border break-all hover:bg-muted transition-colors">
                          {cluster.clusterId}
                        </div>
                      </div>

                      <div className="flex flex-wrap gap-2">
                        <Button 
                          variant="outline" 
                          size="sm"
                          onClick={() => window.open(getExplorerClusterUrl(cluster.clusterId), '_blank')}
                          className="hover:bg-primary/10 hover:border-primary/50"
                          data-testid={`button-explorer-${cluster.id}`}
                        >
                          <ExternalLink className="h-4 w-4 mr-2" />
                          View on Explorer
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              ) : !showCreateForm && (
                <Alert className="border-2 border-dashed">
                  <AlertCircle className="h-5 w-5" />
                  <AlertDescription className="ml-2">
                    <p className="font-medium mb-1">No Clusters Found</p>
                    <p className="text-sm">
                      Create a cluster to enable pixel minting. This is a one-time setup required before users can claim pixels.
                    </p>
                  </AlertDescription>
                </Alert>
              )}
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
    </TooltipProvider>
  );
}
