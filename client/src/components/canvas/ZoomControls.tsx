interface ZoomControlsProps {
  zoom: number;
  onZoomChange: (level: number) => void;
  zoomLevels: readonly { level: number; scale: string; label: string }[];
}

export default function ZoomControls({ zoom, onZoomChange, zoomLevels }: ZoomControlsProps) {
  return (
    <div className="flex items-center space-x-3">
      <span className="text-sm font-mono text-white tracking-wider">ZOOM</span>
      <div className="flex bg-muted/50 rounded-lg p-1 border border-border/50">
        {zoomLevels.map((level) => (
          <button
            key={level.level}
            onClick={() => onZoomChange(level.level)}
            className={`px-4 py-2 text-sm rounded-md transition-all duration-300 min-h-[40px] min-w-[50px] flex items-center justify-center font-bold ${
              zoom === level.level
                ? 'cyber-button'
                : 'text-white/90 hover:bg-primary/20 hover:text-white active:bg-primary/30 bg-gray-700/50 border border-gray-600/50'
            }`}
            data-testid={`button-zoom-${level.label}`}
          >
            {level.label}
          </button>
        ))}
      </div>
    </div>
  );
}