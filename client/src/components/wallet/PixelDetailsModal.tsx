import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { ExternalLink, TrendingUp, Clock, CheckCircle2, XCircle, Send, Flame } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { PixelData, Transaction } from "@/types/pixel";
import { getTierColor, getContrastingTextColor } from "@shared/canvas-utils";
import { TransferPixelDialog } from "./TransferPixelDialog";
import { MeltPixelDialog } from "./MeltPixelDialog";
import { formatCKB } from "@/utils/formatting";

interface PixelDetailsModalProps {
  pixel: PixelData | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  userAddress: string;
}

export default function PixelDetailsModal({
  pixel,
  open,
  onOpenChange,
  userAddress,
}: PixelDetailsModalProps) {
  const [transferDialogOpen, setTransferDialogOpen] = useState(false);
  const [meltDialogOpen, setMeltDialogOpen] = useState(false);
  
  const { data: pixelTransactions = [] } = useQuery<Transaction[]>({
    queryKey: [`/api/pixels/${pixel?.id}/transactions`],
    enabled: !!pixel?.id && open,
  });

  const getTransactionIcon = (type: string) => {
    switch (type) {
      case 'mint':
        return <CheckCircle2 className="w-4 h-4 text-green-400" />;
      case 'transfer':
        return <TrendingUp className="w-4 h-4 text-blue-400" />;
      case 'melt':
        return <XCircle className="w-4 h-4 text-red-400" />;
      default:
        return <Clock className="w-4 h-4 text-muted-foreground" />;
    }
  };

  const getTransactionLabel = (type: string) => {
    switch (type) {
      case 'mint': return 'Minted';
      case 'transfer': return 'Transferred';
      case 'melt': return 'Melted';
      default: return 'Unknown';
    }
  };

  const formatDate = (date: Date) => {
    return new Date(date).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const formatAddress = (addr: string) => {
    if (!addr) return "";
    return `${addr.slice(0, 6)}...${addr.slice(-4)}`;
  };

  const mintTx = pixelTransactions.find(tx => tx.type === 'mint');
  const explorerTxUrl = mintTx?.txHash 
    ? `https://pudge.explorer.nervos.org/transaction/${mintTx.txHash}`
    : null;
  
  const explorerPixelUrl = pixel?.sporeId
    ? `https://pudge.explorer.nervos.org/nft/${pixel.sporeId}`
    : null;

  if (!pixel) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent 
        className="max-w-md backdrop-blur-xl bg-background/95 border-2 border-primary/20"
        data-testid="pixel-details-modal"
      >
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <div className="w-2 h-2 bg-primary rounded-full"></div>
            <span className="text-lg font-bold">Pixel Details</span>
          </DialogTitle>
          <DialogDescription className="sr-only">
            View details for pixel ({pixel.x}, {pixel.y})
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Pixel Preview */}
          <div className="flex items-center gap-4 p-4 bg-muted/30 rounded-lg">
            <div 
              className="w-20 h-20 rounded-lg flex-shrink-0 flex items-center justify-center text-sm font-bold border-2 shadow-lg"
              style={{ 
                backgroundColor: pixel.bgcolor || getTierColor(pixel.tier),
                color: pixel.textColor || getContrastingTextColor(getTierColor(pixel.tier)),
                borderColor: pixel.bgcolor || getTierColor(pixel.tier)
              }}
              data-testid="pixel-preview-detail"
            >
              {pixel.x},{pixel.y}
            </div>
            <div className="flex-1">
              <div className="font-mono text-xl font-bold mb-1" data-testid="text-coordinates">
                ({pixel.x}, {pixel.y})
              </div>
              <div 
                className="text-xs font-bold uppercase inline-block px-2 py-1 rounded"
                style={{ 
                  backgroundColor: `${getTierColor(pixel.tier)}20`,
                  color: getTierColor(pixel.tier)
                }}
                data-testid="text-tier"
              >
                {pixel.tier}
              </div>
            </div>
          </div>

          {/* Pixel Information */}
          <div className="space-y-2 text-sm">
            <div className="flex justify-between py-2 border-b border-border/50">
              <span className="text-muted-foreground">Locked CKB</span>
              <span className="font-bold font-mono" data-testid="text-price">
                {formatCKB(pixel.price)}
              </span>
            </div>
            
            {pixel.bgcolor && (
              <div className="flex justify-between py-2 border-b border-border/50">
                <span className="text-muted-foreground">Background Color</span>
                <div className="flex items-center gap-2">
                  <div 
                    className="w-4 h-4 rounded border"
                    style={{ backgroundColor: pixel.bgcolor }}
                  />
                  <span className="font-mono text-xs" data-testid="text-bgcolor">
                    {pixel.bgcolor}
                  </span>
                </div>
              </div>
            )}

            {pixel.textColor && (
              <div className="flex justify-between py-2 border-b border-border/50">
                <span className="text-muted-foreground">Text Color</span>
                <div className="flex items-center gap-2">
                  <div 
                    className="w-4 h-4 rounded border"
                    style={{ backgroundColor: pixel.textColor }}
                  />
                  <span className="font-mono text-xs" data-testid="text-textcolor">
                    {pixel.textColor}
                  </span>
                </div>
              </div>
            )}

            {pixel.claimedAt && (
              <div className="flex justify-between py-2 border-b border-border/50">
                <span className="text-muted-foreground">Claimed</span>
                <span className="text-xs" data-testid="text-claimed-date">
                  {formatDate(pixel.claimedAt)}
                </span>
              </div>
            )}

            {pixel.sporeId && (
              <div className="flex justify-between py-2 border-b border-border/50">
                <span className="text-muted-foreground">Spore ID</span>
                <span className="font-mono text-xs" data-testid="text-spore-id">
                  {formatAddress(pixel.sporeId)}
                </span>
              </div>
            )}
          </div>

          {/* Transaction History */}
          {pixelTransactions.length > 0 && (
            <div>
              <div className="flex items-center gap-2 mb-2">
                <Clock className="w-3 h-3 text-muted-foreground" />
                <h3 className="text-xs font-semibold text-muted-foreground uppercase">Transaction History</h3>
              </div>
              <div className="space-y-1 max-h-40 overflow-y-auto">
                {pixelTransactions.map((tx) => (
                  <div
                    key={tx.id}
                    className="flex items-center justify-between p-2 bg-muted/30 rounded text-xs"
                    data-testid={`transaction-${tx.id}`}
                  >
                    <div className="flex items-center gap-2 flex-1 min-w-0">
                      {getTransactionIcon(tx.type)}
                      <div className="flex-1 min-w-0">
                        <div className="font-medium">{getTransactionLabel(tx.type)}</div>
                        <div className="text-[10px] text-muted-foreground">
                          {formatDate(tx.createdAt)}
                        </div>
                      </div>
                    </div>
                    <div className="font-mono font-bold ml-2">
                      {formatCKB(tx.amount)}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Explorer Links */}
          <div className="space-y-2">
            {explorerTxUrl && (
              <a
                href={explorerTxUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center justify-between p-2 hover:bg-muted rounded text-xs transition-colors"
                data-testid="link-explorer-tx"
              >
                <div className="flex items-center gap-2">
                  <ExternalLink className="w-3 h-3" />
                  <span>View Mint Transaction</span>
                </div>
              </a>
            )}
            
            {explorerPixelUrl && (
              <a
                href={explorerPixelUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center justify-between p-2 hover:bg-muted rounded text-xs transition-colors"
                data-testid="link-explorer-nft"
              >
                <div className="flex items-center gap-2">
                  <ExternalLink className="w-3 h-3" />
                  <span>View NFT on Explorer</span>
                </div>
              </a>
            )}

            <a
              href={`https://pudge.explorer.nervos.org/address/${userAddress}`}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center justify-between p-2 hover:bg-muted rounded text-xs transition-colors"
              data-testid="link-explorer-address"
            >
              <div className="flex items-center gap-2">
                <ExternalLink className="w-3 h-3" />
                <span>View My Address</span>
              </div>
            </a>
          </div>

          {/* Action Buttons */}
          <div className="space-y-2 pt-2 border-t border-border/50">
            <div className="grid grid-cols-2 gap-2">
              <Button
                onClick={() => setTransferDialogOpen(true)}
                variant="outline"
                className="flex items-center gap-2"
                data-testid="button-transfer"
              >
                <Send className="w-4 h-4" />
                Transfer
              </Button>
              <Button
                onClick={() => setMeltDialogOpen(true)}
                variant="outline"
                className="flex items-center gap-2 text-orange-500 hover:text-orange-600 border-orange-500/50 hover:border-orange-600"
                data-testid="button-melt"
              >
                <Flame className="w-4 h-4" />
                Melt
              </Button>
            </div>
          </div>

          {/* Close Button */}
          <Button
            onClick={() => onOpenChange(false)}
            className="w-full"
            data-testid="button-close"
          >
            Close
          </Button>
        </div>
      </DialogContent>

      {/* Transfer Dialog */}
      {pixel && (
        <TransferPixelDialog
          pixel={pixel}
          userAddress={userAddress}
          open={transferDialogOpen}
          onOpenChange={setTransferDialogOpen}
        />
      )}

      {/* Melt Dialog */}
      {pixel && (
        <MeltPixelDialog
          pixel={pixel}
          userAddress={userAddress}
          open={meltDialogOpen}
          onOpenChange={setMeltDialogOpen}
        />
      )}
    </Dialog>
  );
}
