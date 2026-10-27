import type { ReactNode } from 'react'
import { useMediaQuery } from '@/hooks/useMediaQuery'
import { cn } from '@/lib/utils'
import { useSuporte } from './suporteDaConversa'
import { useMarcacao } from './marcacaoDoChamado'

/**
 * Reavaliação de UX de 27/10: abaixo de 1280 px, lista + chat + painel do
 * chamado deixavam o chat com ~210 px (o cartão da janela de 24 h quebrava
 * palavra por palavra). Enquanto o painel do chamado está aberto, a coluna
 * (lista de conversas) sai da frente; fechou o painel, ela volta.
 */
export function ColunaQueCedeAoChamado({ children, className }: { children: ReactNode; className?: string }) {
  const s = useSuporte()
  const painelAberto = useMarcacao(s.store, (e) => s.ligado && s.emPainel && e.painelAberto)
  const cabe = useMediaQuery('(min-width: 1280px)')
  return <div className={cn(className, painelAberto && !cabe && 'hidden')}>{children}</div>
}
