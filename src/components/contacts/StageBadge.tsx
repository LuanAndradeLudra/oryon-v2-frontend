import { cn } from '@/lib/utils'
import type { TenantStage } from '@/types'

interface StageBadgeProps {
  stage: string
  stages: TenantStage[]
  size?: 'xs' | 'sm' | 'md'
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
 * basta para reconhecê-la de relance (SCRUM-1097: o ícone `Milestone` saiu —
 * o ponto colorido já carrega a distinção, sem repeti-la).
 */
export function StageBadge({ stage, stages, size = 'sm', className }: StageBadgeProps) {
  const def = stages.find((s) => s.key === stage)

  const shell = cn(
    'inline-flex items-center gap-1.5 font-semibold rounded-[5px] border',
    'bg-surface-800 border-surface-700',
    size === 'xs' ? 'h-[18px] gap-[5px] text-[10.5px] px-1.5' : size === 'sm' ? 'text-[11px] px-[7px] py-0.5' : 'text-xs px-2.5 py-1',
    className,
  )

  // Situação desconhecida (chave órfã, ex.: estágio removido das Configurações
  // com contatos ainda nele): mesma forma, sem ponto — não há cor para mostrar.
  if (!def) {
    return (
      <span className={cn(shell, 'text-surface-500')} title="Situação não configurada">
        {stage || '—'}
      </span>
    )
  }

  return (
    <span className={cn(shell, 'text-surface-100')} title={`Situação: ${def.label}`}>
      <span
        className={cn('rounded-full flex-shrink-0', size === 'xs' ? 'w-[5px] h-[5px]' : 'w-1.5 h-1.5')}
        style={{ backgroundColor: def.color }}
        aria-hidden
      />
      {def.label}
    </span>
  )
}
