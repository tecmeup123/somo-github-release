export const ZOOM_LEVELS = [
  { level: 1, scale: 'zoom-1', label: '1x' },
  { level: 2, scale: 'zoom-2', label: '1.5x' },
  { level: 3, scale: 'zoom-3', label: '2x' },
  { level: 4, scale: 'zoom-4', label: '3x' },
] as const;

export const CANVAS_CONFIG = {
  GRID_SIZE: 50,
  TOTAL_PIXELS: 2500,
  REFETCH_INTERVAL: {
    PIXELS: 60000, // Rely on WebSocket for updates - 60 seconds
    STATS: 60000,  // Rely on WebSocket for updates - 60 seconds
  },
  STALE_TIME: {
    PIXELS: 50000, // Increased stale time - data stays fresh longer
    STATS: 50000,  // Increased stale time - data stays fresh longer
  },
} as const;

export const TIER_COLORS = {
  legendary: "linear-gradient(45deg, #FFD700, #FFA500)",
  epic: "linear-gradient(45deg, #9333EA, #7C3AED)",
  rare: "linear-gradient(45deg, #3B82F6, #2563EB)",
  common: "linear-gradient(45deg, #6B7280, #4B5563)",
} as const;