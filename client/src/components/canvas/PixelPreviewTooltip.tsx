import { PixelData } from "@/types/pixel";
import { getManhattanDistance, calculateTierFromDistance, getTierColor } from "@/lib/canvas";
import { formatDistanceToNow } from "date-fns";
import { formatCKB } from "@/utils/formatting";

interface PixelPreviewTooltipProps {
  pixel: PixelData;
  position: { x: number; y: number };
  visible: boolean;
}

// Helper function to ensure tooltip stays within viewport
function constrainToViewport(position: { x: number; y: number }, tooltipWidth: number = 200, tooltipHeight: number = 150) {
  const viewportWidth = window.innerWidth;
  const viewportHeight = window.innerHeight;
  
  let x = position.x + 10;
  let y = position.y - 10;
  
  // Adjust horizontal position if tooltip would go off-screen
  if (x + tooltipWidth > viewportWidth) {
    x = position.x - tooltipWidth - 10;
  }
  
  // Adjust vertical position if tooltip would go off-screen
  if (y - tooltipHeight < 0) {
    y = position.y + 20;
  }
  
  // Final boundary checks
  x = Math.max(10, Math.min(x, viewportWidth - tooltipWidth - 10));
  y = Math.max(10, Math.min(y, viewportHeight - tooltipHeight - 10));
  
  return { x, y };
}

export default function PixelPreviewTooltip({ pixel, position, visible }: PixelPreviewTooltipProps) {
  if (!visible) return null;

  const distance = getManhattanDistance(pixel.x, pixel.y);
  const tierColor = getTierColor(pixel.tier);
  const constrainedPosition = constrainToViewport(position, 220, 180);

  return (
    <div
      className="fixed z-50 bg-card/95 backdrop-blur-xl border border-primary/20 rounded-lg shadow-2xl shadow-primary/10 p-3 min-w-[200px] max-w-[220px] pointer-events-none transition-opacity duration-150"
      style={{
        left: `${constrainedPosition.x}px`,
        top: `${constrainedPosition.y}px`,
      }}
      data-testid="pixel-tooltip"
    >
      {/* Header with coordinates */}
      <div className="flex items-center justify-between mb-2">
        <span className="text-sm font-mono text-muted-foreground">
          ({pixel.x}, {pixel.y})
        </span>
        <div
          className="w-4 h-4 rounded border border-border/50"
          style={{ backgroundColor: pixel.claimed ? pixel.bgcolor || tierColor : tierColor }}
        />
      </div>

      {/* Tier and price */}
      <div className="space-y-1">
        <div className="flex items-center justify-between">
          <span className="text-xs text-muted-foreground">Tier:</span>
          <span 
            className="text-sm font-medium capitalize px-2 py-0.5 rounded text-black"
            style={{ backgroundColor: tierColor }}
            data-testid="tooltip-tier"
          >
            {pixel.tier}
          </span>
        </div>
        
        <div className="flex items-center justify-between">
          <span className="text-xs text-muted-foreground">Price:</span>
          <span className="text-sm font-mono font-medium" data-testid="tooltip-price">
            {formatCKB(pixel.price)}
          </span>
        </div>

        <div className="flex items-center justify-between">
          <span className="text-xs text-muted-foreground">Distance:</span>
          <span className="text-sm font-mono" data-testid="tooltip-distance">
            {distance}
          </span>
        </div>

        {/* Mint Numbers - only show if pixel has been minted */}
        {pixel.claimed && pixel.tierMintNumber && pixel.globalMintNumber && (
          <>
            <div className="flex items-center justify-between">
              <span className="text-xs text-muted-foreground">Tier Mint:</span>
              <span className="text-sm font-mono font-medium" data-testid="tooltip-tier-mint">
                #{pixel.tierMintNumber}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-xs text-muted-foreground">Global Mint:</span>
              <span className="text-sm font-mono font-medium" data-testid="tooltip-global-mint">
                #{pixel.globalMintNumber}
              </span>
            </div>
          </>
        )}

        {/* Status */}
        <div className="pt-1 mt-2 border-t border-border/50">
          {pixel.claimed ? (
            <div className="space-y-1">
              <div className="flex items-center justify-between">
                <span className="text-xs text-muted-foreground">Status:</span>
                <span className="text-xs text-green-400 font-medium">Claimed</span>
              </div>
              {pixel.claimedAt && (
                <div className="flex items-center justify-between">
                  <span className="text-xs text-muted-foreground">Claimed:</span>
                  <span className="text-xs text-muted-foreground" data-testid="tooltip-claimed-time">
                    {formatDistanceToNow(new Date(pixel.claimedAt), { addSuffix: true })}
                  </span>
                </div>
              )}
              {pixel.sporeId && (
                <div className="text-xs text-muted-foreground mt-1">
                  <span>Spore: </span>
                  <span className="font-mono">{pixel.sporeId.slice(0, 8)}...</span>
                </div>
              )}
            </div>
          ) : (
            <div className="flex items-center justify-between">
              <span className="text-xs text-muted-foreground">Status:</span>
              <span className="text-xs text-blue-400 font-medium">Available</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}