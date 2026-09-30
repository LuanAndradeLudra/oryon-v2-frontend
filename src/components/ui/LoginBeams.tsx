"use client";

import { useEffect, useRef } from "react";

/**
 * Feixes de luz no fundo da tela de login.
 *
 * 30/09 (PO): "aumente o efeito e a intensidade". Antes: 8 feixes cinza,
 * opacidade 6–14%, e a cor sorteada A CADA QUADRO (cintilava). Agora: mais
 * feixes, mais largos e mais opacos, na cor da marca (teal, com alguns
 * brancos para dar profundidade), somados com `lighter` para brilharem onde
 * se cruzam, e a cor fixa por feixe. Um halo teal lento respira atrás de tudo.
 */

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
  color: { r: number; g: number; b: number };
}

// Teal da marca em três tons + um branco-gelo para os feixes de destaque.
const BEAM_COLORS_DARK = [
  { r: 45, g: 212, b: 191 },  // #2DD4BF
  { r: 20, g: 184, b: 166 },  // #14B8A6
  { r: 94, g: 234, b: 212 },  // #5EEAD4
  { r: 220, g: 245, b: 240 }, // branco-gelo
];
const BEAM_COLORS_LIGHT = [
  { r: 20, g: 184, b: 166 },
  { r: 45, g: 212, b: 191 },
  { r: 15, g: 118, b: 110 },
];

const BEAM_COUNT = 12;

function createBeam(width: number, height: number, isLight: boolean): Beam {
  const palette = isLight ? BEAM_COLORS_LIGHT : BEAM_COLORS_DARK;
  return {
    x: Math.random() * width,
    y: Math.random() * height,
    width: 18 + Math.random() * 24,
    length: height * 2.5,
    angle: -35 + Math.random() * 10,
    speed: 0.35 + Math.random() * 0.55,
    opacity: 0.13 + Math.random() * 0.14,
    pulse: Math.random() * Math.PI * 2,
    pulseSpeed: 0.01 + Math.random() * 0.018,
    color: palette[Math.floor(Math.random() * palette.length)],
  };
}

export function LoginBeams({ bgColor = '#0a0a0a', isLight = false }: { bgColor?: string; isLight?: boolean }) {
  const canvasRef  = useRef<HTMLCanvasElement>(null);
  const beamsRef   = useRef<Beam[]>([]);
  const frameRef   = useRef<number>(0);
  const bgColorRef = useRef(bgColor);
  const isLightRef = useRef(isLight);

  // Mantém refs sempre atualizados sem reiniciar o loop
  useEffect(() => { bgColorRef.current = bgColor; }, [bgColor]);
  useEffect(() => { isLightRef.current = isLight; }, [isLight]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let w = 0;
    let h = 0;
    let t = 0;

    const resize = () => {
      // 1x DPR: os feixes são desfocados de qualquer jeito
      w = window.innerWidth;
      h = window.innerHeight;
      canvas.width  = w;
      canvas.height = h;
      canvas.style.width  = `${w}px`;
      canvas.style.height = `${h}px`;

      beamsRef.current = [];
      for (let i = 0; i < BEAM_COUNT; i++) {
        beamsRef.current.push(createBeam(w, h, isLightRef.current));
      }
    };

    resize();
    window.addEventListener("resize", resize);

    const drawBeam = (beam: Beam) => {
      const { r, g, b } = beam.color;
      const alpha = Math.min(1, beam.opacity * (0.75 + Math.sin(beam.pulse) * 0.45));

      ctx.save();
      ctx.translate(beam.x, beam.y);
      ctx.rotate((beam.angle * Math.PI) / 180);

      const grad = ctx.createLinearGradient(0, 0, 0, beam.length);
      grad.addColorStop(0,   `rgba(${r},${g},${b},0)`);
      grad.addColorStop(0.2, `rgba(${r},${g},${b},${alpha * 0.45})`);
      grad.addColorStop(0.5, `rgba(${r},${g},${b},${alpha})`);
      grad.addColorStop(0.8, `rgba(${r},${g},${b},${alpha * 0.45})`);
      grad.addColorStop(1,   `rgba(${r},${g},${b},0)`);

      ctx.fillStyle = grad;
      ctx.fillRect(-beam.width / 2, 0, beam.width, beam.length);

      // Um núcleo fino e mais claro no meio do feixe: dá a sensação de luz.
      const core = ctx.createLinearGradient(0, 0, 0, beam.length);
      core.addColorStop(0.3, `rgba(255,255,255,0)`);
      core.addColorStop(0.5, `rgba(255,255,255,${alpha * 0.3})`);
      core.addColorStop(0.7, `rgba(255,255,255,0)`);
      ctx.fillStyle = core;
      ctx.fillRect(-beam.width * 0.12, 0, beam.width * 0.24, beam.length);
      ctx.restore();
    };

    const animate = () => {
      t += 1;
      ctx.globalCompositeOperation = "source-over";
      ctx.fillStyle = bgColorRef.current;
      ctx.fillRect(0, 0, w, h);

      // Halo teal que respira devagar, atrás dos feixes.
      const respira = 0.5 + Math.sin(t * 0.008) * 0.5;
      const halo = ctx.createRadialGradient(w * 0.35, h * 0.62, 0, w * 0.35, h * 0.62, Math.max(w, h) * 0.7);
      halo.addColorStop(0, `rgba(45,212,191,${0.08 + respira * 0.06})`);
      halo.addColorStop(1, "rgba(45,212,191,0)");
      ctx.fillStyle = halo;
      ctx.fillRect(0, 0, w, h);

      // Os feixes somam luz onde se cruzam.
      ctx.globalCompositeOperation = isLightRef.current ? "source-over" : "lighter";
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
        style={{ filter: "blur(10px) saturate(1.1)" }}
      />
      {/* Vinheta escura — apenas no tema escuro; mais aberta que antes para os
          feixes aparecerem até perto das bordas. */}
      {!isLight && (
        <div
          className="absolute inset-0 z-[1] pointer-events-none"
          style={{ background: "radial-gradient(ellipse at center, transparent 55%, rgba(6,9,9,0.55) 100%)" }}
        />
      )}
    </>
  );
}
