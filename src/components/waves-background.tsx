"use client";

import { useEffect, useRef } from "react";

/*
 * Flowing line-field background, adapted from the "Waves" canvas demo in
 * D:/Animations (Background Animations/5). Changes for low-end phones:
 * - DPR capped at 1, ~30 fps cap, wider line spacing
 * - pauses when off-screen or the tab is hidden
 * - one static frame for prefers-reduced-motion or Data Saver
 * - decorative only: aria-hidden, no pointer capture
 */

const GRAD3 = [
  [1, 1], [-1, 1], [1, -1], [-1, -1], [1, 0], [-1, 0], [1, 0], [-1, 0], [0, 1], [0, -1], [0, 1], [0, -1],
] as const;

const PERM_BASE = [
  151, 160, 137, 91, 90, 15, 131, 13, 201, 95, 96, 53, 194, 233, 7, 225, 140, 36, 103, 30, 69, 142, 8, 99, 37, 240,
  21, 10, 23, 190, 6, 148, 247, 120, 234, 75, 0, 26, 197, 62, 94, 252, 219, 203, 117, 35, 11, 32, 57, 177, 33, 88,
  237, 149, 56, 87, 174, 20, 125, 136, 171, 168, 68, 175, 74, 165, 71, 134, 139, 48, 27, 166, 77, 146, 158, 231, 83,
  111, 229, 122, 60, 211, 133, 230, 220, 105, 92, 41, 55, 46, 245, 40, 244, 102, 143, 54, 65, 25, 63, 161, 1, 216, 80,
  73, 209, 76, 132, 187, 208, 89, 18, 169, 200, 196, 135, 130, 116, 188, 159, 86, 164, 100, 109, 198, 173, 186, 3, 64,
  52, 217, 226, 250, 124, 123, 5, 202, 38, 147, 118, 126, 255, 82, 85, 212, 207, 206, 59, 227, 47, 16, 58, 17, 182,
  189, 28, 42, 223, 183, 170, 213, 119, 248, 152, 2, 44, 154, 163, 70, 221, 153, 101, 155, 167, 43, 172, 9, 129, 22,
  39, 253, 19, 98, 108, 110, 79, 113, 224, 232, 178, 185, 112, 104, 218, 246, 97, 228, 251, 34, 242, 193, 238, 210,
  144, 12, 191, 179, 162, 241, 81, 51, 145, 235, 249, 14, 239, 107, 49, 192, 214, 31, 181, 199, 106, 157, 184, 84,
  204, 176, 115, 121, 50, 45, 127, 4, 150, 254, 138, 236, 205, 93, 222, 114, 67, 29, 24, 72, 243, 141, 128, 195, 78,
  66, 215, 61, 156, 180,
];

function createNoise(seed: number) {
  const perm = new Array<number>(512);
  const grad = new Array<(typeof GRAD3)[number]>(512);
  let s = Math.floor(seed * 65536);
  if (s < 256) s |= s << 8;
  for (let i = 0; i < 256; i++) {
    const v = i & 1 ? PERM_BASE[i] ^ (s & 255) : PERM_BASE[i] ^ ((s >> 8) & 255);
    perm[i] = perm[i + 256] = v;
    grad[i] = grad[i + 256] = GRAD3[v % 12];
  }
  const fade = (t: number) => t * t * t * (t * (t * 6 - 15) + 10);
  const lerp = (a: number, b: number, t: number) => (1 - t) * a + t * b;
  const dot = (g: readonly number[], x: number, y: number) => g[0] * x + g[1] * y;
  return (xIn: number, yIn: number) => {
    let X = Math.floor(xIn);
    let Y = Math.floor(yIn);
    const x = xIn - X;
    const y = yIn - Y;
    X &= 255;
    Y &= 255;
    const n00 = dot(grad[X + perm[Y]], x, y);
    const n01 = dot(grad[X + perm[Y + 1]], x, y - 1);
    const n10 = dot(grad[X + 1 + perm[Y]], x - 1, y);
    const n11 = dot(grad[X + 1 + perm[Y + 1]], x - 1, y - 1);
    const u = fade(x);
    return lerp(lerp(n00, n10, u), lerp(n01, n11, u), fade(y));
  };
}

const CONFIG = { waveSpeedX: 0.0125, waveSpeedY: 0.005, waveAmpX: 32, waveAmpY: 16, xGap: 18, yGap: 40 };
const FRAME_MS = 1000 / 30;

export function WavesBackground({ className = "" }: { className?: string }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d");
    if (!canvas || !ctx) return;

    const noise = createNoise(0.42);
    const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const saveData = (navigator as Navigator & { connection?: { saveData?: boolean } }).connection?.saveData === true;
    const animate = !reduceMotion && !saveData;
    let lines: { x: number; y: number }[][] = [];
    let raf = 0;
    let last = 0;
    let visible = true;

    function layout() {
      const { width, height } = canvas!.getBoundingClientRect();
      canvas!.width = Math.max(1, Math.floor(width));
      canvas!.height = Math.max(1, Math.floor(height));
      const totalLines = Math.ceil((width + 200) / CONFIG.xGap);
      const totalPoints = Math.ceil((height + 30) / CONFIG.yGap);
      const xStart = (width - CONFIG.xGap * totalLines) / 2;
      const yStart = (height - CONFIG.yGap * totalPoints) / 2;
      lines = Array.from({ length: totalLines + 1 }, (_, i) =>
        Array.from({ length: totalPoints + 1 }, (_, j) => ({ x: xStart + CONFIG.xGap * i, y: yStart + CONFIG.yGap * j })),
      );
    }

    function draw(time: number) {
      ctx!.clearRect(0, 0, canvas!.width, canvas!.height);
      ctx!.strokeStyle = getComputedStyle(canvas!).color;
      ctx!.lineWidth = 1;
      ctx!.beginPath();
      for (const points of lines) {
        points.forEach((p, idx) => {
          const move = noise((p.x + time * CONFIG.waveSpeedX) * 2e-3, (p.y + time * CONFIG.waveSpeedY) * 15e-4) * 12;
          const x = p.x + Math.cos(move) * CONFIG.waveAmpX;
          const y = p.y + Math.sin(move) * CONFIG.waveAmpY;
          if (idx === 0) ctx!.moveTo(x, y);
          else ctx!.lineTo(x, y);
        });
      }
      ctx!.stroke();
    }

    function tick(time: number) {
      raf = requestAnimationFrame(tick);
      if (!visible || document.hidden || time - last < FRAME_MS) return;
      last = time;
      draw(time);
    }

    layout();
    draw(0);
    const resize = new ResizeObserver(() => {
      layout();
      draw(last);
    });
    resize.observe(canvas);
    const io = new IntersectionObserver(([entry]) => (visible = entry.isIntersecting));
    io.observe(canvas);
    if (animate) raf = requestAnimationFrame(tick);

    return () => {
      cancelAnimationFrame(raf);
      resize.disconnect();
      io.disconnect();
    };
  }, []);

  return <canvas ref={canvasRef} aria-hidden="true" className={`pointer-events-none block h-full w-full ${className}`} />;
}
