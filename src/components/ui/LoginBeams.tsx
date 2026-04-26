"use client";

import { useEffect, useRef } from "react";

interface Beam {
  x: number;
  y: number;
  width: number;
  length: number;
  angle: number;
  speed: number;
  opacity: number;
  pulse: number;
  pulseSpeed: number;
}

function createBeam(width: number, height: number): Beam {
  const angle = -35 + Math.random() * 10;
  return {
    x: Math.random() * width,
    y: Math.random() * height,
    width: 12 + Math.random() * 8,
    length: height * 2.5,
    angle,
    speed: 0.2 + Math.random() * 0.3,
    opacity: 0.06 + Math.random() * 0.08,
    pulse: Math.random() * Math.PI * 2,
    pulseSpeed: 0.008 + Math.random() * 0.012,
  };
}

const BEAM_COLORS = [
  { r: 163, g: 163, b: 163 },
  { r: 115, g: 115, b: 115 },
  { r: 212, g: 212, b: 212 },
];

const BEAM_COUNT = 8;

export function LoginBeams() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const beamsRef  = useRef<Beam[]>([]);
  const frameRef  = useRef<number>(0);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let w = 0;
    let h = 0;

    const resize = () => {
      // Use 1x DPR for performance — beams are blurred anyway
      w = window.innerWidth;
      h = window.innerHeight;
      canvas.width  = w;
      canvas.height = h;
      canvas.style.width  = `${w}px`;
      canvas.style.height = `${h}px`;

      beamsRef.current = [];
      for (let i = 0; i < BEAM_COUNT; i++) {
        beamsRef.current.push(createBeam(w, h));
      }
    };

    resize();
    window.addEventListener("resize", resize);

    const drawBeam = (beam: Beam) => {
      const color = BEAM_COLORS[Math.floor(Math.random() * BEAM_COLORS.length)];
      const { r, g, b } = color;
      const alpha = Math.min(1, beam.opacity * (0.8 + Math.sin(beam.pulse) * 0.35));

      ctx.save();
      ctx.translate(beam.x, beam.y);
      ctx.rotate((beam.angle * Math.PI) / 180);

      const grad = ctx.createLinearGradient(0, 0, 0, beam.length);
      grad.addColorStop(0,   `rgba(${r},${g},${b},0)`);
      grad.addColorStop(0.2, `rgba(${r},${g},${b},${alpha * 0.4})`);
      grad.addColorStop(0.5, `rgba(${r},${g},${b},${alpha})`);
      grad.addColorStop(0.8, `rgba(${r},${g},${b},${alpha * 0.4})`);
      grad.addColorStop(1,   `rgba(${r},${g},${b},0)`);

      ctx.fillStyle = grad;
      // Use CSS blur on the canvas element instead of per-beam ctx.filter
      ctx.fillRect(-beam.width / 2, 0, beam.width, beam.length);
      ctx.restore();
    };

    const animate = () => {
      // Background
      ctx.fillStyle = "#0a0a0a";
      ctx.fillRect(0, 0, w, h);

      for (const beam of beamsRef.current) {
        beam.y -= beam.speed;
        beam.pulse += beam.pulseSpeed;
        if (beam.y + beam.length < -50) {
          beam.y = h + 50;
          beam.x = Math.random() * w;
        }
        drawBeam(beam);
      }

      frameRef.current = requestAnimationFrame(animate);
    };

    animate();

    return () => {
      window.removeEventListener("resize", resize);
      cancelAnimationFrame(frameRef.current);
    };
  }, []);

  return (
    <>
      <canvas
        ref={canvasRef}
        className="absolute inset-0 z-0"
        style={{ filter: "blur(6px)" }}
      />
      {/* Subtle vignette */}
      <div
        className="absolute inset-0 z-[1] pointer-events-none"
        style={{ background: "radial-gradient(ellipse at center, transparent 40%, rgba(9,9,15,0.7) 100%)" }}
      />
    </>
  );
}
