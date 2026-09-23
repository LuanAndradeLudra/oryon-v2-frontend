import { Megaphone, Bell, KeyRound } from 'lucide-react'
import type { TemplateCategoryType } from '@/types'

/**
 * Identidade visual da categoria do modelo (SCRUM-1097, pedido do PO 22/09).
 *
 * O painel da Meta mostra um ladrilho colorido com o ícone da categoria assim
 * que ela é escolhida, e o ícone acompanha o modelo por todo o fluxo de
 * criação — é o que diz, de relance, "isto aqui é um modelo de marketing".
 * Centralizado aqui para que a tela de criação, o card do catálogo e qualquer
 * lugar futuro usem exatamente o mesmo ícone, rótulo e cor.
 *
 * As cores saem dos tokens de acento do produto, não de hex cru: marketing
 * herda o teal da marca (é o disparo promocional, a ação principal do módulo),
 * utilidade usa o azul (informativo/transacional) e autenticação o âmbar
 * (código, algo que exige atenção e tem validade curta).
 */
export const TEMPLATE_CATEGORIES: Record<TemplateCategoryType, {
  label: string
  Icon: typeof Megaphone
  /** Cor do ícone e da borda do ladrilho. */
  cor: string
  /** Fundo do ladrilho — mesma cor a 12%, igual à receita `.color-chip-soft`. */
  fundo: string
  hint: string
}> = {
  MARKETING: {
    label: 'Marketing',
    Icon: Megaphone,
    cor: 'var(--color-accent-dark)',
    fundo: 'color-mix(in srgb, var(--color-accent-dark) 12%, transparent)',
    hint: 'Promoções, ofertas, novidades e boletins.',
  },
  UTILITY: {
    label: 'Utilidade',
    Icon: Bell,
    cor: 'var(--color-accent-blue)',
    fundo: 'color-mix(in srgb, var(--color-accent-blue) 12%, transparent)',
    hint: 'Confirmações, atualizações de pedido e lembretes.',
  },
  AUTHENTICATION: {
    label: 'Autenticação',
    Icon: KeyRound,
    cor: 'var(--color-accent-amber)',
    fundo: 'color-mix(in srgb, var(--color-accent-amber) 12%, transparent)',
    hint: 'Códigos de verificação de uso único.',
  },
}

/** Ladrilho com o ícone da categoria. `size` é o lado do quadrado, em px. */
export function TemplateCategoryTile({ category, size = 34, className }: {
  category: TemplateCategoryType
  size?: number
  className?: string
}) {
  const { Icon, cor, fundo, label } = TEMPLATE_CATEGORIES[category]
  return (
    <span
      className={className}
      style={{
        width: size, height: size, background: fundo, color: cor,
        borderRadius: size >= 30 ? 8 : 6,
        display: 'inline-flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
      }}
      aria-hidden
      title={label}
    >
      <Icon style={{ width: Math.round(size * 0.47), height: Math.round(size * 0.47) }} strokeWidth={1.75} />
    </span>
  )
}
