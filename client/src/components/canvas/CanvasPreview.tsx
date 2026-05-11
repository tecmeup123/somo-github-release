import { useEffect, useRef } from "react";
import { getManhattanDistance, calculateTierFromDistance } from "@shared/canvas-utils";

const GRID = 50;

const TIER_BG: Record<string, string> = {
  legendary: "rgba(219,171,0,0.16)",
  epic:      "rgba(255,189,252,0.12)",
  rare:      "rgba(9,211,255,0.10)",
  common:    "rgba(102,192,132,0.08)",
};

const CLAIM_RATE: Record<string, number> = {
  legendary: 0.74,
  epic:      0.58,
  rare:      0.38,
  common:    0.16,
};

const COLORS = [
  "#09D3FF","#FFBDFC","#DBAB00","#66C084",
  "#FF7A59","#A78BFA","#F472B6","#60A5FA",
  "#34D399","#FB923C",
];

function mulberry32(seed: number) {
  return () => {
    let t = (seed += 0x6d2b79f5);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

interface CanvasPreviewProps {
  className?: string;
}

export default function CanvasPreview({ className }: CanvasPreviewProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const RES = 480;
    canvas.width = RES;
    canvas.height = RES;
    const cell = RES / GRID;
    const rng = mulberry32(20260511);

    // Tier background rings
    for (let y = 0; y < GRID; y++) {
      for (let x = 0; x < GRID; x++) {
        const tier = calculateTierFromDistance(getManhattanDistance(x, y));
        ctx.fillStyle = TIER_BG[tier];
        ctx.fillRect(x * cell, y * cell, cell, cell);
      }
    }

    // Claimed pixels (seeded, stable)
    for (let y = 0; y < GRID; y++) {
      for (let x = 0; x < GRID; x++) {
        const tier = calculateTierFromDistance(getManhattanDistance(x, y));
        const r = rng();
        if (r < CLAIM_RATE[tier]) {
          ctx.fillStyle = COLORS[Math.floor(rng() * COLORS.length)];
          ctx.fillRect(x * cell + 0.5, y * cell + 0.5, cell - 1, cell - 1);
        } else {
          rng(); // keep rng state consistent
        }
      }
    }

    // Subtle grid lines every 5 cells
    ctx.strokeStyle = "rgba(255,255,255,0.04)";
    ctx.lineWidth = 0.5;
    for (let i = 0; i <= GRID; i += 5) {
      ctx.beginPath();
      ctx.moveTo(i * cell, 0);
      ctx.lineTo(i * cell, RES);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(0, i * cell);
      ctx.lineTo(RES, i * cell);
      ctx.stroke();
    }
  }, []);

  return (
    <div style={{ width: "100%", aspectRatio: "1/1" }}>
      <canvas
        ref={canvasRef}
        style={{ display: "block", width: "100%", height: "100%", borderRadius: 4 }}
        className={className}
      />
    </div>
  );
}
