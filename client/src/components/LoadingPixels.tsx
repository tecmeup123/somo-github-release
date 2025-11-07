import React from 'react';

export default function LoadingPixels() {
  return (
    <div className="flex flex-col items-center justify-center space-y-4 p-6">
      <div className="grid grid-cols-5 gap-1">
        {Array.from({ length: 25 }).map((_, i) => (
          <div
            key={i}
            className="w-4 h-4 bg-muted loading-skeleton rounded-sm"
            style={{
              animationDelay: `${i * 0.1}s`
            }}
          />
        ))}
      </div>
      <p className="text-sm text-muted-foreground">Loading canvas...</p>
    </div>
  );
}