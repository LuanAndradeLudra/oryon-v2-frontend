import type { AutomationType } from '@/types'
import type { ReactNode } from 'react'
import { cn } from '@/lib/utils'
import { Hand, Bell, Moon, Tag, BarChart3, Clock, Zap } from 'lucide-react'

export const TYPE_CONFIG: Record<AutomationType, {
  label: string
  triggerLabel: string
  icon: ReactNode
}> = {
  boas_vindas:      { label: 'Boas-vindas',     triggerLabel: 'Novo contato inicia conversa',       icon: <Hand className="w-3.5 h-3.5" /> },
  follow_up:        { label: 'Follow-up',       triggerLabel: 'Sem resposta após N horas',           icon: <Bell className="w-3.5 h-3.5" /> },
  fora_horario:     { label: 'Fora do horário', triggerLabel: 'Mensagem fora do horário comercial', icon: <Moon className="w-3.5 h-3.5" /> },
  triagem_keyword:  { label: 'Triagem',         triggerLabel: 'Palavra-chave detectada',            icon: <Tag className="w-3.5 h-3.5" /> },
  estagio_crm:      { label: 'Estágio CRM',     triggerLabel: 'Contato muda de estágio',            icon: <BarChart3 className="w-3.5 h-3.5" /> },
  inatividade:      { label: 'Inatividade',     triggerLabel: 'Sem atividade por N dias',           icon: <Clock className="w-3.5 h-3.5" /> },
  custom:           { label: 'Personalizado',   triggerLabel: 'Evento customizado',                 icon: <Zap className="w-3.5 h-3.5" /> },
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
        'color-chip inline-flex items-center gap-1.5 rounded-md font-medium border',
        size === 'sm' ? 'px-2 py-0.5 text-[10px]' : 'px-2.5 py-1 text-xs',
        className,
      )}
      style={{ ['--chip']: 'var(--color-status-muted)' } as React.CSSProperties}
    >
      {cfg.icon}
      {cfg.label}
    </span>
  )
}
