import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Send, AlertCircle, Info, DollarSign, ArrowRight, Wallet } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { useSigner } from "@ckb-ccc/connector-react";
import { PixelData } from "@/types/pixel";
import { apiRequest } from "@/lib/queryClient";
import { formatCKB } from "@/utils/formatting";
import { TRANSFER_FEE_CKB } from "@shared/canvas-utils";

interface TransferPixelDialogProps {
  pixel: PixelData | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  userAddress: string;
}

export function TransferPixelDialog({
  pixel,
  open,
  onOpenChange,
  userAddress,
}: TransferPixelDialogProps) {
  const [recipientAddress, setRecipientAddress] = useState("");
  const { toast } = useToast();
  const signer = useSigner();
  const queryClient = useQueryClient();

  const transferMutation = useMutation({
    mutationFn: async () => {
      if (!pixel || !signer) {
        throw new Error("Pixel or signer not available");
      }

      if (!recipientAddress || recipientAddress.trim().length === 0) {
        throw new Error("Please enter a recipient address");
      }

      // Validate address format (basic check - CKB addresses start with 'ckt' for testnet or 'ckb' for mainnet)
      if (!recipientAddress.startsWith('ckt') && !recipientAddress.startsWith('ckb')) {
        throw new Error("Invalid CKB address format");
      }

      // Import transfer function dynamically
      const { transferPixelSpore } = await import("@/lib/spore-transfer");

      // Get spore outpoint from pixel data
      if (!pixel.sporeId || !pixel.sporeTxHash) {
        throw new Error("Pixel missing blockchain data");
      }

      // Execute blockchain transfer using Spore SDK
      const result = await transferPixelSpore({
        signer,
        sporeId: pixel.sporeId,
        toAddress: recipientAddress.trim(),
      });

      // Update backend with transfer transaction
      await apiRequest("POST", `/api/pixels/transfer`, {
        pixelId: pixel.id,
        toAddress: recipientAddress.trim(),
        fromAddress: userAddress,
        txHash: result.txHash,
      });

      return result;
    },
    onSuccess: () => {
      toast({
        title: "Transfer Successful!",
        description: `Pixel transferred to ${recipientAddress.slice(0, 10)}...`,
        variant: "success",
      });

      // Invalidate queries to refresh data
      queryClient.invalidateQueries({ queryKey: ['/api/pixels'] });
      queryClient.invalidateQueries({ queryKey: [`/api/users/${userAddress}`] });
      queryClient.invalidateQueries({ queryKey: [`/api/users/${userAddress}/pixels`] });
      queryClient.invalidateQueries({ queryKey: ['/api/leaderboard'] });

      // Reset and close
      setRecipientAddress("");
      onOpenChange(false);
    },
    onError: (error: Error) => {
      toast({
        title: "Transfer Failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const handleTransfer = () => {
    transferMutation.mutate();
  };

  if (!pixel) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md p-3 sm:p-4 backdrop-blur-xl bg-background/95 border-2 border-primary/20" data-testid="transfer-pixel-dialog">
        <DialogHeader className="space-y-1">
          <DialogTitle className="flex items-center gap-2 text-base sm:text-lg">
            <Send className="w-4 h-4 sm:w-5 sm:h-5 text-primary" />
            Transfer Pixel
          </DialogTitle>
          <DialogDescription className="text-xs sm:text-sm">
            Transfer pixel ({pixel.x}, {pixel.y}) to another wallet
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-2 sm:space-y-3">
          {/* Pixel Preview */}
          <div className="p-2 bg-muted/30 rounded-lg">
            <div className="text-[10px] sm:text-xs text-muted-foreground mb-1">Transferring</div>
            <div className="flex items-center gap-2">
              <div 
                className="w-10 h-10 sm:w-12 sm:h-12 rounded flex items-center justify-center text-[10px] sm:text-xs font-bold border-2"
                style={{ 
                  backgroundColor: pixel.bgcolor || undefined,
                  color: pixel.textColor || undefined,
                  borderColor: pixel.bgcolor || undefined
                }}
              >
                {pixel.x},{pixel.y}
              </div>
              <div>
                <div className="font-mono font-bold">({pixel.x}, {pixel.y})</div>
                <div className="text-xs text-muted-foreground capitalize">{pixel.tier} • {formatCKB(pixel.price)}</div>
              </div>
            </div>
          </div>

          {/* Recipient Address Input */}
          <div className="space-y-2">
            <Label htmlFor="recipient-address">Recipient Address</Label>
            <Input
              id="recipient-address"
              placeholder="ckt1... or ckb1..."
              value={recipientAddress}
              onChange={(e) => setRecipientAddress(e.target.value)}
              disabled={transferMutation.isPending}
              data-testid="input-recipient-address"
            />
            <p className="text-xs text-muted-foreground flex items-center gap-1">
              <AlertCircle className="w-3 h-3" />
              Make sure the address is correct. This action cannot be undone.
            </p>
          </div>

          {/* Cost Breakdown */}
          <div className="space-y-2 p-3 bg-muted/30 rounded-lg border border-primary/20">
            <div className="flex items-center gap-2 text-xs font-semibold text-primary">
              <DollarSign className="w-4 h-4" />
              <span>Cost Breakdown</span>
            </div>
            <div className="space-y-1.5 text-xs">
              <div className="flex justify-between items-center">
                <span className="text-muted-foreground">Platform fee</span>
                <span className="font-mono font-semibold">{TRANSFER_FEE_CKB} CKB</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-muted-foreground">Network fee</span>
                <span className="font-mono font-semibold">~0.0001 CKB</span>
              </div>
              <div className="h-px bg-border my-1"></div>
              <div className="flex justify-between items-center">
                <span className="font-semibold">Total cost to you</span>
                <span className="font-mono font-bold text-primary">~{TRANSFER_FEE_CKB} CKB</span>
              </div>
            </div>
          </div>

          {/* What Recipient Gets */}
          <div className="p-2.5 bg-green-500/10 dark:bg-green-500/20 rounded-lg border border-green-500/30">
            <div className="flex items-center gap-2 text-xs">
              <ArrowRight className="w-3.5 h-3.5 text-green-600 dark:text-green-400 flex-shrink-0" />
              <div className="text-green-700 dark:text-green-300">
                <span className="font-semibold">Recipient receives:</span> Pixel + <span className="font-bold">{formatCKB(pixel.price)}</span> locked
              </div>
            </div>
          </div>

          {/* Wallet Display Warning */}
          <div className="p-2.5 bg-amber-500/10 dark:bg-amber-500/20 rounded-lg border border-amber-500/30">
            <div className="flex gap-2 text-xs">
              <Wallet className="w-4 h-4 text-amber-600 dark:text-amber-400 flex-shrink-0 mt-0.5" />
              <div className="text-amber-700 dark:text-amber-300 space-y-1">
                <div className="font-semibold">About your wallet display</div>
                <div className="text-[11px] leading-relaxed">
                  Your wallet may show <span className="font-bold">-{formatCKB(pixel.price)}</span>, but this is just the NFT moving with its locked value. <span className="font-semibold">You only pay ~{TRANSFER_FEE_CKB} CKB in fees.</span> The {formatCKB(pixel.price)} transfers to the recipient.
                </div>
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex gap-2 pt-1">
            <Button
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={transferMutation.isPending}
              className="flex-1"
              data-testid="button-cancel-transfer"
            >
              Cancel
            </Button>
            <Button
              onClick={handleTransfer}
              disabled={transferMutation.isPending || !recipientAddress.trim()}
              className="flex-1"
              data-testid="button-confirm-transfer"
            >
              {transferMutation.isPending ? "Transferring..." : "Transfer"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
