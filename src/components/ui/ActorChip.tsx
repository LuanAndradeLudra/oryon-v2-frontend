// ─── ActorChip — quem realizou uma ação ────────────────────────────────────
// Pequeno componente reusável: ícone monocromático + nome do ator. Usado
// na Atividade Recente do dashboard e na Auditoria das configurações
// (qualquer lista que precise identificar QUEM fez algo). Centraliza:
//   • Ícone por tipo de ator (User / Bot / Cpu / etc.)
//   • Fallback de nome quando o backend mandou `actorName` null
//     (ex: "Agente IA" pro tipo 'agent', "Sistema" pros demais)
//
// Mantém o padrão visual consistente entre todas as superfícies — quando
// quiser ajustar a cor do "Bot" ou o ícone do "Webhook", muda aqui e
// propaga pra todas as telas que mostram autoria.

import { User, Bot, Cpu, Globe, Clock } from 'lucide-react'
import { cn } from '@/lib/utils'

/** Subset of backend ActivityActorType, plus a fallback bucket. */
export type ActorKind = 'user' | 'agent' | 'system' | 'webhook' | 'job'

const ACTOR_BADGE: Record<ActorKind, {
  icon: React.ReactNode
  iconClass: string
  /** Used as the displayed name when the upstream `actorName` is null. */
  fallbackName: string
}> = {
  user:    { icon: <User className="w-3.5 h-3.5" />,   iconClass: 'text-surface-300', fallbackName: 'Sistema' },
  agent:   { icon: <Bot className="w-3.5 h-3.5" />,    iconClass: 'text-brand-300',   fallbackName: 'Agente IA' },
  system:  { icon: <Cpu className="w-3.5 h-3.5" />,    iconClass: 'text-surface-400', fallbackName: 'Sistema' },
  webhook: { icon: <Globe className="w-3.5 h-3.5" />,  iconClass: 'text-surface-400', fallbackName: 'Webhook' },
  job:     { icon: <Clock className="w-3.5 h-3.5" />,  iconClass: 'text-surface-400', fallbackName: 'Tarefa agendada' },
}

interface ActorChipProps {
  actorType: ActorKind | string | null | undefined
  actorName?: string | null
  /** Optional max width for the truncated name. Defaults to 160px. */
  maxNameWidth?: number
  className?: string
}

export function ActorChip({ actorType, actorName, maxNameWidth = 160, className }: ActorChipProps) {
  // Normalise unknown actor types into 'system' so we always have an icon
  // (the backend evolved its enum once already; this keeps the UI safe).
  const kind: ActorKind =
    actorType === 'user' || actorType === 'agent' || actorType === 'system'
      || actorType === 'webhook' || actorType === 'job'
      ? actorType
      : 'system'
  const badge = ACTOR_BADGE[kind]
  const name = actorName?.trim() || badge.fallbackName
  return (
    <span className={cn('inline-flex items-center gap-1 min-w-0', className)}>
      <span className={cn('flex-shrink-0', badge.iconClass)}>{badge.icon}</span>
      <span
        className="text-surface-300 font-medium truncate"
        style={{ maxWidth: maxNameWidth }}
      >
        {name}
      </span>
    </span>
  )
}
