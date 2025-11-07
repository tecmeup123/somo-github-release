import { useState, useEffect } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useToast } from "@/hooks/use-toast";
import { useSigner } from "@ckb-ccc/connector-react";
import { ccc } from "@ckb-ccc/core";
import { Flame, AlertTriangle, Loader2, Info } from "lucide-react";
import type { PixelData } from "@/types/pixel";
import { apiRequest } from "@/lib/queryClient";
import { formatCKB } from "@/utils/formatting";
import { MELT_FEE_CKB } from "@shared/canvas-utils";
import { meltPixelSpore } from "@/lib/spore-melt";

interface MeltPixelDialogProps {
  pixel: PixelData;
  userAddress: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function MeltPixelDialog({
  pixel,
  userAddress,
  open,
  onOpenChange,
}: MeltPixelDialogProps) {
  const { toast } = useToast();
  const signer = useSigner();
  const queryClient = useQueryClient();
  const [confirmed, setConfirmed] = useState(false);

  // Reset confirmed state when dialog opens/closes
  useEffect(() => {
    if (!open) {
      setConfirmed(false);
    }
  }, [open]);

  // Fetch the actual cell capacity from blockchain
  const { data: cellCapacity, isLoading: isLoadingCapacity } = useQuery({
    queryKey: ['spore-cell-capacity', pixel.sporeId, pixel.sporeTxHash],
    queryFn: async () => {
      if (!signer || !signer.client || !pixel.sporeTxHash || !pixel.sporeId) {
        return null;
      }

      const client = signer.client;
      
      // Fetch the live spore cell
      const sporeCell = await client.getCellLive({
        txHash: pixel.sporeTxHash,
        index: 0,
      });

      if (!sporeCell) {
        throw new Error("Spore cell not found on blockchain");
      }

      // Return capacity in CKB (convert from shannons)
      const capacityInShannons = sporeCell.cellOutput.capacity;
      const capacityInCKB = Number(capacityInShannons) / 100_000_000;
      
      return {
        shannons: capacityInShannons,
        ckb: capacityInCKB,
      };
    },
    enabled: open && !!signer && !!signer.client && !!pixel.sporeTxHash && !!pixel.sporeId,
    staleTime: 30000, // Cache for 30 seconds
  });

  const meltMutation = useMutation({
    mutationFn: async () => {
      console.log("[MeltPixelDialog] Mutation started");
      
      if (!signer || !signer.client) {
        console.error("[MeltPixelDialog] No signer or client in mutation");
        throw new Error("Wallet not fully initialized");
      }

      // Get spore outpoint from pixel data
      if (!pixel.sporeId || !pixel.sporeTxHash) {
        console.error("[MeltPixelDialog] Missing blockchain data", { 
          sporeId: pixel.sporeId, 
          sporeTxHash: pixel.sporeTxHash 
        });
        throw new Error("Pixel missing blockchain data");
      }

      console.log("[MeltPixelDialog] Executing blockchain melt", {
        sporeId: pixel.sporeId,
        txHash: pixel.sporeTxHash,
      });

      // Execute blockchain melt using CCC SDK
      const result = await meltPixelSpore({
        signer,
        sporeId: pixel.sporeId,
      });

      console.log("[MeltPixelDialog] Blockchain melt successful", { txHash: result.txHash });

      // Update backend with melt transaction
      await apiRequest("POST", `/api/pixels/burn`, {
        pixelId: pixel.id,
        userAddress,
        txHash: result.txHash,
      });

      console.log("[MeltPixelDialog] Backend updated successfully");

      return result;
    },
    onSuccess: (result) => {
      // Calculate net reclaimed amount (after 150 CKB fee deduction)
      const totalCapacity = Number(result.reclaimedCapacity) / 100_000_000;
      const netReclaimed = totalCapacity - MELT_FEE_CKB;
      toast({
        title: "Pixel melted successfully",
        description: `Reclaimed ${netReclaimed.toFixed(2)} CKB (${totalCapacity.toFixed(2)} CKB - ${MELT_FEE_CKB} CKB fee)`,
        variant: "success",
      });
      
      // Invalidate queries to refresh data
      queryClient.invalidateQueries({ queryKey: ['/api/pixels'] });
      queryClient.invalidateQueries({ queryKey: [`/api/users/${userAddress}`] });
      queryClient.invalidateQueries({ queryKey: [`/api/users/${userAddress}/pixels`] });
      queryClient.invalidateQueries({ queryKey: ['/api/leaderboard'] });
      
      onOpenChange(false);
      setConfirmed(false);
    },
    onError: (error) => {
      console.error("Melt error:", error);
      toast({
        title: "Melt failed",
        description: error instanceof Error ? error.message : "Unknown error",
        variant: "destructive",
      });
    },
  });

  const handleMelt = () => {
    console.log("[MeltPixelDialog] Button clicked", { confirmed, hasSigner: !!signer, hasClient: !!(signer?.client) });
    
    // Validate signer is connected and client is ready
    if (!signer || !signer.client) {
      console.error("[MeltPixelDialog] No signer or client available");
      toast({
        title: "Wallet not ready",
        description: "Please ensure your wallet is connected and initialized",
        variant: "destructive",
      });
      return;
    }

    // First click: show confirmation
    if (!confirmed) {
      console.log("[MeltPixelDialog] Setting confirmed to true");
      setConfirmed(true);
      return;
    }
    
    // Second click: execute melt
    console.log("[MeltPixelDialog] Executing melt mutation");
    meltMutation.mutate();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md p-3 sm:p-4">
        <DialogHeader className="space-y-1">
          <DialogTitle className="flex items-center gap-2 text-base sm:text-lg">
            <Flame className="w-4 h-4 sm:w-5 sm:h-5 text-orange-500" />
            Melt Pixel
          </DialogTitle>
          <DialogDescription className="text-xs sm:text-sm">
            Destroy this Spore NFT and reclaim locked CKBytes
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-2 sm:space-y-3">
          {/* Pixel Preview */}
          <div className="p-2 bg-muted/30 rounded-lg">
            <div className="text-[10px] sm:text-xs text-muted-foreground mb-1">Melting</div>
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
                <div className="font-medium">Position: ({pixel.x}, {pixel.y})</div>
                <div className="text-sm text-muted-foreground capitalize">Tier: {pixel.tier}</div>
              </div>
            </div>
          </div>

          {/* CKB Reclaim Amount */}
          <div className="space-y-2">
            <div className="p-2 sm:p-3 bg-green-500/10 dark:bg-green-500/20 rounded-lg border border-green-500/20">
              <div className="text-xs text-muted-foreground mb-1">You will reclaim</div>
              {isLoadingCapacity ? (
                <div className="flex items-center gap-2 text-green-600 dark:text-green-400">
                  <Loader2 className="w-5 h-5 animate-spin" />
                  <span className="text-lg">Fetching from blockchain...</span>
                </div>
              ) : cellCapacity ? (
                <>
                  <div className="text-2xl font-bold text-green-600 dark:text-green-400">
                    {(cellCapacity.ckb - MELT_FEE_CKB).toFixed(2)} CKB
                  </div>
                  <div className="text-xs text-muted-foreground mt-1">
                    {cellCapacity.ckb.toFixed(2)} CKB total - {MELT_FEE_CKB} CKB fee
                  </div>
                </>
              ) : (
                <>
                  <div className="text-2xl font-bold text-green-600 dark:text-green-400">
                    {formatCKB(pixel.price - MELT_FEE_CKB)}
                  </div>
                  <div className="text-xs text-muted-foreground mt-1">
                    {formatCKB(pixel.price)} - {MELT_FEE_CKB} CKB fee
                  </div>
                </>
              )}
            </div>

            {/* Melt Fee Notice */}
            <div className="p-2 bg-orange-500/10 dark:bg-orange-500/20 rounded-lg border border-orange-500/20">
              <div className="flex items-center gap-1.5 text-orange-600 dark:text-orange-400">
                <Info className="w-3 h-3 sm:w-4 sm:h-4 flex-shrink-0" />
                <div className="text-xs sm:text-sm">
                  <span className="font-semibold">{MELT_FEE_CKB} CKB</span> fee will be deducted
                </div>
              </div>
            </div>
          </div>

          {/* Warning Alert */}
          <Alert variant="destructive" className="py-2">
            <AlertTriangle className="h-3 w-3 sm:h-4 sm:w-4" />
            <AlertDescription className="text-xs sm:text-sm">
              This action is permanent. The Spore NFT will be destroyed forever.
            </AlertDescription>
          </Alert>

          {/* Confirmation Checkbox */}
          {!confirmed && (
            <div className="text-xs text-muted-foreground">
              Click "Confirm Melt" to proceed
            </div>
          )}
        </div>

        <DialogFooter className="flex-col sm:flex-row gap-2 pt-1">
          <Button
            variant="outline"
            onClick={() => {
              onOpenChange(false);
              setConfirmed(false);
            }}
            disabled={meltMutation.isPending}
            data-testid="button-cancel-melt"
          >
            Cancel
          </Button>
          <Button
            variant={confirmed ? "destructive" : "default"}
            onClick={handleMelt}
            disabled={meltMutation.isPending}
            data-testid="button-confirm-melt"
          >
            {meltMutation.isPending ? (
              <>
                <Flame className="w-4 h-4 mr-2 animate-pulse" />
                Melting...
              </>
            ) : confirmed ? (
              <>
                <Flame className="w-4 h-4 mr-2" />
                Confirm & Melt
              </>
            ) : (
              "Confirm Melt"
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
