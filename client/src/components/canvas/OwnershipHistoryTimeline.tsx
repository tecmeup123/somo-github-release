import { memo } from "react";
import { useQuery } from "@tanstack/react-query";
import { formatDistanceToNow } from "date-fns";
import { Clock, ArrowRight, Flame, Coins, Trophy } from "lucide-react";
import { formatCKB } from "@/utils/formatting";
import { Transaction } from "@shared/schema";

interface OwnershipHistoryTimelineProps {
  pixelId: string;
}

function OwnershipHistoryTimeline({ pixelId }: OwnershipHistoryTimelineProps) {
  const { data: transactions = [], isLoading } = useQuery<Transaction[]>({
    queryKey: [`/api/pixels/${pixelId}/transactions`],
  });

  if (isLoading) {
    return (
      <div className="space-y-2" data-testid="timeline-loading">
        <div className="animate-pulse space-y-2">
          <div className="h-3 bg-muted rounded w-3/4"></div>
          <div className="h-3 bg-muted rounded w-1/2"></div>
          <div className="h-3 bg-muted rounded w-2/3"></div>
        </div>
      </div>
    );
  }

  if (transactions.length === 0) {
    return (
      <div className="text-center py-4" data-testid="no-transactions">
        <Clock className="w-8 h-8 mx-auto text-muted-foreground/50 mb-2" />
        <p className="text-sm text-muted-foreground">No transaction history yet</p>
      </div>
    );
  }

  const getTransactionIcon = (type: string) => {
    switch (type) {
      case 'mint':
        return <Coins className="w-4 h-4" />;
      case 'transfer':
        return <ArrowRight className="w-4 h-4" />;
      case 'melt':
        return <Flame className="w-4 h-4" />;
      default:
        return <Clock className="w-4 h-4" />;
    }
  };

  const getTransactionColor = (type: string) => {
    switch (type) {
      case 'mint':
        return 'text-green-400';
      case 'transfer':
        return 'text-blue-400';
      case 'melt':
        return 'text-red-400';
      default:
        return 'text-muted-foreground';
    }
  };

  const getTransactionDescription = (transaction: Transaction, isFirstMint: boolean) => {
    switch (transaction.type) {
      case 'mint':
        return isFirstMint 
          ? `Original mint for ${formatCKB(transaction.amount)}`
          : `Pixel minted for ${formatCKB(transaction.amount)}`;
      case 'transfer':
        return 'Ownership transferred';
      case 'melt':
        return `Pixel melted, reclaimed ${formatCKB(transaction.amount)}`;
      default:
        return 'Unknown transaction';
    }
  };

  // Find the first mint transaction (original minter)
  const firstMintTransaction = transactions.find(t => t.type === 'mint');

  return (
    <div className="space-y-3" data-testid="ownership-timeline">
      <h4 className="text-sm font-semibold text-primary mb-3">📈 Ownership History</h4>
      
      <div className="space-y-3 max-h-48 overflow-y-auto">
        {transactions.map((transaction, index) => {
          const isFirstMint = transaction.type === 'mint' && transaction.id === firstMintTransaction?.id;
          
          return (
            <div
              key={transaction.id}
              className={`flex items-start gap-3 p-3 bg-muted/5 border rounded-lg ${
                isFirstMint ? 'border-amber-500/30 bg-amber-500/5' : 'border-muted/10'
              }`}
              data-testid={`transaction-${transaction.type}-${index}`}
            >
              {/* Timeline dot and line */}
              <div className="flex flex-col items-center">
                <div className={`w-8 h-8 rounded-full bg-background border-2 border-current flex items-center justify-center ${getTransactionColor(transaction.type)}`}>
                  {getTransactionIcon(transaction.type)}
                </div>
                {index < transactions.length - 1 && (
                  <div className="w-px h-4 bg-border mt-2"></div>
                )}
              </div>

              {/* Transaction details */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between mb-1">
                  <div className="flex items-center gap-2">
                    <span className={`text-sm font-medium ${getTransactionColor(transaction.type)}`}>
                      {transaction.type.charAt(0).toUpperCase() + transaction.type.slice(1)}
                    </span>
                    {isFirstMint && (
                      <div className="flex items-center gap-1 px-2 py-0.5 bg-amber-500/20 border border-amber-500/30 rounded-full">
                        <Trophy className="w-3 h-3 text-amber-500" />
                        <span className="text-xs font-semibold text-amber-500">Earns Governance</span>
                      </div>
                    )}
                  </div>
                  <span className="text-xs text-muted-foreground" data-testid={`transaction-time-${index}`}>
                    {formatDistanceToNow(new Date(transaction.createdAt), { addSuffix: true })}
                  </span>
                </div>
                
                <p className="text-xs text-muted-foreground mb-1">
                  {getTransactionDescription(transaction, isFirstMint)}
                </p>

              {/* Transaction hash */}
              {transaction.txHash && (
                <div className="text-xs font-mono text-muted-foreground/70">
                  <span>TX: </span>
                  <span className="select-all">{transaction.txHash.slice(0, 12)}...</span>
                </div>
              )}

              {/* User IDs for transfers */}
              {transaction.type === 'transfer' && transaction.fromUserId && transaction.toUserId && (
                <div className="flex items-center gap-2 text-xs text-muted-foreground mt-1">
                  <span className="font-mono">{transaction.fromUserId.slice(0, 6)}...</span>
                  <ArrowRight className="w-3 h-3" />
                  <span className="font-mono">{transaction.toUserId.slice(0, 6)}...</span>
                </div>
              )}
            </div>
          </div>
          );
        })}
      </div>

      {/* Timeline summary */}
      <div className="pt-3 border-t border-border/30">
        <div className="grid grid-cols-3 gap-4 text-center">
          <div>
            <div className="text-xs text-muted-foreground">Total Txns</div>
            <div className="text-sm font-bold" data-testid="total-transactions">
              {transactions.length}
            </div>
          </div>
          <div>
            <div className="text-xs text-muted-foreground">Transfers</div>
            <div className="text-sm font-bold text-blue-400">
              {transactions.filter(t => t.type === 'transfer').length}
            </div>
          </div>
          <div>
            <div className="text-xs text-muted-foreground">Melts</div>
            <div className="text-sm font-bold text-red-400">
              {transactions.filter(t => t.type === 'melt').length}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// Memoize to prevent re-renders when pixelId hasn't changed
export default memo(OwnershipHistoryTimeline);