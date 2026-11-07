// Retomadas (06/11): o "Resultado" de um contato (ou dos marcados). Em vez de uma lista seca, cada
// opção diz o que quer dizer e o que acontece com o contato (sai da lista ou continua). Consulta
// marcada pelo WhatsApp ou pela agenda não precisa ser marcada: o sistema reconhece sozinho.
// O menu é sólido (não o vidro dos outros): é texto corrido, e o vidro deixava a tabela vazar.
import { useState } from 'react'
import { Check, ChevronDown } from 'lucide-react'
import { Dropdown, DropdownItem, DropdownSeparator } from '@/components/ui/Dropdown'
import { DESFECHOS_DA_EQUIPE, ROTULO_DO_DESFECHO } from '@/lib/planosDeAcao'
import type { DesfechoDaEquipe } from '@/services/followUpsApi'
import { cn } from '@/lib/utils'

export function EscolhaDoResultado({ pergunta, atual, rotulo, ariaLabel, ocupado = false, alinhar = 'right', onEscolher }: {
  /** O título do menu: "O que aconteceu com Lucas?" */
  pergunta: string
  /** O resultado que o contato já tem e que ainda deixa trabalhar ("Falou, sem marcar"). */
  atual: DesfechoDaEquipe | null
  /** O texto do botão sem resultado: "Marcar resultado", "Marcar", "Marcar os 3 como…". */
  rotulo: string
  ariaLabel: string
  ocupado?: boolean
  alinhar?: 'left' | 'right'
  onEscolher: (d: DesfechoDaEquipe) => void
}) {
  const [aberto, setAberto] = useState(false)
  return (
    <span onClick={(e) => e.stopPropagation()}>
      <Dropdown open={aberto} onClose={() => setAberto(false)} align={alinhar} className="w-[340px] max-w-[calc(100vw-24px)] ![background-color:var(--color-overlay)] ![backdrop-filter:none]"
        anchor={
          <button type="button" disabled={ocupado} aria-haspopup="menu" aria-expanded={aberto} aria-label={ariaLabel}
            onClick={() => setAberto((v) => !v)}
            className={cn(
              'inline-flex items-center gap-1.5 h-8 px-2.5 rounded-[8px] border text-[13px] font-medium whitespace-nowrap transition-colors cursor-pointer',
              'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 disabled:opacity-50 disabled:cursor-wait',
              atual ? 'border-surface-600 bg-surface-800 text-surface-100 hover:bg-[var(--rowhover)]' : 'border-[var(--bd2)] bg-surface-900 text-surface-200 hover:bg-[var(--rowhover)]',
            )}>
            {atual ? ROTULO_DO_DESFECHO[atual] : rotulo}
            <ChevronDown className="w-3.5 h-3.5 text-surface-400" aria-hidden />
          </button>
        }>
        <p className="px-2 pt-1.5 pb-1 text-xs font-semibold text-surface-400">{pergunta}</p>
        {DESFECHOS_DA_EQUIPE.map((d) => (
          <DropdownItem key={d.id} active={atual === d.id} onClick={() => { setAberto(false); onEscolher(d.id) }} className="h-auto py-1.5 items-start">
            <span className="flex flex-col gap-0.5 min-w-0 whitespace-normal">
              <span className="flex items-center gap-1.5 font-semibold">
                {d.rotulo}
                {atual === d.id && <Check className="w-3.5 h-3.5 text-brand-500" aria-label="(atual)" />}
              </span>
              <span className="text-xs text-surface-400 leading-snug">{d.explica}</span>
            </span>
          </DropdownItem>
        ))}
        <DropdownSeparator />
        <p className="px-2 pb-1.5 text-xs text-surface-400 leading-snug">Marcou pelo WhatsApp ou pela agenda? Aparece “Marcou” sozinho.</p>
      </Dropdown>
    </span>
  )
}
