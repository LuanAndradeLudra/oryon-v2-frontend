import { useState } from 'react'
import { Search } from 'lucide-react'
import { Input } from '@/components/ui/Input'
import { cn } from '@/lib/utils'
import type { Catalogo, GrupoDoPasso } from '@/services/jornadas/tipos'
import { ROTULO_DO_GRUPO } from '@/services/jornadas/catalogo'
import { IconeDoCatalogo } from '../comum'

/**
 * A paleta: os passos do catálogo, por grupo. Arraste para o canvas ou clique
 * para pôr abaixo do passo escolhido. Os do próximo épico aparecem desligados.
 */

export const TIPO_ARRASTADO = 'application/x-oryon-passo'
const ORDEM: GrupoDoPasso[] = ['mensagem', 'controle', 'conversa', 'crm', 'integracao', 'ia']

export function Paleta({ catalogo, onAdicionar }: { catalogo: Catalogo; onAdicionar: (type: string) => void }) {
  const [busca, setBusca] = useState('')
  const termo = busca.trim().toLowerCase()
  return (
    <aside className="w-[232px] shrink-0 border-r border-surface-700 bg-surface-900 flex flex-col" aria-label="Paleta de passos">
      <div className="p-3 border-b border-surface-700">
        <div className="relative">
          <Search className="absolute left-2 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-surface-500" aria-hidden />
          <Input size="sm" className="pl-7" placeholder="Buscar passo" value={busca} onChange={(e) => setBusca(e.target.value)} aria-label="Buscar passo" />
        </div>
      </div>
      <div className="flex-1 overflow-y-auto px-2 py-2 space-y-3">
        {ORDEM.map((grupo) => {
          const passos = catalogo.steps.filter((s) => s.group === grupo && (!termo || s.label.toLowerCase().includes(termo) || s.description.toLowerCase().includes(termo)))
          if (!passos.length) return null
          return (
            <div key={grupo}>
              <p className="px-1.5 pb-1 text-[10.5px] font-semibold uppercase tracking-wide text-surface-500">{ROTULO_DO_GRUPO[grupo]}</p>
              <ul className="space-y-0.5">
                {passos.map((s) => {
                  const emBreve = s.availability === 'soon'
                  return (
                    <li key={s.type}>
                      <button
                        type="button"
                        disabled={emBreve}
                        draggable={!emBreve}
                        onDragStart={(e) => { e.dataTransfer.setData(TIPO_ARRASTADO, s.type); e.dataTransfer.effectAllowed = 'move' }}
                        onClick={() => onAdicionar(s.type)}
                        title={s.description}
                        className={cn(
                          'w-full flex items-center gap-2 rounded-[7px] px-1.5 py-1.5 text-left transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500',
                          emBreve ? 'cursor-not-allowed opacity-55' : 'hover:bg-[var(--rowhover)] cursor-grab active:cursor-grabbing',
                        )}
                      >
                        <span className="inline-flex items-center justify-center w-6 h-6 rounded-[6px] bg-surface-800 text-surface-200 shrink-0"><IconeDoCatalogo nome={s.icon} className="w-3.5 h-3.5" /></span>
                        <span className="min-w-0 flex-1">
                          <span className="block truncate text-[12.5px] font-medium text-surface-100">{s.label}</span>
                          {(emBreve || s.cost.credits > 0) && (
                            <span className="block text-[10.5px] text-surface-500">{emBreve ? 'Próximo épico' : s.cost.label}</span>
                          )}
                        </span>
                      </button>
                    </li>
                  )
                })}
              </ul>
            </div>
          )
        })}
      </div>
    </aside>
  )
}
