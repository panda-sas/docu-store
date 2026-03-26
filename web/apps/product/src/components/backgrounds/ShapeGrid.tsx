"use client";

import { useEffect, useRef } from "react";

interface ShapeGridProps {
  cellSize?: number;
  color?: [number, number, number];
  glowRadius?: number;
}

export function ShapeGrid({
  cellSize = 48,
  color = [59, 130, 246],
  glowRadius = 200,
}: ShapeGridProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const dpr = window.devicePixelRatio || 1;
    const mouse = { x: -9999, y: -9999 };
    let frame = 0;
    let t = 0;

    const resize = () => {
      canvas.width = window.innerWidth * dpr;
      canvas.height = window.innerHeight * dpr;
      canvas.style.width = `${window.innerWidth}px`;
      canvas.style.height = `${window.innerHeight}px`;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };

    const h = cellSize * 0.866;
    const [r, g, b] = color;

    const render = () => {
      t += 0.004;
      const w = window.innerWidth;
      const ht = window.innerHeight;

      ctx.clearRect(0, 0, w, ht);
      ctx.lineWidth = 0.6;

      const rows = Math.ceil(ht / h) + 2;
      const cols = Math.ceil(w / cellSize) + 2;

      for (let row = -1; row < rows; row++) {
        for (let col = -1; col < cols; col++) {
          const x = col * cellSize;
          const y = row * h;

          drawTriangle(ctx, r, g, b, x, y + h, x + cellSize / 2, y, x + cellSize, y + h, mouse, glowRadius, t, col, row);
          drawTriangle(ctx, r, g, b, x + cellSize / 2, y, x + cellSize, y + h, x + cellSize * 1.5, y, mouse, glowRadius, t, col + 0.5, row + 0.5);
        }
      }

      frame = requestAnimationFrame(render);
    };

    const onMouseMove = (e: MouseEvent) => { mouse.x = e.clientX; mouse.y = e.clientY; };
    const onMouseLeave = () => { mouse.x = -9999; mouse.y = -9999; };
    const onTouchMove = (e: TouchEvent) => {
      if (e.touches.length > 0) { mouse.x = e.touches[0].clientX; mouse.y = e.touches[0].clientY; }
    };
    const onTouchEnd = () => { mouse.x = -9999; mouse.y = -9999; };

    resize();
    render();

    window.addEventListener("resize", resize);
    window.addEventListener("mousemove", onMouseMove);
    window.addEventListener("mouseleave", onMouseLeave);
    window.addEventListener("touchmove", onTouchMove);
    window.addEventListener("touchend", onTouchEnd);

    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener("resize", resize);
      window.removeEventListener("mousemove", onMouseMove);
      window.removeEventListener("mouseleave", onMouseLeave);
      window.removeEventListener("touchmove", onTouchMove);
      window.removeEventListener("touchend", onTouchEnd);
    };
  }, [cellSize, color, glowRadius]);

  return <canvas ref={canvasRef} className="pointer-events-none fixed inset-0" />;
}

function drawTriangle(
  ctx: CanvasRenderingContext2D,
  r: number, g: number, b: number,
  x1: number, y1: number,
  x2: number, y2: number,
  x3: number, y3: number,
  mouse: { x: number; y: number },
  glowRadius: number,
  t: number,
  col: number, row: number,
) {
  const cx = (x1 + x2 + x3) / 3;
  const cy = (y1 + y2 + y3) / 3;
  const dist = Math.hypot(cx - mouse.x, cy - mouse.y);
  const wave = Math.sin(t + col * 0.4 + row * 0.6) * 0.025;
  const base = 0.04 + wave;
  const hover = dist < glowRadius ? (1 - dist / glowRadius) ** 2 * 0.5 : 0;
  const opacity = Math.max(0.01, Math.min(1, base + hover));

  ctx.beginPath();
  ctx.moveTo(x1, y1);
  ctx.lineTo(x2, y2);
  ctx.lineTo(x3, y3);
  ctx.closePath();

  if (hover > 0.02) {
    ctx.fillStyle = `rgba(${r}, ${g}, ${b}, ${hover * 0.18})`;
    ctx.fill();
  }

  ctx.strokeStyle = `rgba(${r}, ${g}, ${b}, ${opacity})`;
  ctx.stroke();
}
