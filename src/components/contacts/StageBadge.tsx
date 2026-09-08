import { Milestone } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { TenantStage } from '@/types'

interface StageBadgeProps {
  stage: string
  stages: TenantStage[]
  size?: 'sm' | 'md'
  className?: string
}

/**
 * A **situação do contato** — onde a PESSOA está no ciclo de vida.
 *
 * Até aqui isto era a mesma receita visual de uma etiqueta: `color-chip`
 * preenchido com a cor, `rounded-full`, borda — mudava só meio pixel de
 * padding. Numa linha da tabela de contatos o operador via três pílulas
 * coloridas iguais e tinha de adivinhar qual era o estado exclusivo do
 * contato e quais eram rótulos livres.
 *
 * A diferença agora está na FORMA, não em mais cor (que é o recurso já
 * saturado nessas telas):
 *
 *   situação   [ ◈ Proposta enviada ]   cantos quase retos · fundo neutro · ponto colorido
 *   etiqueta   ( ● Black Friday )       pílula cheia — inalterada
 *
 * Forma distingue melhor que cor: sobrevive a daltonismo, ao tema claro e à
 * densidade da tabela. A cor da situação não se perde — vive no ponto, que
 * basta para reconhecê-la de relance. O ícone é o `Milestone`, o mesmo que
 * marca esse eixo no painel de conversas e em Configurações.
 */
export function StageBadge({ stage, stages, size = 'sm', className }: StageBadgeProps) {
  const def = stages.find((s) => s.key === stage)

  const shell = cn(
    'inline-flex items-center gap-1.5 font-medium rounded-[3px] border',
    'bg-surface-800 border-surface-700',
    size === 'sm' ? 'text-[11px] px-2 py-0.5' : 'text-xs px-2.5 py-1',
    className,
  )
  const iconSize = size === 'sm' ? 'w-3 h-3' : 'w-3.5 h-3.5'

  // Situação desconhecida (chave órfã, ex.: estágio removido das Configurações
  // com contatos ainda nele): mesma forma, sem ponto — não há cor para mostrar.
  if (!def) {
    return (
      <span className={cn(shell, 'text-surface-500')} title="Situação não configurada">
        <Milestone className={cn(iconSize, 'flex-shrink-0 opacity-70')} aria-hidden />
        {stage || '—'}
      </span>
    )
  }

  return (
    <span className={cn(shell, 'text-surface-200')} title={`Situação: ${def.label}`}>
      <Milestone className={cn(iconSize, 'flex-shrink-0 text-surface-500')} aria-hidden />
      <span
        className="w-1.5 h-1.5 rounded-full flex-shrink-0"
        style={{ backgroundColor: def.color }}
        aria-hidden
      />
      {def.label}
    </span>
  )
}
