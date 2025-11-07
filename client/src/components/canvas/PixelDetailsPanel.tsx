import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { PixelData } from "@/types/pixel";
import { formatPixelText, getTierDisplayName } from "@/lib/canvas";
import { formatCKB } from "@/utils/formatting";
import { useState } from "react";

interface PixelDetailsPanelProps {
  pixel: PixelData | null;
}

export default function PixelDetailsPanel({ pixel }: PixelDetailsPanelProps) {
  const [transferAddress, setTransferAddress] = useState("");
  const [userAddress] = useState("0x891a...742d"); // Mock connected wallet
  
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const transferMutation = useMutation({
    mutationFn: async (data: { pixelId: string; toAddress: string; fromAddress: string }) => {
      const response = await apiRequest('POST', '/api/pixels/transfer', data);
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Pixel Transferred!",
        description: `Successfully transferred pixel to ${transferAddress}`,
        variant: "success",
      });
      setTransferAddress("");
      queryClient.invalidateQueries({ queryKey: ['/api/pixels'] });
      queryClient.invalidateQueries({ queryKey: ['/api/stats'] });
    },
    onError: (error: any) => {
      toast({
        title: "Transfer Failed",
        description: error.message || "Failed to transfer pixel",
        variant: "destructive",
      });
    },
  });

  const burnMutation = useMutation({
    mutationFn: async (data: { pixelId: string; userAddress: string }) => {
      const response = await apiRequest('POST', '/api/pixels/burn', data);
      return response.json();
    },
    onSuccess: (data) => {
      toast({
        title: "Pixel Melted!",
        description: `Successfully melted pixel and reclaimed ${formatCKB(data.reclaimedCkb)}`,
        variant: "success",
      });
      queryClient.invalidateQueries({ queryKey: ['/api/pixels'] });
      queryClient.invalidateQueries({ queryKey: ['/api/stats'] });
    },
    onError: (error: any) => {
      toast({
        title: "Melt Failed",
        description: error.message || "Failed to melt pixel",
        variant: "destructive",
      });
    },
  });

  const handleTransfer = () => {
    if (!pixel || !transferAddress.trim()) return;
    
    transferMutation.mutate({
      pixelId: pixel.id,
      toAddress: transferAddress.trim(),
      fromAddress: userAddress,
    });
  };

  const handleBurn = () => {
    if (!pixel) return;
    
    burnMutation.mutate({
      pixelId: pixel.id,
      userAddress,
    });
  };

  const isOwner = pixel?.ownerId && userAddress;

  return (
    <div className="bg-card border border-border/60 rounded-lg p-5 relative" data-testid="details-panel">
      <div className="flex items-center gap-2 mb-5">
        <div className="w-1.5 h-1.5 bg-secondary rounded-full"></div>
        <h3 className="text-lg font-semibold font-display text-secondary/90">Selected Pixel</h3>
      </div>
      
      {pixel ? (
        <div className="space-y-4">
          <div className="text-center">
            <div 
              className="aspect-square w-20 h-20 mx-auto border-2 rounded-xl flex items-center justify-center shadow-sm"
              style={{ 
                backgroundColor: pixel.claimed ? pixel.bgcolor || '#1E293B' : '#1E293B',
                color: pixel.claimed ? pixel.textColor || '#FFFFFF' : '#6B7280',
                borderColor: pixel.claimed ? pixel.bgcolor || '#1E293B' : 'hsl(var(--border))'
              }}
              data-testid="pixel-preview"
            >
              {pixel.claimed && (
                <span className="text-[7px] font-bold text-center leading-none">
                  {pixel.x},{pixel.y}
                </span>
              )}
            </div>
          </div>
          
          <div className="text-center space-y-2">
            <div className="font-mono text-lg font-bold" data-testid="text-coordinates">
              ({pixel.x}, {pixel.y})
            </div>
            <div className={`tier-badge ${pixel.tier}-badge inline-block`} data-testid="text-tier">
              {getTierDisplayName(pixel.tier)}
            </div>
          </div>
          
          <div className="space-y-3 text-sm bg-muted/30 rounded-lg p-4">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Status</span>
              <span data-testid="text-status">
                {pixel.claimed ? 'Claimed' : 'Available'}
              </span>
            </div>
            {pixel.claimed && (
              <>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Owner</span>
                  <span className="font-mono text-xs" data-testid="text-owner">
                    {pixel.ownerId?.substring(0, 8)}...
                  </span>
                </div>
                {pixel.tierMintNumber && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Tier Mint #</span>
                    <span className="font-mono font-bold text-primary" data-testid="text-tier-mint">
                      #{pixel.tierMintNumber}
                    </span>
                  </div>
                )}
                {pixel.globalMintNumber && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Global Mint #</span>
                    <span className="font-mono font-bold text-primary" data-testid="text-global-mint">
                      #{pixel.globalMintNumber}
                    </span>
                  </div>
                )}
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Background</span>
                  <span className="font-mono text-xs" data-testid="text-bgcolor">
                    {pixel.bgcolor}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Text Color</span>
                  <span className="font-mono text-xs" data-testid="text-textcolor">
                    {pixel.textColor}
                  </span>
                </div>
              </>
            )}
            <div className="flex justify-between">
              <span className="text-muted-foreground">Locked CKB</span>
              <span className="font-bold" data-testid="text-value">
                {formatCKB(pixel.price)}
              </span>
            </div>
          </div>
          
          {isOwner && pixel.claimed && (
            <div className="pt-3 border-t border-border space-y-3">
              <div className="space-y-2">
                <Label htmlFor="transfer-address" className="text-sm">Transfer To Address</Label>
                <Input
                  id="transfer-address"
                  value={transferAddress}
                  onChange={(e) => setTransferAddress(e.target.value)}
                  placeholder="0x..."
                  className="w-full"
                  data-testid="input-transfer-address"
                />
              </div>
              
              <div className="space-y-2">
                <Button
                  onClick={handleTransfer}
                  disabled={!transferAddress.trim() || transferMutation.isPending}
                  variant="secondary"
                  className="w-full text-sm font-medium"
                  data-testid="button-transfer-pixel"
                >
                  {transferMutation.isPending ? "Transferring..." : "Transfer Pixel"}
                </Button>
                
                <Button
                  onClick={handleBurn}
                  disabled={burnMutation.isPending}
                  variant="destructive"
                  className="w-full text-sm font-medium"
                  data-testid="button-melt-pixel"
                >
                  {burnMutation.isPending ? "Melting..." : "Melt Pixel (Reclaim CKB)"}
                </Button>
              </div>
            </div>
          )}
        </div>
      ) : (
        <div className="text-center py-8 space-y-4" data-testid="no-selection">
          <div className="w-16 h-16 mx-auto bg-muted/30 rounded-xl border-2 border-dashed border-muted-foreground/30 flex items-center justify-center">
            <div className="text-2xl">🕲️</div>
          </div>
          <div className="space-y-2">
            <p className="text-muted-foreground font-medium">No pixel selected</p>
            <p className="text-xs text-muted-foreground leading-relaxed">
              Click on the canvas above to select a pixel and view its details, ownership, and trading options.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
