"use client";

import { useEffect, useRef } from "react";
import { renderPlantPreview } from "./GameCanvas";

interface PlantPreviewCanvasProps {
  plantType: string;
  size?: number;
}

export function PlantPreviewCanvas({ plantType, size = 54 }: PlantPreviewCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    ctx.clearRect(0, 0, size, size);
    ctx.save();
    // Draw functions are calibrated for ~80px tile size. Scale down to fit preview.
    const scale = size / 80;
    ctx.scale(scale, scale);
    // cx=40, cy=50 centers the plant in 80px space (most plants center around y+4 offset)
    renderPlantPreview(ctx, plantType, 40, 50);
    ctx.restore();
  }, [plantType, size]);

  return (
    <canvas
      ref={canvasRef}
      width={size}
      height={size}
      style={{ display: "block", flexShrink: 0 }}
    />
  );
}
