import { useMemo, useState } from 'react'
import { ArrowDown, ArrowUp, ChevronRight, GripVertical, Plus, Search, X } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Drawer } from '@/components/ui/Drawer'
import { Button } from '@/components/ui/Button'
import { useDragReorder } from '@/hooks/useDragReorder'
import { KPI_CATALOG, type KpiId } from '@/types/dashboard'

// Personalizar indicadores (28/09) — no mesmo desenho do "Configurar colunas"
// dos Contatos: rascunho semeado ao abrir, Salvar grava, Cancelar descarta,
// Restaurar padrão à esquerda. Antes era um overlay artesanal (z-index fixo,
// fora do useLayer, Esc vazando), cada clique gravava na hora, e não dava pra
// reordenar — embora a ordem decida o que fica em destaque na faixa.
//
// Em cima, o que está na faixa, na ordem em que aparece (arrastar ou setas).
// Embaixo, o catálogo para adicionar, com busca e filtro por categoria.
// Indicadores sem dado no backend (`hasData: false`) aparecem, mas não entram
// (ficariam em 0 para sempre — ver SCRUM-1161, R11/R12).

const KPI_MIN = 4
const KPI_MAX = 20

const CATEGORY_COLORS: Record<string, string> = {
  Atendimento: 'var(--color-accent-blue)',
  Velocidade:  'var(--color-accent-amber)',
  Qualidade:   'var(--color-accent-green)',
  Volume:      'var(--color-accent-cyan)',
  Bot:         'var(--color-accent-violet)',
  Equipe:      'var(--color-status-muted)',
  Disparos:    'var(--color-warning)',
  Marketing:   'var(--color-accent-blue)',
  Clínica:     'var(--color-accent-rose)',
}

const DEF_BY_ID = new Map(KPI_CATALOG.map((d) => [d.id, d]))
const CATEGORIAS = [...new Set(KPI_CATALOG.map((d) => d.category))]

function semAcento(s: string): string {
  return s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase()
}

function PontoDaCategoria({ categoria }: { categoria: string }) {
  return (
    <span
      className="w-1.5 h-1.5 rounded-full flex-shrink-0"
      style={{ backgroundColor: CATEGORY_COLORS[categoria] ?? 'var(--color-status-muted)' }}
      aria-hidden
    />
  )
}

interface Props {
  open: boolean
  onClose: () => void
  slots: KpiId[]
  defaults: KpiId[]
  onSave: (slots: KpiId[]) => void
}

export function KpiCustomizerDrawer({ open, onClose, slots, defaults, onSave }: Props) {
  const [rascunho, setRascunho] = useState<KpiId[]>(slots)
  const [busca, setBusca] = useState('')
  const [categoria, setCategoria] = useState<string | null>(null)
  const [verSemDado, setVerSemDado] = useState(false)

  // Semeia o rascunho a cada abertura (ajuste durante a renderização, como no
  // ContactsColumnsModal): Cancelar não deixa rastro.
  const [estavaAberto, setEstavaAberto] = useState(open)
  if (open !== estavaAberto) {
    setEstavaAberto(open)
    if (open) {
      setRascunho(slots)
      setBusca('')
      setCategoria(null)
      setVerSemDado(false)
    }
  }

  const { overIdx, handleDragStart, handleDragOver, handleDrop, handleDragEnd } = useDragReorder(
    rascunho,
    (reordenado) => setRascunho(reordenado),
  )

  const count = rascunho.length
  const cheio = count >= KPI_MAX
  const noMinimo = count <= KPI_MIN

  const mover = (idx: number, delta: -1 | 1) => {
    const alvo = idx + delta
    if (alvo < 0 || alvo >= rascunho.length) return
    setRascunho((prev) => {
      const next = [...prev]
      ;[next[idx], next[alvo]] = [next[alvo], next[idx]]
      return next
    })
  }
  const remover = (id: KpiId) => { if (!noMinimo) setRascunho((prev) => prev.filter((s) => s !== id)) }
  const adicionar = (id: KpiId) => { if (!cheio) setRascunho((prev) => (prev.includes(id) ? prev : [...prev, id])) }

  // O que dá para adicionar vem primeiro; o que ainda não tem dado fica num
  // grupo recolhido no fim (são a maioria do catálogo e escondiam o resto).
  const [comDado, semDadoLista] = useMemo(() => {
    const termo = semAcento(busca.trim())
    const filtrados = KPI_CATALOG.filter((d) =>
      !rascunho.includes(d.id)
      && (!categoria || d.category === categoria)
      && (!termo || semAcento(d.label).includes(termo) || semAcento(d.category).includes(termo)),
    )
    return [filtrados.filter((d) => d.hasData !== false), filtrados.filter((d) => d.hasData === false)]
  }, [rascunho, busca, categoria])
  // Buscando, o grupo sem dado abre sozinho: quem digitou "NPS" quer ver o NPS.
  const semDadoAberto = verSemDado || busca.trim().length > 0

  const mudou = rascunho.length !== slots.length || rascunho.some((id, i) => id !== slots[i])

  return (
    <Drawer
      open={open}
      onClose={onClose}
      side="right"
      ariaLabel="Personalizar indicadores"
      className="w-full sm:w-[440px] max-w-full bg-surface-950"
    >
      <header className="flex items-start justify-between gap-3 px-[18px] py-3.5 border-b border-surface-700 flex-shrink-0">
        <div className="min-w-0">
          <h2 className="text-[15px] font-display font-bold tracking-[-0.01em] text-surface-50">Personalizar indicadores</h2>
          <p className="text-[12.5px] text-surface-400 mt-0.5">Escolha e ordene o que aparece no topo. Vale só para você.</p>
        </div>
        <button
          type="button"
          onClick={onClose}
          aria-label="Fechar"
          className="p-1.5 rounded-lg text-surface-500 hover:text-surface-200 hover:bg-[var(--rowhover)] transition-colors"
        >
          <X className="w-4 h-4" />
        </button>
      </header>

      <div className="flex-1 min-h-0 overflow-y-auto">
        {/* ── Na faixa ─────────────────────────────────────────────────── */}
        <section aria-labelledby="kpi-na-faixa" className="px-[18px] pt-4 pb-3">
          <div className="flex items-baseline gap-2 mb-2">
            <h3 id="kpi-na-faixa" className="text-[11px] font-bold uppercase tracking-[0.1em] text-surface-400">Na faixa</h3>
            <span className="text-[11.5px] text-surface-500 tabular-nums">{count} de {KPI_MAX} · mínimo {KPI_MIN}</span>
          </div>
          <p className="text-[11.5px] text-surface-500 mb-2">Os 5 primeiros formam a primeira linha. Arraste para mudar a ordem.</p>
          <ol className="rounded-lg border border-surface-700 bg-surface-800 overflow-hidden" data-testid="kpi-selecionados">
            {rascunho.map((id, idx) => {
              const def = DEF_BY_ID.get(id)
              if (!def) return null
              const ultimo = idx === rascunho.length - 1
              return (
                <li
                  key={id}
                  draggable
                  onDragStart={() => handleDragStart(idx)}
                  onDragOver={(e) => handleDragOver(e, idx)}
                  onDrop={() => handleDrop(idx)}
                  onDragEnd={handleDragEnd}
                  className={cn(
                    'group flex items-center gap-2 h-10 pl-2 pr-1.5 transition-colors',
                    !ultimo && 'border-b border-surface-700',
                    idx === 4 && !ultimo && 'border-b-[var(--bd2)] border-dashed',
                    overIdx === idx ? 'bg-brand-500/10' : 'hover:bg-[var(--rowhover)]',
                  )}
                >
                  <GripVertical className="w-3.5 h-3.5 flex-shrink-0 text-surface-500 cursor-grab active:cursor-grabbing" aria-hidden />
                  <span className="w-5 text-right text-[11px] font-semibold text-surface-500 tabular-nums flex-shrink-0">{idx + 1}</span>
                  <PontoDaCategoria categoria={def.category} />
                  <span className="flex-1 min-w-0 text-[13px] font-medium text-surface-100 truncate">
                    {def.label}
                    {def.hasData === false && <span className="ml-1.5 text-[11px] font-normal text-surface-500">sem dado</span>}
                  </span>
                  {/* Toque não tem hover nem arrastar (HTML5 drag): no celular as setas ficam sempre à vista. */}
                  <span className="flex items-center opacity-0 group-hover:opacity-100 focus-within:opacity-100 [@media(hover:none)]:opacity-100 transition-opacity">
                    <button
                      type="button"
                      onClick={() => mover(idx, -1)}
                      disabled={idx === 0}
                      aria-label={`Subir ${def.label}`}
                      className="p-1 rounded-md text-surface-500 hover:text-surface-200 hover:bg-[var(--rowhover)] disabled:opacity-30 disabled:pointer-events-none"
                    >
                      <ArrowUp className="w-3.5 h-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={() => mover(idx, 1)}
                      disabled={ultimo}
                      aria-label={`Descer ${def.label}`}
                      className="p-1 rounded-md text-surface-500 hover:text-surface-200 hover:bg-[var(--rowhover)] disabled:opacity-30 disabled:pointer-events-none"
                    >
                      <ArrowDown className="w-3.5 h-3.5" />
                    </button>
                  </span>
                  <button
                    type="button"
                    onClick={() => remover(id)}
                    disabled={noMinimo}
                    aria-label={`Tirar ${def.label} da faixa`}
                    title={noMinimo ? `A faixa precisa de pelo menos ${KPI_MIN} indicadores` : 'Tirar da faixa'}
                    className="p-1 rounded-md text-surface-500 hover:text-danger hover:bg-[var(--rowhover)] disabled:opacity-30 disabled:pointer-events-none"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </li>
              )
            })}
          </ol>
        </section>

        {/* ── Adicionar ────────────────────────────────────────────────── */}
        <section aria-labelledby="kpi-adicionar" className="px-[18px] pt-2 pb-5">
          <h3 id="kpi-adicionar" className="text-[11px] font-bold uppercase tracking-[0.1em] text-surface-400 mb-2">Adicionar</h3>
          <div className="relative mb-2.5">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-surface-500 pointer-events-none" aria-hidden />
            <input
              type="search"
              value={busca}
              onChange={(e) => setBusca(e.target.value)}
              placeholder="Buscar indicador..."
              aria-label="Buscar indicador"
              className="w-full h-8 pl-8 pr-2.5 rounded-sm text-[13px] bg-surface-800 border border-[var(--bd2)] text-surface-100 placeholder:text-surface-500 focus:outline-none focus:border-brand-500 transition-colors"
            />
          </div>
          <div className="flex flex-wrap gap-1 mb-3" role="group" aria-label="Filtrar por categoria">
            {[null, ...CATEGORIAS].map((cat) => {
              const ativo = categoria === cat
              return (
                <button
                  key={cat ?? 'todas'}
                  type="button"
                  aria-pressed={ativo}
                  onClick={() => setCategoria(cat)}
                  className={cn(
                    'inline-flex items-center gap-1.5 h-6 px-2 rounded-[6px] text-[11.5px] font-semibold transition-colors',
                    ativo
                      ? 'bg-[var(--ink-bg)] text-[var(--ink-fg)]'
                      : 'text-surface-400 border border-surface-700 hover:text-surface-200 hover:bg-[var(--rowhover)]',
                  )}
                >
                  {cat && <PontoDaCategoria categoria={cat} />}
                  {cat ?? 'Todas'}
                </button>
              )
            })}
          </div>

          {comDado.length === 0 && semDadoLista.length === 0 ? (
            <p className="py-6 text-center text-[12.5px] text-surface-500">
              {busca || categoria ? 'Nenhum indicador com esse filtro.' : 'Todos os indicadores já estão na faixa.'}
            </p>
          ) : (
            <>
              {comDado.length > 0 ? (
                <ul className="rounded-lg border border-surface-700 bg-surface-800 overflow-hidden" data-testid="kpi-disponiveis">
                  {comDado.map((def, i) => (
                    <li
                      key={def.id}
                      className={cn('flex items-center gap-2.5 h-10 pl-3 pr-1.5', i < comDado.length - 1 && 'border-b border-surface-700')}
                    >
                      <PontoDaCategoria categoria={def.category} />
                      <span className="flex-1 min-w-0 leading-[1.25]">
                        <span className="block text-[13px] font-medium text-surface-100 truncate">{def.label}</span>
                        <span className="block text-[11px] text-surface-500 truncate">{def.category}</span>
                      </span>
                      <button
                        type="button"
                        onClick={() => adicionar(def.id)}
                        disabled={cheio}
                        aria-label={`Adicionar ${def.label}`}
                        title={cheio ? `Limite de ${KPI_MAX} indicadores` : 'Adicionar à faixa'}
                        className="inline-flex items-center gap-1 h-7 px-2 rounded-sm text-[12px] font-semibold text-surface-300 hover:text-surface-100 hover:bg-[var(--rowhover)] disabled:opacity-40 disabled:pointer-events-none transition-colors"
                      >
                        <Plus className="w-3.5 h-3.5" aria-hidden />
                        Adicionar
                      </button>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="py-3 text-[12.5px] text-surface-500">Nada disponível para adicionar com esse filtro.</p>
              )}

              {semDadoLista.length > 0 && (
                <div className="mt-3">
                  <button
                    type="button"
                    onClick={() => setVerSemDado((v) => !v)}
                    aria-expanded={semDadoAberto}
                    className="flex items-center gap-1.5 text-[12px] font-semibold text-surface-400 hover:text-surface-200 transition-colors"
                  >
                    <ChevronRight className={cn('w-3.5 h-3.5 transition-transform', semDadoAberto && 'rotate-90')} aria-hidden />
                    Ainda sem dado
                    <span className="font-normal text-surface-500 tabular-nums">{semDadoLista.length}</span>
                  </button>
                  {semDadoAberto && (
                    <>
                      <p className="mt-1 mb-2 text-[11.5px] text-surface-500">
                        O sistema ainda não calcula estes indicadores — ficariam em 0, por isso não entram na faixa.
                      </p>
                      <ul className="rounded-lg border border-dashed border-[var(--bd2)] overflow-hidden" data-testid="kpi-sem-dado">
                        {semDadoLista.map((def, i) => (
                          <li
                            key={def.id}
                            className={cn('flex items-center gap-2.5 h-9 px-3', i < semDadoLista.length - 1 && 'border-b border-surface-700')}
                          >
                            <PontoDaCategoria categoria={def.category} />
                            <span className="flex-1 min-w-0 text-[12.5px] text-surface-500 truncate">{def.label}</span>
                            <span className="text-[11px] text-surface-600 flex-shrink-0">{def.category}</span>
                          </li>
                        ))}
                      </ul>
                    </>
                  )}
                </div>
              )}
            </>
          )}
        </section>
      </div>

      <footer className="flex items-center justify-between gap-2 px-[18px] py-3 border-t border-surface-700 flex-shrink-0">
        <Button variant="ghost" size="sm" onClick={() => setRascunho(defaults)}>Restaurar padrão</Button>
        <div className="flex items-center gap-2">
          <Button variant="neutral" size="md" onClick={onClose}>Cancelar</Button>
          <Button variant="primary" size="md" onClick={() => { onSave(rascunho); onClose() }} disabled={!mudou}>Salvar</Button>
        </div>
      </footer>
    </Drawer>
  )
}
