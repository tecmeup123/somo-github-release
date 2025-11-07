import { useState } from "react";
import { PixelData } from "@/types/pixel";
import { usePixelData } from "@/hooks/usePixelData";
import { ZOOM_LEVELS } from "@/constants/canvas";
import { Skeleton } from "@/components/ui/skeleton";
import ZoomControls from "./ZoomControls";
import PixelGrid from "./PixelGrid";
import TierLegend from "./TierLegend";

interface PixelCanvasProps {
  onPixelSelect: (pixel: PixelData) => void;
  selectedPixel?: PixelData | null;
}

export default function PixelCanvas({ onPixelSelect, selectedPixel }: PixelCanvasProps) {
  const [zoom, setZoom] = useState(1);
  const { pixels, stats, isLoadingPixels } = usePixelData();

  const handleZoomChange = (newZoom: number) => {
    setZoom(newZoom);
  };

  const handlePixelClick = (pixel: PixelData) => {
    onPixelSelect(pixel);
  };

  return (
    <div className="bg-gradient-to-br from-primary/15 via-primary/8 to-primary/5 border-2 border-primary/30 rounded-lg p-6 shadow-lg shadow-primary/10 relative overflow-hidden" data-testid="canvas-section">
      <div className="absolute top-0 right-0 w-20 h-20 bg-primary/5 rounded-full -translate-y-10 translate-x-10"></div>
      <div className="relative z-10">
      
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-6 md:mb-8 gap-4">
          <div className="flex items-center gap-3">
            <div className="w-2 h-2 bg-primary rounded-full animate-pulse"></div>
            <h2 className="text-xl md:text-2xl font-bold font-display text-primary uppercase tracking-wide" data-testid="title-canvas">
              Pixel Canvas
            </h2>
            
          </div>
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 sm:gap-4 w-full sm:w-auto">
            <ZoomControls 
              zoom={zoom}
              onZoomChange={handleZoomChange}
              zoomLevels={ZOOM_LEVELS}
            />
            <div className="text-sm md:text-base font-mono text-primary">
              <span className="text-muted-foreground">REMAINING:</span>
              <span className="ml-2 font-bold" data-testid="text-pixels-remaining">
                {(stats as any)?.remainingPixels?.toLocaleString() || 2500}
              </span>
            </div>
          </div>
        </div>
      
        {!selectedPixel && !isLoadingPixels && (
          <div className="mb-4 p-3 bg-accent/10 border border-accent/20 rounded-lg">
            <div className="flex items-center gap-2">
              <div className="text-accent text-sm">🎯</div>
              <p className="text-sm text-accent font-medium">
                Click any pixel to select it and start claiming!
              </p>
            </div>
          </div>
        )}
        
        {isLoadingPixels ? (
          <div className="relative" style={{ aspectRatio: '1 / 1', maxWidth: '600px', margin: '0 auto' }}>
            <Skeleton className="w-full h-full rounded-lg" />
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-3">
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 bg-primary rounded-full animate-pulse"></div>
                <p className="text-sm text-muted-foreground">Loading 50x50 pixel canvas...</p>
              </div>
            </div>
          </div>
        ) : (
          <PixelGrid 
            pixels={pixels}
            zoom={zoom}
            selectedPixel={selectedPixel}
            onPixelClick={handlePixelClick}
          />
        )}
        
        <TierLegend />
      </div>
    </div>
  );
}