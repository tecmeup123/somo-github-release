import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Activity, ChevronDown } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { formatCKB } from "@/utils/formatting";
import { useState } from "react";

interface Transaction {
  id: string;
  type: 'mint' | 'transfer' | 'melt';
  walletAddress: string;
  fromUserAddress?: string;
  pixelId: string;
  pixelX?: number;
  pixelY?: number;
  tier: string;
  ckbAmount: number;
  timestamp: string;
}

export default function RecentActivity() {
  const [displayLimit, setDisplayLimit] = useState(5);
  
  const { data: transactions = [] } = useQuery<Transaction[]>({
    queryKey: ['/api/transactions/recent'],
    refetchInterval: 10000,
  });

  const recentTransactions = transactions.slice(0, displayLimit);
  const hasMore = transactions.length > displayLimit;

  const getTierColor = (tier: string) => {
    if (!tier) return '#666';
    switch (tier.toLowerCase()) {
      case 'legendary': return '#DBAB00';
      case 'epic': return '#FFBDFC';
      case 'rare': return '#09D3FF';
      case 'common': return '#66C084';
      default: return '#666';
    }
  };

  const formatAddress = (address: string) => {
    if (!address) return '';
    return `${address.slice(0, 8)}...${address.slice(-6)}`;
  };

  const getActionLabel = (type: string) => {
    switch (type) {
      case 'mint':
        return { label: 'Claimed', color: 'text-green-500' };
      case 'transfer':
        return { label: 'Transferred', color: 'text-blue-500' };
      case 'melt':
        return { label: 'Burned', color: 'text-orange-500' };
      default:
        return { label: 'Activity', color: 'text-gray-500' };
    }
  };

  if (recentTransactions.length === 0) {
    return null;
  }

  return (
    <Card className="border-none shadow-md gradient-green territory-card pixel-pattern-bg" data-testid="recent-activity">
      <div className="decorative-orb-large decorative-orb-green top-0 right-0 -translate-y-1/2 translate-x-1/2" />
      <div className="pixel-corner-accent pixel-corner-bottom-left text-green-500" />
      <CardHeader className="pb-3 relative z-10">
        <div className="flex items-center gap-2">
          <div className="p-1.5 rounded-lg bg-green-500/20 border border-green-500/30">
            <Activity className="w-4 h-4 text-green-500" />
          </div>
          <CardTitle className="text-base">Latest Activity</CardTitle>
        </div>
      </CardHeader>
      <CardContent className="relative z-10">
        <div className="space-y-2 max-h-[280px] overflow-y-auto pr-1 scrollbar-thin">
          {recentTransactions.map((tx) => {
            const action = getActionLabel(tx.type);
            
            return (
              <div
                key={tx.id}
                className="flex items-center justify-between p-2.5 rounded-lg bg-muted/30 hover:bg-muted/50 transition-colors"
                data-testid={`activity-${tx.id}`}
              >
                <div className="flex items-center gap-2.5 flex-1 min-w-0">
                  <div
                    className="w-2 h-2 rounded-full flex-shrink-0"
                    style={{ backgroundColor: getTierColor(tx.tier) }}
                  />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <span className={`text-[10px] font-semibold uppercase px-1.5 py-0.5 rounded ${action.color} bg-current/10`}>
                        {action.label}
                      </span>
                      {tx.type === 'transfer' && tx.fromUserAddress && tx.walletAddress ? (
                        <p className="text-xs font-medium truncate">
                          {formatAddress(tx.fromUserAddress)} → {formatAddress(tx.walletAddress)}
                        </p>
                      ) : (
                        <p className="text-xs font-medium truncate">
                          {formatAddress(tx.walletAddress)}
                        </p>
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      <span style={{ color: getTierColor(tx.tier) }} className="font-medium">
                        {tx.tier || 'Unknown'}
                      </span>
                      {tx.pixelX !== undefined && tx.pixelY !== undefined && (
                        <>
                          {' • '}
                          ({tx.pixelX}, {tx.pixelY})
                        </>
                      )}
                      {tx.ckbAmount > 0 && (
                        <>
                          {' • '}
                          {formatCKB(tx.ckbAmount)}
                        </>
                      )}
                    </p>
                  </div>
                </div>
                <div className="text-xs text-muted-foreground whitespace-nowrap ml-2">
                  {tx.timestamp ? formatDistanceToNow(new Date(tx.timestamp), { addSuffix: true }) : 'Recently'}
                </div>
              </div>
            );
          })}
        </div>
        {hasMore && (
          <div className="mt-3 pt-3 border-t border-border/50">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setDisplayLimit(prev => prev + 5)}
              className="w-full text-xs text-muted-foreground hover:text-foreground"
              data-testid="button-load-more"
            >
              <ChevronDown className="w-3.5 h-3.5 mr-1" />
              Load More
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
