import { useQuery, useMutation } from "@tanstack/react-query";
import { Copy, ExternalLink, LogOut, RefreshCw } from "lucide-react";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { UserData } from "@/types/pixel";
import { Separator } from "@/components/ui/separator";

interface WalletModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  userAddress: string;
  balance: string;
  walletName?: string;
  walletIcon?: string;
  onDisconnect?: () => void;
  children: React.ReactNode;
}

export default function WalletModal({
  open,
  onOpenChange,
  userAddress,
  balance,
  walletName,
  walletIcon,
  onDisconnect,
  children,
}: WalletModalProps) {
  const { toast } = useToast();

  // Wallet sync mutation
  const syncMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest('POST', `/api/wallet/sync`, { 
        walletAddress: userAddress 
      });
      return await res.json();
    },
    onSuccess: (data: any) => {
      const { summary, changes } = data;
      
      // Invalidate queries to refresh data
      queryClient.invalidateQueries({ queryKey: [`/api/users/${userAddress}`] });
      queryClient.invalidateQueries({ queryKey: ['/api/leaderboard'] });
      queryClient.invalidateQueries({ queryKey: ['/api/pixels'] });
      
      // Show detailed sync results
      if (summary.pixelsRemoved > 0 || summary.pixelsAdded > 0) {
        toast({
          title: "Wallet Synced!",
          description: `${summary.pixelsAdded > 0 ? `Added ${summary.pixelsAdded} pixel(s). ` : ''}${summary.pixelsRemoved > 0 ? `Removed ${summary.pixelsRemoved} pixel(s). ` : ''}Influence: ${summary.influenceScore}`,
          variant: "success",
        });
      } else {
        toast({
          title: "Wallet Synced!",
          description: "Your wallet is already in perfect sync with the blockchain.",
          variant: "success",
        });
      }
    },
    onError: (error: any) => {
      toast({
        title: "Sync Failed",
        description: error.message || "Failed to sync wallet with blockchain",
        variant: "destructive",
      });
    },
  });

  const { data: userData } = useQuery<UserData>({
    queryKey: [`/api/users/${userAddress}`],
    enabled: !!userAddress && open,
  });


  const { data: leaderboard = [] } = useQuery<UserData[]>({
    queryKey: ['/api/leaderboard'],
    enabled: open,
  });

  const userRank = leaderboard.findIndex(u => u.address === userAddress) + 1;

  const copyAddress = () => {
    navigator.clipboard.writeText(userAddress);
    toast({
      title: "Address Copied!",
      description: "Wallet address copied to clipboard",
      variant: "info",
    });
  };

  const formatAddress = (addr: string) => {
    if (!addr) return "";
    return `${addr.slice(0, 4)}...${addr.slice(-4)}`;
  };

  return (
    <Popover open={open} onOpenChange={onOpenChange}>
      <PopoverTrigger asChild>
        {children}
      </PopoverTrigger>
      <PopoverContent 
        className="w-80 p-0 backdrop-blur-xl bg-background/95 border-2 border-primary/20" 
        align="end"
        data-testid="wallet-modal"
      >
        {/* Header */}
        <div className="p-3 bg-gradient-to-br from-primary/10 to-secondary/5 border-b border-primary/20">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              {walletIcon && <img src={walletIcon} alt={walletName} className="w-5 h-5" />}
              <div>
                <div className="text-xs text-muted-foreground">Connected</div>
                <div className="text-sm font-semibold">{walletName}</div>
              </div>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={copyAddress}
              className="h-7 px-2"
              data-testid="button-copy-address"
            >
              <Copy className="w-3 h-3" />
            </Button>
          </div>
          <div className="font-mono text-xs text-muted-foreground">
            {formatAddress(userAddress)}
          </div>
        </div>

        {/* Balance */}
        <div className="p-3 bg-background/50">
          <div className="text-xs text-muted-foreground mb-1">Available Balance</div>
          <div className="text-xl font-bold font-mono text-primary">{balance} <span className="text-xs">CKB</span></div>
        </div>

        <Separator />

        {/* Quick Stats */}
        <div className="p-3 flex-shrink-0">
          <div className="grid grid-cols-3 gap-2 text-center">
            <div>
              <div className="text-lg font-bold text-primary">{userData?.pixelCount || 0}</div>
              <div className="text-xs text-muted-foreground">Pixels</div>
            </div>
            <div>
              <div className="text-lg font-bold text-secondary">{userData?.influence?.toLocaleString() || 0}</div>
              <div className="text-xs text-muted-foreground">Influence</div>
            </div>
            <div>
              <div className="text-lg font-bold text-accent">
                {userRank > 0 ? `#${userRank}` : '-'}
              </div>
              <div className="text-xs text-muted-foreground">Rank</div>
            </div>
          </div>
        </div>

        <Separator />

        {/* Actions */}
        <div className="p-2 space-y-1">
          <button
            onClick={() => syncMutation.mutate()}
            disabled={syncMutation.isPending}
            className="w-full flex items-center justify-between p-2 hover:bg-muted rounded text-xs transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            data-testid="button-sync-wallet"
          >
            <div className="flex items-center gap-2">
              <RefreshCw className={`w-3 h-3 ${syncMutation.isPending ? 'animate-spin' : ''}`} />
              <span>{syncMutation.isPending ? 'Syncing...' : 'Sync Wallet'}</span>
            </div>
          </button>
          <a
            href={`https://pudge.explorer.nervos.org/address/${userAddress}`}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center justify-between p-2 hover:bg-muted rounded text-xs transition-colors"
            data-testid="link-explorer"
          >
            <div className="flex items-center gap-2">
              <ExternalLink className="w-3 h-3" />
              <span>View on Explorer</span>
            </div>
          </a>
          {onDisconnect && (
            <button
              onClick={() => {
                onDisconnect();
                onOpenChange(false);
              }}
              className="w-full flex items-center gap-2 p-2 hover:bg-muted rounded text-xs transition-colors text-red-400 hover:text-red-300"
              data-testid="button-disconnect"
            >
              <LogOut className="w-3 h-3" />
              <span>Disconnect</span>
            </button>
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}
