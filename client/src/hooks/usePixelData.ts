import { useQuery } from "@tanstack/react-query";
import { PixelData } from "@/types/pixel";
import { useWebSocketMessage } from "@/contexts/WebSocketContext";
import { CANVAS_CONFIG } from "@/constants/canvas";
import { useCallback } from "react";

export function usePixelData() {
  const { data: pixels = [], refetch, isLoading: isLoadingPixels } = useQuery<PixelData[]>({
    queryKey: ['/api/pixels'],
    refetchInterval: CANVAS_CONFIG.REFETCH_INTERVAL.PIXELS,
    staleTime: CANVAS_CONFIG.STALE_TIME.PIXELS,
  });

  const { data: stats, isLoading: isLoadingStats } = useQuery({
    queryKey: ['/api/stats'],
    refetchInterval: CANVAS_CONFIG.REFETCH_INTERVAL.STATS,
    staleTime: CANVAS_CONFIG.STALE_TIME.STATS,
  });

  const handleWebSocketMessage = useCallback((message: any) => {
    if (message.type === 'pixelClaimed' || message.type === 'pixelTransferred' || message.type === 'pixelMelted') {
      refetch();
    }
  }, [refetch]);

  useWebSocketMessage(handleWebSocketMessage);

  return { pixels, stats, isLoadingPixels, isLoadingStats };
}