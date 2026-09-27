import {
  Bot, Headphones, MessageSquare, Star, ShoppingBag, Home,
  TrendingUp, Briefcase, Rocket, Shield, BookOpen, Zap,
} from 'lucide-react'
import { cn } from '@/lib/utils'

export const AGENT_ICONS = [
  { id: 'bot',        Icon: Bot,           bg: 'bg-brand-600',   hoverBg: 'hover:bg-brand-600',   shadow: 'shadow-brand-900/40',   stroke: 'text-black',        hoverStroke: 'group-hover:text-black' },
  { id: 'headphones', Icon: Headphones,    bg: 'bg-violet-600',  hoverBg: 'hover:bg-violet-600',  shadow: 'shadow-violet-900/40',  stroke: 'text-violet-700',   hoverStroke: 'group-hover:text-white' },
  { id: 'message',    Icon: MessageSquare, bg: 'bg-blue-600',    hoverBg: 'hover:bg-blue-600',    shadow: 'shadow-blue-900/40',    stroke: 'text-blue-700',     hoverStroke: 'group-hover:text-white' },
  { id: 'star',       Icon: Star,          bg: 'bg-amber-500',   hoverBg: 'hover:bg-amber-500',   shadow: 'shadow-amber-900/40',   stroke: 'text-amber-700',    hoverStroke: 'group-hover:text-white' },
  { id: 'bag',        Icon: ShoppingBag,   bg: 'bg-orange-500',  hoverBg: 'hover:bg-orange-500',  shadow: 'shadow-orange-900/40',  stroke: 'text-orange-700',   hoverStroke: 'group-hover:text-white' },
  { id: 'home',       Icon: Home,          bg: 'bg-teal-600',    hoverBg: 'hover:bg-teal-600',    shadow: 'shadow-teal-900/40',    stroke: 'text-teal-700',     hoverStroke: 'group-hover:text-white' },
  { id: 'trending',   Icon: TrendingUp,    bg: 'bg-green-600',   hoverBg: 'hover:bg-green-600',   shadow: 'shadow-green-900/40',   stroke: 'text-green-700',    hoverStroke: 'group-hover:text-white' },
  { id: 'briefcase',  Icon: Briefcase,     bg: 'bg-indigo-600',  hoverBg: 'hover:bg-indigo-600',  shadow: 'shadow-indigo-900/40',  stroke: 'text-indigo-700',   hoverStroke: 'group-hover:text-white' },
  { id: 'rocket',     Icon: Rocket,        bg: 'bg-sky-600',     hoverBg: 'hover:bg-sky-600',     shadow: 'shadow-sky-900/40',     stroke: 'text-sky-700',      hoverStroke: 'group-hover:text-white' },
  { id: 'shield',     Icon: Shield,        bg: 'bg-slate-500',   hoverBg: 'hover:bg-slate-500',   shadow: 'shadow-slate-900/40',   stroke: 'text-slate-700',    hoverStroke: 'group-hover:text-white' },
  { id: 'book',       Icon: BookOpen,      bg: 'bg-emerald-600', hoverBg: 'hover:bg-emerald-600', shadow: 'shadow-emerald-900/40', stroke: 'text-emerald-700',  hoverStroke: 'group-hover:text-white' },
  { id: 'zap',        Icon: Zap,           bg: 'bg-yellow-500',  hoverBg: 'hover:bg-yellow-500',  shadow: 'shadow-yellow-900/40',  stroke: 'text-yellow-700',   hoverStroke: 'group-hover:text-white' },
]

/** Cor de cada ícone em TOKENS do tema (antes: paleta crua do Tailwind, e o
 *  ícone do robô ficava preto sobre teal escuro no tema claro). Tile suave:
 *  12–16% da cor no fundo, o traço na cor — lê bem nos dois temas. */
const COR_DO_ICONE: Record<string, string> = {
  bot: 'var(--color-brand-500)',
  headphones: 'var(--color-accent-violet)',
  message: 'var(--color-accent-blue)',
  star: 'var(--color-accent-amber)',
  bag: 'var(--color-accent-amber)',
  home: 'var(--color-brand-500)',
  trending: 'var(--color-accent-green)',
  briefcase: 'var(--color-accent-violet)',
  rocket: 'var(--color-accent-blue)',
  shield: 'var(--color-status-muted)',
  book: 'var(--color-accent-green)',
  zap: 'var(--color-accent-amber)',
}

export function AgentIcon({ iconId, className, dashed }: { iconId?: string; className?: string; dashed?: boolean }) {
  const entry = AGENT_ICONS.find(i => i.id === iconId) ?? AGENT_ICONS[0]
  const { Icon } = entry
  // Rascunho = sem fundo, borda tracejada e ícone terciário.
  if (dashed) {
    return (
      <div className={cn('rounded-lg flex items-center justify-center flex-shrink-0 border border-dashed border-[var(--bd2)]', className)}>
        <Icon className="w-[45%] h-[45%] text-surface-500" aria-hidden />
      </div>
    )
  }
  const cor = COR_DO_ICONE[entry.id] ?? COR_DO_ICONE.bot
  return (
    <div
      className={cn('rounded-lg flex items-center justify-center flex-shrink-0 border', className)}
      style={{
        color: cor,
        backgroundColor: `color-mix(in srgb, ${cor} 14%, transparent)`,
        borderColor: `color-mix(in srgb, ${cor} 28%, transparent)`,
      }}
    >
      <Icon className="w-[45%] h-[45%]" strokeWidth={2} aria-hidden />
    </div>
  )
}
