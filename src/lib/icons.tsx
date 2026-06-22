/**
 * Oryon custom icon set — drop-in replacement for lucide-react.
 * Each icon is a React component matching the LucideIcon signature:
 *   ({ size, color, strokeWidth, className, ...props }) => JSX
 *
 * Icons not defined here fall back to the real lucide-react at runtime
 * via the ...rest spread on the lucide module re-exported at the bottom.
 *
 * Color system (catalog.html):
 *   stroke base  #cfcfcf  (N)
 *   fill core    #a3a3a3  (G) — duotone mono
 *   amber        #E0A458  (C) — state only (active / flagged / marked)
 */

import React from 'react'

// ── types ──────────────────────────────────────────────────────────────────────
export type { LucideIcon, LucideProps } from 'lucide-react-original'

interface IconProps extends React.SVGProps<SVGSVGElement> {
  size?: number | string
  color?: string
  strokeWidth?: number | string
}

// ── factory ───────────────────────────────────────────────────────────────────
// N (traço) e G (núcleo duotone) usam currentColor por padrão — herdam a cor
// do texto do tema. No dark o texto é ~#cfcfcf, no light é ~#111, logo os
// ícones ficam claros no dark e pretos no light sem nenhuma prop extra.
// G usa opacity para simular o duotone sem precisar de uma cor fixa.
function make(inner: (N: string, G: string) => string) {
  return function OryonIcon({ size = 34, color, strokeWidth = 1.75, className, style, ...rest }: IconProps) {
    const N = color ?? 'currentColor'
    const G = color ?? 'currentColor'
    return (
      <svg
        viewBox="0 0 24 24"
        width={size}
        height={size}
        fill="none"
        stroke={N}
        strokeWidth={strokeWidth}
        strokeLinecap="round"
        strokeLinejoin="round"
        data-oryon-icon
        className={className}
        style={{ opacity: 1, ...style }}
        {...rest}
        dangerouslySetInnerHTML={{ __html: inner(N, G) }}
      />
    )
  }
}

// ── Navegação & Conceito ──────────────────────────────────────────────────────
export const Home = make((N, G) =>
  `<path d="M4 11 L12 4 L20 11"/><path d="M6 11 V19 a1 1 0 0 0 1 1 H17 a1 1 0 0 0 1 -1 V11"/><rect x="10" y="13.5" width="4" height="6.5" rx="1.2" fill="${G}" stroke="none" opacity="0.45"/>`)

export const MessageSquare = make((N, G) =>
  `<path d="M5 6 h9.5 l4 4 v4 a2 2 0 0 1 -2 2 h-6 l-4 3.2 v-3.2 h-1.5 a2 2 0 0 1 -2 -2 V8 a2 2 0 0 1 2 -2 Z"/><rect x="8" y="11" width="8" height="2" rx="1" fill="${G}" stroke="none" opacity="0.45"/>`)

export const MessagesSquare = make((N, G) =>
  `<path d="M3 5 h11 a2 2 0 0 1 2 2 v5 a2 2 0 0 1 -2 2 H8 l-3 2.5 V14 H3 Z"/><rect x="6" y="8.5" width="6" height="1.8" rx="0.9" fill="${G}" stroke="none" opacity="0.45"/><path d="M9 17 a2 2 0 0 0 2 2 h5 l3 2.5 V19 a2 2 0 0 0 0 -.2 V11 a2 2 0 0 0 -2 -2 h-1"/>`)

export const Users = make((N, G) =>
  `<circle cx="12" cy="8" r="3.6" fill="${G}" stroke="none" opacity="0.45"/><path d="M4.5 20 a7.5 7.5 0 0 1 15 0"/>`)

export const Bot = make((N, G) =>
  `<line x1="12" y1="3" x2="12" y2="6.5"/><circle cx="12" cy="2.6" r="1.3" fill="${G}" stroke="none" opacity="0.45"/><path d="M7 7 h7 l4 4 v4 a2 2 0 0 1 -2 2 H7 a2 2 0 0 1 -2 -2 V9 a2 2 0 0 1 2 -2 Z"/><circle cx="9.5" cy="13" r="1.5" fill="${G}" stroke="none" opacity="0.45"/><circle cx="14.5" cy="13" r="1.5" fill="${G}" stroke="none" opacity="0.45"/>`)

export const Sparkles = make((N, G) =>
  `<path d="M11 3 C11.7 8 13 9.3 18 10.5 C13 11.7 11.7 13 11 18 C10.3 13 9 11.7 4 10.5 C9 9.3 10.3 8 11 3 Z" fill="${G}" stroke="none" opacity="0.45"/><path d="M18.5 14 l.55 1.9 l1.95 .6 l-1.95 .6 l-.55 1.9 l-.55 -1.9 l-1.95 -.6 l1.95 -.6 z" fill="${N}" stroke="none"/>`)

export const BarChart3 = make((N, G) =>
  `<rect x="4" y="4" width="7" height="7" rx="2"/><rect x="4" y="13" width="7" height="7" rx="2"/><rect x="13" y="13" width="7" height="7" rx="2"/><rect x="13" y="4" width="7" height="7" rx="2" fill="${G}" stroke="none" opacity="0.45"/>`)

export const Send = make((N, G) =>
  `<path d="M20.5 4 L3.5 11 l6.5 2.2 l2.2 6.8 z" fill="${G}" stroke="none" opacity="0.45"/><path d="M20.5 4 L10 13.2" stroke="${N}" stroke-width="1.4" opacity="0.3"/>`)

export const Workflow = make((N, G) =>
  `<rect x="3.5" y="3.5" width="6" height="6" rx="1.8"/><rect x="14.5" y="14.5" width="6" height="6" rx="1.8" fill="${G}" stroke="none" opacity="0.45"/><path d="M9.5 6.5 h3.5 a3 3 0 0 1 3 3 v5"/>`)

export const Megaphone = make((N, G) =>
  `<path d="M5 10 L17 5 V19 L5 14 Z"/><path d="M5 10 H4 a1 1 0 0 0 -1 1 v2 a1 1 0 0 0 1 1 h1 Z"/><rect x="6.5" y="14" width="3" height="5.5" rx="1" fill="${G}" stroke="none" opacity="0.45"/>`)

export const Target = make((N, G) =>
  `<circle cx="12" cy="12" r="8"/><circle cx="12" cy="12" r="4"/><circle cx="12" cy="12" r="1.6" fill="${G}" stroke="none" opacity="0.45"/>`)

export const Crown = make((N, G) =>
  `<path d="M4 18 L5 8 L9.5 12 L12 6 L14.5 12 L19 8 L20 18 Z" fill="${G}" stroke="none" opacity="0.45"/>`)

export const Cpu = make((N, G) =>
  `<rect x="6" y="6" width="12" height="12" rx="2"/><rect x="9.5" y="9.5" width="5" height="5" rx="1" fill="${G}" stroke="none" opacity="0.45"/><path d="M9 3 v3 M15 3 v3 M9 18 v3 M15 18 v3 M3 9 h3 M3 15 h3 M18 9 h3 M18 15 h3"/>`)

export const Settings = make((N, G) =>
  `<line x1="4" y1="8" x2="20" y2="8"/><line x1="4" y1="16" x2="20" y2="16"/><circle cx="9" cy="8" r="2.6" fill="${G}" stroke="none" opacity="0.45"/><circle cx="15" cy="16" r="2.6" fill="${G}" stroke="none" opacity="0.45"/>`)

export const Globe = make(() =>
  `<circle cx="12" cy="12" r="8"/><path d="M4 12 H20"/><path d="M12 4 a12 12 0 0 1 0 16 a12 12 0 0 1 0 -16"/>`)

export const Building2 = make((N, G) =>
  `<path d="M5 21 V6 a1 1 0 0 1 1 -1 h6 a1 1 0 0 1 1 1 v15"/><path d="M14 21 V11 h4 a1 1 0 0 1 1 1 v9"/><rect x="8" y="9" width="2.5" height="2.5" fill="${G}" stroke="none" opacity="0.45"/><path d="M3 21 H21"/>`)

// ── Status & Feedback ─────────────────────────────────────────────────────────
export const Check = make(() =>
  `<path d="M5 12.5 L10 17.5 L19 7"/>`)

export const CheckCheck = make(() =>
  `<path d="M3 12.5 L7.5 17 L13 9"/><path d="M11 15 L13 17 L21 7"/>`)

export const X = make(() =>
  `<path d="M6.5 6.5 L17.5 17.5 M17.5 6.5 L6.5 17.5"/>`)

export const CheckCircle2 = make((N, G) =>
  `<circle cx="12" cy="12" r="8" fill="${G}" stroke="none" opacity="0.45"/><path d="M8.3 12 L11 14.7 L15.7 9.3" stroke="${N}" stroke-width="1.9"/>`)

export const CheckCircle = make((N, G) =>
  `<circle cx="12" cy="12" r="8" fill="${G}" stroke="none" opacity="0.45"/><path d="M8.3 12 L11 14.7 L15.7 9.3" stroke="${N}" stroke-width="1.9"/>`)

export const XCircle = make(() =>
  `<circle cx="12" cy="12" r="8"/><path d="M9 9 L15 15 M15 9 L9 15"/>`)

export const AlertCircle = make((N, G) =>
  `<circle cx="12" cy="12" r="8"/><line x1="12" y1="8" x2="12" y2="13"/><circle cx="12" cy="16.2" r="1.1" fill="${G}" stroke="none" opacity="0.45"/>`)

export const AlertTriangle = make((N, G) =>
  `<path d="M12 4 L21.5 19.5 H2.5 Z"/><line x1="12" y1="10" x2="12" y2="14"/><circle cx="12" cy="16.8" r="1.1" fill="${G}" stroke="none" opacity="0.45"/>`)

export const Info = make((N, G) =>
  `<circle cx="12" cy="12" r="8"/><line x1="12" y1="11" x2="12" y2="16.5"/><circle cx="12" cy="8" r="1.1" fill="${G}" stroke="none" opacity="0.45"/>`)

export const HelpCircle = make((N, G) =>
  `<circle cx="12" cy="12" r="8"/><path d="M9.6 9.6 a2.5 2.5 0 1 1 3.3 2.7 c-.8 .4 -.9 1 -.9 1.7"/><circle cx="12" cy="16.5" r="1.1" fill="${G}" stroke="none" opacity="0.45"/>`)

export const Loader2 = make((N, G) =>
  `<path d="M12 4 a8 8 0 1 0 8 8" stroke="${G}" opacity="0.6"/>`)

export const Star = make((N, G) =>
  `<path d="M12 3 l2.6 5.6 6.1 .7 -4.5 4.2 1.2 6 -5.4 -2.9 -5.4 2.9 1.2 -6 -4.5 -4.2 6.1 -.7 Z" fill="${G}" stroke="none" opacity="0.45"/>`)

export const Heart = make((N, G) =>
  `<path d="M12 20 C5 15 3 11 3 8 a4.5 4.5 0 0 1 9 -1 a4.5 4.5 0 0 1 9 1 c0 3 -2 7 -9 12 Z" fill="${G}" stroke="none" opacity="0.45"/>`)

export const ThumbsUp = make(() =>
  `<path d="M4 11 h3 v9 H4 Z"/><path d="M7 11 l4 -7 a2 2 0 0 1 3 2 l-1 4 h5 a2 2 0 0 1 2 2.4 l-1.2 5 a2 2 0 0 1 -2 1.6 H7"/>`)

export const Flame = make((N, G) =>
  `<path d="M12 3 c3 4 5 6 5 10 a5 5 0 0 1 -10 0 c0 -2 1 -3 2 -4 c1 2 2 2 3 1 c-1 -2 -2 -4 0 -7 Z" fill="${G}" stroke="none" opacity="0.45"/>`)

export const Lightbulb = make((N, G) =>
  `<path d="M9 18.5 h6 M10 21 h4"/><path d="M12 3 a6 6 0 0 0 -4 10 c1 1 1.5 2 1.5 2.8 h5 c0 -.8 .5 -1.8 1.5 -2.8 a6 6 0 0 0 -4 -10 Z"/><path d="M12 9 v4.5" stroke="${G}" opacity="0.6"/>`)

export const Bell = make((N, G) =>
  `<path d="M6 16 V11 a6 6 0 0 1 12 0 v5 l1.5 2 H4.5 Z"/><path d="M10 19.5 a2 2 0 0 0 4 0"/><circle cx="17.5" cy="6" r="2.2" fill="${G}" stroke="none" opacity="0.45"/>`)

// ── Setas & Chevrons ──────────────────────────────────────────────────────────
export const ChevronRight = make(() =>
  `<path d="M9.5 6 L15.5 12 L9.5 18"/>`)

export const ChevronLeft = make(() =>
  `<path d="M14.5 6 L8.5 12 L14.5 18"/>`)

export const ChevronDown = make(() =>
  `<path d="M6 9.5 L12 15.5 L18 9.5"/>`)

export const ChevronUp = make(() =>
  `<path d="M6 14.5 L12 8.5 L18 14.5"/>`)

export const ChevronsUpDown = make(() =>
  `<path d="M8 10 L12 6 L16 10"/><path d="M8 14 L12 18 L16 14"/>`)

export const ArrowLeft = make(() =>
  `<path d="M19 12 H5"/><path d="M11 6 L5 12 L11 18"/>`)

export const ArrowRight = make(() =>
  `<path d="M5 12 H19"/><path d="M13 6 L19 12 L13 18"/>`)

export const ArrowUpRight = make(() =>
  `<path d="M7 17 L17 7"/><path d="M8.5 7 H17 V15.5"/>`)

export const ArrowDown = make(() =>
  `<path d="M12 5 V19"/><path d="M6 13 L12 19 L18 13"/>`)

export const ArrowRightLeft = make(() =>
  `<path d="M4 9 H18 M15 6 L18 9 L15 12"/><path d="M20 15 H6 M9 12 L6 15 L9 18"/>`)

export const RefreshCw = make(() =>
  `<path d="M20 11 a8 8 0 1 0 -1.5 5.5"/><path d="M20 5 V11 H14"/>`)

export const RotateCcw = make(() =>
  `<path d="M4 11 a8 8 0 1 1 1.5 5.5"/><path d="M4 5 V11 H10"/>`)

export const MoreHorizontal = make((N, G) =>
  `<circle cx="6" cy="12" r="1.5" fill="${G}" stroke="none" opacity="0.45"/><circle cx="12" cy="12" r="1.5" fill="${G}" stroke="none" opacity="0.45"/><circle cx="18" cy="12" r="1.5" fill="${G}" stroke="none" opacity="0.45"/>`)

export const MoreVertical = make((N, G) =>
  `<circle cx="12" cy="6" r="1.5" fill="${G}" stroke="none" opacity="0.45"/><circle cx="12" cy="12" r="1.5" fill="${G}" stroke="none" opacity="0.45"/><circle cx="12" cy="18" r="1.5" fill="${G}" stroke="none" opacity="0.45"/>`)

export const Menu = make(() =>
  `<path d="M4 7 H20 M4 12 H20 M4 17 H20"/>`)

export const Filter = make((N, G) =>
  `<path d="M4 5 H20 L14 12 V19 L10 17 V12 Z" fill="${G}" stroke="none" opacity="0.45"/>`)

// ── Ações ─────────────────────────────────────────────────────────────────────
export const Plus = make(() =>
  `<path d="M12 5 V19 M5 12 H19"/>`)

export const Minus = make(() =>
  `<path d="M5 12 H19"/>`)

export const Trash2 = make(() =>
  `<path d="M5 7 H19"/><path d="M9 7 V5 a1 1 0 0 1 1 -1 h4 a1 1 0 0 1 1 1 V7"/><path d="M6.5 7 L7.5 19 a1 1 0 0 0 1 1 h6 a1 1 0 0 0 1 -1 L16.5 7"/><line x1="10" y1="11" x2="10" y2="16"/><line x1="14" y1="11" x2="14" y2="16"/>`)

export const Copy = make(() =>
  `<rect x="8" y="8" width="12" height="12" rx="2"/><path d="M16 8 V6 a2 2 0 0 0 -2 -2 H6 a2 2 0 0 0 -2 2 v8 a2 2 0 0 0 2 2 h2"/>`)

export const Pencil = make((N, G) =>
  `<path d="M4 20 l1 -4 L15.5 5.5 l3 3 L8 19 Z"/><path d="M13.5 7.5 l3 3" stroke="${G}" opacity="0.6"/>`)

export const Save = make((N, G) =>
  `<path d="M5 5 h11 l3 3 v11 a1 1 0 0 1 -1 1 H6 a1 1 0 0 1 -1 -1 Z"/><path d="M8 5 v5 h6 V5"/><rect x="8" y="13.5" width="8" height="5.5" rx="1" fill="${G}" stroke="none" opacity="0.45"/>`)

export const Search = make(() =>
  `<circle cx="11" cy="11" r="6"/><line x1="15.5" y1="15.5" x2="20" y2="20"/>`)

export const Eye = make((N, G) =>
  `<path d="M2.5 12 C5 6.5 19 6.5 21.5 12 C19 17.5 5 17.5 2.5 12 Z"/><circle cx="12" cy="12" r="2.6" fill="${G}" stroke="none" opacity="0.45"/>`)

export const EyeOff = make(() =>
  `<path d="M3.5 12 C5.8 7.5 18.2 7.5 20.5 12"/><path d="M9.5 9.7 a3 3 0 0 0 4.2 4.2"/><line x1="4" y1="5" x2="20" y2="19"/>`)

export const Upload = make(() =>
  `<path d="M12 15 V4"/><path d="M7 9 L12 4 L17 9"/><path d="M4 15 v3 a1 1 0 0 0 1 1 h14 a1 1 0 0 0 1 -1 v-3"/>`)

export const Download = make(() =>
  `<path d="M12 4 V15"/><path d="M7 10 L12 15 L17 10"/><path d="M4 15 v3 a1 1 0 0 0 1 1 h14 a1 1 0 0 0 1 -1 v-3"/>`)

export const Lock = make((N, G) =>
  `<rect x="5" y="10" width="14" height="10" rx="2"/><path d="M8 10 V7 a4 4 0 0 1 8 0 v3"/><circle cx="12" cy="14.5" r="1.6" fill="${G}" stroke="none" opacity="0.45"/>`)

export const Paperclip = make(() =>
  `<path d="M16 8 v8 a4 4 0 0 1 -8 0 V7 a2.5 2.5 0 0 1 5 0 v8.5 a1 1 0 0 1 -2 0 V9"/>`)

export const Link2 = make(() =>
  `<path d="M9 12 H15"/><path d="M10 8 H8 a4 4 0 0 0 0 8 h2"/><path d="M14 8 h2 a4 4 0 0 1 0 8 h-2"/>`)

export const Pin = make((N, G) =>
  `<path d="M9 3 h6 l-1 6 4 3 H6 l4 -3 Z" fill="${G}" stroke="none" opacity="0.45"/><line x1="12" y1="15" x2="12" y2="21"/>`)

export const Calendar = make((N, G) =>
  `<rect x="4" y="5" width="16" height="16" rx="2"/><path d="M4 9 H20 M8 3 v3 M16 3 v3"/><rect x="11" y="12" width="4" height="4" rx="1" fill="${G}" stroke="none" opacity="0.45"/>`)

// ── Comunicação & Mídia ───────────────────────────────────────────────────────
export const Phone = make((N, G) =>
  `<path d="M6 4 h3 l1.8 4.5 -2 1.8 a10 10 0 0 0 4.9 4.9 l1.8 -2 4.5 1.8 v3 a2 2 0 0 1 -2.2 2 A16 16 0 0 1 4 6.2 a2 2 0 0 1 2 -2.2 Z" fill="${G}" stroke="none" opacity="0.45"/>`)

export const Mail = make(() =>
  `<rect x="3" y="6" width="18" height="12" rx="2"/><path d="M4 8 L12 13 L20 8"/>`)

export const Video = make((N, G) =>
  `<rect x="3" y="7" width="12" height="10" rx="2"/><path d="M15 11 L21 8 v8 l-6 -3 Z" fill="${G}" stroke="none" opacity="0.45"/>`)

export const Mic = make((N, G) =>
  `<rect x="9" y="3" width="6" height="11" rx="3" fill="${G}" stroke="none" opacity="0.45"/><path d="M6 11 a6 6 0 0 0 12 0"/><path d="M12 17 v3 M9 20 h6"/>`)

export const Camera = make((N, G) =>
  `<path d="M4 8 h3 l1.5 -2 h7 L17 8 h3 a1 1 0 0 1 1 1 v9 a1 1 0 0 1 -1 1 H4 a1 1 0 0 1 -1 -1 V9 a1 1 0 0 1 1 -1 Z"/><circle cx="12" cy="13" r="3.2" fill="${G}" stroke="none" opacity="0.45"/>`)

export const Image = make((N, G) =>
  `<rect x="4" y="5" width="16" height="14" rx="2"/><circle cx="9" cy="10" r="1.8" fill="${G}" stroke="none" opacity="0.45"/><path d="M5 17 L10 12 L14 16 L17 13 L19 15"/>`)

export const Smile = make((N, G) =>
  `<circle cx="12" cy="12" r="8"/><path d="M8.5 14 a4 4 0 0 0 7 0"/><circle cx="9" cy="10" r="1" fill="${G}" stroke="none" opacity="0.45"/><circle cx="15" cy="10" r="1" fill="${G}" stroke="none" opacity="0.45"/>`)

export const Hash = make(() =>
  `<path d="M9 4 L7 20 M17 4 L15 20 M4 9 H20 M4 15 H20"/>`)

export const AtSign = make((N, G) =>
  `<circle cx="12" cy="12" r="4" fill="${G}" stroke="none" opacity="0.45"/><path d="M16 12 v1.5 a3 3 0 0 0 5 -2.5 a9 9 0 1 0 -3.5 7"/>`)

export const Headphones = make((N, G) =>
  `<path d="M4 14 v-2 a8 8 0 0 1 16 0 v2"/><rect x="3" y="13" width="4" height="7" rx="1.5" fill="${G}" stroke="none" opacity="0.45"/><rect x="17" y="13" width="4" height="7" rx="1.5" fill="${G}" stroke="none" opacity="0.45"/>`)

// ── Arquivo, Dados & Negócio ──────────────────────────────────────────────────
export const FileText = make((N, G) =>
  `<path d="M6 3 h8 l5 5 v12 a1 1 0 0 1 -1 1 H6 a1 1 0 0 1 -1 -1 V4 a1 1 0 0 1 1 -1 Z"/><path d="M14 3 v5 h5"/><line x1="9" y1="13" x2="16" y2="13" stroke="${G}" opacity="0.6" stroke-width="2"/><line x1="9" y1="16.5" x2="14" y2="16.5"/>`)

export const File = make(() =>
  `<path d="M6 3 h8 l5 5 v12 a1 1 0 0 1 -1 1 H6 a1 1 0 0 1 -1 -1 V4 a1 1 0 0 1 1 -1 Z"/><path d="M14 3 v5 h5"/>`)

export const BookOpen = make((N, G) =>
  `<path d="M12 6 C9 4 4 4.2 4 4.2 V17 s5 -.2 8 1.8 c3 -2 8 -1.8 8 -1.8 V4.2 s-5 -.2 -8 1.8 Z"/><line x1="12" y1="6" x2="12" y2="18.8" stroke="${G}" opacity="0.6"/>`)

export const ClipboardList = make((N, G) =>
  `<rect x="5" y="5" width="14" height="16" rx="2"/><rect x="9" y="3" width="6" height="3.5" rx="1" fill="${G}" stroke="none" opacity="0.45"/><path d="M8.5 11 H15 M8.5 15 H13"/>`)

export const Tag = make((N, G) =>
  `<path d="M4 4 h7 l9 9 -7 7 -9 -9 Z"/><circle cx="8" cy="8" r="1.6" fill="${G}" stroke="none" opacity="0.45"/>`)

export const Layers = make((N, G) =>
  `<path d="M12 4 L21 9 L12 14 L3 9 Z" fill="${G}" stroke="none" opacity="0.45"/><path d="M3 13.5 L12 18.5 L21 13.5"/>`)

export const Database = make(() =>
  `<ellipse cx="12" cy="6" rx="7" ry="3"/><path d="M5 6 v12 c0 1.7 3.1 3 7 3 s7 -1.3 7 -3 V6"/><path d="M5 12 c0 1.7 3.1 3 7 3 s7 -1.3 7 -3"/>`)

export const CreditCard = make((N, G) =>
  `<rect x="3" y="6" width="18" height="12" rx="2"/><path d="M3 10 H21"/><rect x="6" y="13.5" width="5" height="2" rx="1" fill="${G}" stroke="none" opacity="0.45"/>`)

export const DollarSign = make(() =>
  `<path d="M12 3 V21"/><path d="M16 6.5 a3.5 3 0 0 0 -4 -2 h-1 a3.2 3 0 0 0 0 6 h2 a3.2 3 0 0 1 0 6 h-1 a3.5 3 0 0 1 -4 -2"/>`)

export const ShoppingBag = make((N, G) =>
  `<path d="M5 8 h14 l-1 12 a1 1 0 0 1 -1 1 H7 a1 1 0 0 1 -1 -1 Z"/><path d="M9 8 V6 a3 3 0 0 1 6 0 v2" stroke="${G}" opacity="0.6"/>`)

export const Receipt = make((N, G) =>
  `<path d="M6 3 h12 v18 l-2 -1.5 -2 1.5 -2 -1.5 -2 1.5 -2 -1.5 -2 1.5 Z"/><path d="M9 8 H15 M9 12 H15" stroke="${G}" opacity="0.6"/>`)

export const Activity = make((N, G) =>
  `<path d="M3 12 H7 L10 5 L14 19 L17 12 H21" stroke="${G}" opacity="0.6"/>`)

export const TrendingUp = make((N, G) =>
  `<path d="M4 16 L10 10 L13 13 L20 6" stroke="${G}" opacity="0.6"/><path d="M15 6 H20 V11" stroke="${G}" opacity="0.6"/>`)

export const Zap = make((N, G) =>
  `<path d="M13 3 L5 13.5 h5 l-1 7.5 8 -11 h-5 Z" fill="${G}" stroke="none" opacity="0.45"/>`)

export const Rocket = make((N, G) =>
  `<path d="M12 3 c3.5 2 5 6.5 5 10 l-1.8 2.8 H8.8 L7 13 c0 -3.5 1.5 -8 5 -10 Z"/><circle cx="12" cy="10" r="1.8" fill="${G}" stroke="none" opacity="0.45"/><path d="M8.8 16 l-2 4 M15.2 16 l2 4"/>`)

export const ShieldCheck = make((N, G) =>
  `<path d="M12 3 L20 6 v6 c0 5 -4 7.5 -8 9 c-4 -1.5 -8 -4 -8 -9 V6 Z"/><path d="M8.8 12 L11 14.2 L15.5 9.5" stroke="${G}" opacity="0.6" stroke-width="2"/>`)

// ── Re-export everything else from lucide-react as fallback ───────────────────
export * from 'lucide-react-original'
