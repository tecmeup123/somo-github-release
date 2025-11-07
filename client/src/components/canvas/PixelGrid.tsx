import { useRef, useMemo, useState, useCallback, useEffect } from "react";
import { PixelData } from "@/types/pixel";
import PinchZoomWrapper from "./PinchZoomWrapper";
import PixelPreviewTooltip from "./PixelPreviewTooltip";
import { getTierColor } from "@/lib/canvas";
import { useDebounce } from "@/hooks/useDebounce";
import { useWebSocketMessage, WebSocketMessage } from "@/contexts/WebSocketContext";

interface PixelGridProps {
  pixels: PixelData[];
  zoom: number;
  selectedPixel?: PixelData | null;
  onPixelClick: (pixel: PixelData) => void;
}

export default function PixelGrid({ pixels, zoom, selectedPixel, onPixelClick }: PixelGridProps) {
  const canvasRef = useRef<HTMLDivElement>(null);
  const [hoveredPixel, setHoveredPixel] = useState<PixelData | null>(null);
  const [tooltipPosition, setTooltipPosition] = useState({ x: 0, y: 0 });
  const [justClaimedPixels, setJustClaimedPixels] = useState<Set<string>>(new Set());
  
  // Debounce tooltip position to reduce repaints (100ms delay)
  const debouncedTooltipPosition = useDebounce(tooltipPosition, 100);

  // WebSocket message handler for claim animations
  useWebSocketMessage(useCallback((message: WebSocketMessage) => {
    if (message.type === 'pixelClaimed' && message.pixel?.id) {
      const pixelId = message.pixel.id;
      
      // Add to just-claimed set
      setJustClaimedPixels(prev => new Set(prev).add(pixelId));
      
      // Remove after animation completes (3 seconds = 2 iterations of 1.5s animation)
      setTimeout(() => {
        setJustClaimedPixels(prev => {
          const next = new Set(prev);
          next.delete(pixelId);
          return next;
        });
      }, 3000);
    }
  }, []));

  // Create lookup map for fast pixel access
  const pixelMap = useMemo(() => {
    const map = new Map<string, PixelData>();
    pixels.forEach(pixel => map.set(pixel.id, pixel));
    return map;
  }, [pixels]);

  // Event delegation handlers
  const handleGridClick = useCallback((e: React.MouseEvent) => {
    const pixelElement = (e.target as HTMLElement).closest('.pixel');
    if (pixelElement) {
      const pixelId = pixelElement.getAttribute('data-pixel-id');
      if (pixelId) {
        const pixel = pixelMap.get(pixelId);
        if (pixel) onPixelClick(pixel);
      }
    }
  }, [pixelMap, onPixelClick]);

  const handleGridMouseMove = useCallback((e: React.MouseEvent) => {
    const pixelElement = (e.target as HTMLElement).closest('.pixel');
    if (pixelElement) {
      const pixelId = pixelElement.getAttribute('data-pixel-id');
      if (pixelId) {
        const pixel = pixelMap.get(pixelId);
        if (pixel && pixel.id !== hoveredPixel?.id) {
          setHoveredPixel(pixel);
        }
        setTooltipPosition({ x: e.clientX, y: e.clientY });
      }
    } else if (hoveredPixel) {
      setHoveredPixel(null);
    }
  }, [pixelMap, hoveredPixel]);

  const handleGridMouseLeave = useCallback(() => {
    setHoveredPixel(null);
  }, []);

  // Memoize pixel rendering - now without individual event listeners
  const pixelElements = useMemo(() => {
    // Determine territory highlight: show all pixels from same owner when hovering claimed pixel
    const territoryOwnerId = hoveredPixel?.claimed ? hoveredPixel.ownerId : null;
    
    return pixels.map((pixel) => {
      const tierColor = getTierColor(pixel.tier);
      const isHovered = hoveredPixel?.id === pixel.id;
      const isSelected = selectedPixel?.id === pixel.id;
      const isJustClaimed = justClaimedPixels.has(pixel.id);
      const isTerritoryHighlight = territoryOwnerId && pixel.ownerId === territoryOwnerId && pixel.id !== hoveredPixel?.id;
      
      // Determine the background color for visual preview
      const backgroundColor = pixel.claimed 
        ? pixel.bgcolor || '#1E293B'
        : isHovered 
          ? `${tierColor}80` // Semi-transparent tier color on hover (80 = 50% opacity)
          : undefined;

      return (
        <div
          key={pixel.id}
          data-pixel-id={pixel.id}
          className={`pixel ${pixel.tier} ${pixel.claimed ? 'claimed' : 'unclaimed'} ${
            isSelected ? 'selected' : ''
          } ${isHovered ? 'hovered' : ''} ${
            isJustClaimed ? 'just-claimed' : ''
          } ${
            isTerritoryHighlight ? 'territory-highlight' : ''
          } transition-colors duration-200 ease-in-out cursor-pointer`}
          style={{ backgroundColor }}
          data-testid={`pixel-${pixel.x}-${pixel.y}`}
        />
      );
    });
  }, [pixels, selectedPixel, hoveredPixel, justClaimedPixels]);

  return (
    <>
      <PinchZoomWrapper className="canvas-container responsive-canvas-container border border-border rounded-lg flex items-center justify-center">
        <div 
          ref={canvasRef}
          className={`pixel-grid canvas-zoom zoom-${zoom}`}
          onClick={handleGridClick}
          onMouseMove={handleGridMouseMove}
          onMouseLeave={handleGridMouseLeave}
          data-testid="pixel-grid"
        >
          {pixelElements}
        </div>
      </PinchZoomWrapper>
      
      {/* Tooltip - uses debounced position to reduce repaints */}
      {hoveredPixel && (
        <PixelPreviewTooltip
          pixel={hoveredPixel}
          position={debouncedTooltipPosition}
          visible={true}
        />
      )}
    </>
  );
}