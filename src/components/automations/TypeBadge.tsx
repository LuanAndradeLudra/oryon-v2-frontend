import type { AutomationType } from '@/types'
import type { ReactNode } from 'react'
import { cn } from '@/lib/utils'
import { Hand, Bell, Moon, Tag, BarChart3, Clock, Zap } from 'lucide-react'

export const TYPE_CONFIG: Record<AutomationType, {
  label: string
  color: string
  bg: string
  triggerLabel: string
  icon: ReactNode
}> = {
  boas_vindas:      { label: 'Boas-vindas',     color: '#a1a1aa', bg: '#27272a', triggerLabel: 'Novo contato inicia conversa',         icon: <Hand className="w-3.5 h-3.5" /> },
  follow_up:        { label: 'Follow-up',       color: '#a1a1aa', bg: '#27272a', triggerLabel: 'Sem resposta após N horas',             icon: <Bell className="w-3.5 h-3.5" /> },
  fora_horario:     { label: 'Fora do horário', color: '#a1a1aa', bg: '#27272a', triggerLabel: 'Mensagem fora do horário comercial',   icon: <Moon className="w-3.5 h-3.5" /> },
  triagem_keyword:  { label: 'Triagem',         color: '#a1a1aa', bg: '#27272a', triggerLabel: 'Palavra-chave detectada',              icon: <Tag className="w-3.5 h-3.5" /> },
  estagio_crm:      { label: 'Estágio CRM',     color: '#a1a1aa', bg: '#27272a', triggerLabel: 'Contato muda de estágio',              icon: <BarChart3 className="w-3.5 h-3.5" /> },
  inatividade:      { label: 'Inatividade',     color: '#a1a1aa', bg: '#27272a', triggerLabel: 'Sem atividade por N dias',             icon: <Clock className="w-3.5 h-3.5" /> },
  custom:           { label: 'Personalizado',   color: '#a1a1aa', bg: '#27272a', triggerLabel: 'Evento customizado',                   icon: <Zap className="w-3.5 h-3.5" /> },
}

interface TypeBadgeProps {
  type: AutomationType
  size?: 'sm' | 'md'
  className?: string
}

export function TypeBadge({ type, size = 'sm', className }: TypeBadgeProps) {
  const cfg = TYPE_CONFIG[type]
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 rounded-md font-medium border border-surface-700',
        size === 'sm' ? 'px-2 py-0.5 text-[10px]' : 'px-2.5 py-1 text-xs',
        className,
      )}
      style={{ backgroundColor: cfg.bg, color: cfg.color }}
    >
      {cfg.icon}
      {cfg.label}
    </span>
  )
}
