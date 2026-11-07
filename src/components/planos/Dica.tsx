// Retomadas (06/11): o "ⓘ" das telas dos planos de ação. Mostra a explicação ao passar o mouse,
// ao chegar pelo teclado e ao TOCAR (no celular o toque foca o botão; o balão some ao tocar fora).
import { Info } from 'lucide-react'
import type { ReactNode } from 'react'
import { Tooltip } from '@/components/ui/Tooltip'

export function Dica({ texto, rotulo = 'O que é isto?', lado = 'top' }: { texto: string; rotulo?: string; lado?: 'top' | 'bottom' | 'left' | 'right' }) {
  return (
    <Tooltip content={texto} side={lado} wide>
      <button type="button" aria-label={`${rotulo} ${texto}`}
        onClick={(e) => { e.stopPropagation(); e.currentTarget.focus() }}
        className="inline-flex items-center justify-center w-5 h-5 rounded-full text-surface-500 hover:text-surface-200 cursor-help focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500">
        <Info className="w-3.5 h-3.5" aria-hidden />
      </button>
    </Tooltip>
  )
}

/** O cabeçalho da coluna com o "ⓘ" ao lado. */
export function CabecalhoComDica({ rotulo, dica }: { rotulo: ReactNode; dica: string }) {
  return (
    <span className="inline-flex items-center gap-1">
      {rotulo}
      <Dica texto={dica} rotulo={`Sobre a coluna ${typeof rotulo === 'string' ? rotulo : ''}:`} />
    </span>
  )
}
