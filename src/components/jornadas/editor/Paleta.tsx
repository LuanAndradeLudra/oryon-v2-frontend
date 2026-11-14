import { useState } from 'react'
import { Search, Sparkles } from 'lucide-react'
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
  const nada = ORDEM.every((g) => !catalogo.steps.some((s) => s.group === g && (!termo || s.label.toLowerCase().includes(termo) || s.description.toLowerCase().includes(termo))))
  return (
    <aside className="w-[248px] shrink-0 border-r border-surface-700 bg-surface-900 flex flex-col min-h-0" aria-label="Paleta de passos">
      <div className="shrink-0 px-4 pt-4 pb-3 space-y-3 border-b border-surface-700">
        <p className="text-[15px] font-semibold text-surface-50 leading-5">Passos</p>
        <div className="relative">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-surface-500" aria-hidden />
          <Input size="sm" className="pl-8" placeholder="Buscar passo" value={busca} onChange={(e) => setBusca(e.target.value)} aria-label="Buscar passo" />
        </div>
      </div>
      <div className="flex-1 min-h-0 overflow-y-auto px-2 py-3 space-y-4">
        {nada && <p className="px-2 text-[12px] text-surface-500">Nenhum passo com "{busca}".</p>}
        {ORDEM.map((grupo) => {
          const passos = catalogo.steps.filter((s) => s.group === grupo && (!termo || s.label.toLowerCase().includes(termo) || s.description.toLowerCase().includes(termo)))
          if (!passos.length) return null
          return (
            <div key={grupo}>
              <p className="px-2 pb-1.5 text-[11px] font-semibold uppercase tracking-[0.06em] text-surface-500">{ROTULO_DO_GRUPO[grupo]}</p>
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
                        title={emBreve ? `${s.description}` : `${s.description}\n\nArraste para o canvas ou clique para adicionar.`}
                        className={cn(
                          'group w-full flex items-center gap-2.5 rounded-[8px] px-2 py-1.5 text-left transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500',
                          emBreve ? 'cursor-not-allowed opacity-50' : 'hover:bg-[var(--rowhover)] cursor-grab active:cursor-grabbing',
                        )}
                      >
                        <span className="inline-flex items-center justify-center w-7 h-7 rounded-[7px] bg-surface-800 text-surface-200 shrink-0 group-hover:text-surface-50"><IconeDoCatalogo nome={s.icon} className="w-3.5 h-3.5" /></span>
                        <span className="min-w-0 flex-1">
                          <span className="block truncate text-[13px] font-medium text-surface-100">{s.label}</span>
                          {emBreve
                            ? <span className="block text-[11px] text-surface-500">Próximo épico</span>
                            : s.cost.credits > 0 && <span className="flex items-center gap-1 text-[11px] text-[color-mix(in_srgb,var(--color-accent-violet)_80%,var(--color-surface-50))]"><Sparkles className="w-3 h-3" aria-hidden />{s.cost.label}</span>}
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
      <p className="shrink-0 border-t border-surface-700 px-4 py-3 text-[11.5px] leading-relaxed text-surface-500">
        Arraste até o canvas, ou clique para adicionar logo abaixo do passo selecionado.
      </p>
    </aside>
  )
}
