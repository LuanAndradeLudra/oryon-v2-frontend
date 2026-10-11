import { useEffect, useMemo, useState } from 'react'
import { Check, ChevronDown, Copy, FileText, Globe, Loader2, MessagesSquare, Plus, Presentation, Search, Sheet, Trash2 } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Dropdown, DropdownSeparator } from '@/components/ui/Dropdown'
import { ConfirmModal } from '@/components/ui/Modal'
import { showToast } from '@/hooks/useToast'
import { ARTIFACT_LABELS, type CopilotSession } from '@/hooks/useCopilotSessions'

// ─── Seletor de conversa (proposta SCRUM-1253) ──────────────────────────────
// A lista fixa de 320px saiu da página: a conversa atual é um título com menu,
// como um seletor de documento. Busca, "Nova conversa", grupos por data,
// copiar título e exclusão (alcançáveis pelo teclado) ficam no menu.

function agrupar(sessions: CopilotSession[]) {
  const hoje = new Date(); hoje.setHours(0, 0, 0, 0)
  const ontem = new Date(hoje.getTime() - 86_400_000)
  const semana = new Date(hoje.getTime() - 7 * 86_400_000)
  const g: Record<string, CopilotSession[]> = { 'Hoje': [], 'Ontem': [], 'Últimos 7 dias': [], 'Mais antigas': [] }
  for (const s of sessions) {
    const d = new Date(s.updatedAt)
    if (d >= hoje) g['Hoje'].push(s)
    else if (d >= ontem) g['Ontem'].push(s)
    else if (d >= semana) g['Últimos 7 dias'].push(s)
    else g['Mais antigas'].push(s)
  }
  return Object.entries(g).filter(([, l]) => l.length > 0)
}

/** Prévia da última resposta. Artefato vem como `__artifact:<tipo>__` (ou a
 *  tag crua, no formato antigo) — mostra o tipo, não o código. */
function tipoDeArtefato(preview: string): string | null {
  return preview.match(/^__artifact:(\w+)__$/)?.[1] ?? preview.match(/^<(webpage|slides|spreadsheet|document)>/)?.[1] ?? null
}

function PreviaDaConversa({ preview }: { preview: string }) {
  const tipo = tipoDeArtefato(preview)
  if (!tipo) return <>{preview}</>
  const Icone = tipo === 'webpage' ? Globe : tipo === 'spreadsheet' ? Sheet : tipo === 'slides' ? Presentation : FileText
  return (
    <span className="inline-flex items-center gap-1">
      <Icone className="w-3 h-3 flex-shrink-0" aria-hidden />
      {ARTIFACT_LABELS[tipo] ?? 'Artefato'}
    </span>
  )
}

function textoDaPrevia(preview: string): string {
  const tipo = tipoDeArtefato(preview)
  return tipo ? (ARTIFACT_LABELS[tipo] ?? 'Artefato') : preview
}

const ATALHO_DO_SELETOR = typeof navigator !== 'undefined' && /Mac|iPhone|iPad/.test(navigator.platform) ? '⌘B' : 'Ctrl+B'

export function SeletorDeConversa({
  sessions, ativa, onSelecionar, onNova, onExcluir, aberto: abertoControlado, onAbertoChange,
  temMais = false, carregandoMais = false, onCarregarMais, buscarNoServidor, desabilitarNova = false,
}: {
  sessions: CopilotSession[]
  ativa: string | null
  onSelecionar: (id: string) => void
  onNova: () => void
  onExcluir: (id: string) => void
  /** Controlado por fora (atalho Ctrl/Cmd+B). */
  aberto?: boolean
  onAbertoChange?: (aberto: boolean) => void
  temMais?: boolean
  carregandoMais?: boolean
  onCarregarMais?: () => void
  /** Busca no servidor (título + conteúdo); `null` = filtrar a lista local. */
  buscarNoServidor?: (q: string) => Promise<CopilotSession[] | null>
  desabilitarNova?: boolean
}) {
  const [abertoLocal, setAbertoLocal] = useState(false)
  const aberto = abertoControlado ?? abertoLocal
  const setAberto = (v: boolean) => { setAbertoLocal(v); onAbertoChange?.(v) }
  const [busca, setBusca] = useState('')
  const [excluir, setExcluir] = useState<CopilotSession | null>(null)
  // Resposta do servidor para um termo (`lista: null` = filtrar localmente).
  const [respondido, setRespondido] = useState<{ q: string; lista: CopilotSession[] | null } | null>(null)
  const termo = busca.trim()
  const buscando = !!termo && !!buscarNoServidor && respondido?.q !== termo
  const atual = sessions.find((s) => s.id === ativa)

  // Busca no servidor com espera curta (digitação); sem suporte → local.
  useEffect(() => {
    if (!termo || !buscarNoServidor) return
    let cancelado = false
    const t = setTimeout(() => {
      buscarNoServidor(termo).then((lista) => {
        if (!cancelado) setRespondido({ q: termo, lista })
      })
    }, 300)
    return () => { cancelado = true; clearTimeout(t) }
  }, [termo, buscarNoServidor])

  const filtradas = useMemo(() => {
    if (!termo) return sessions
    if (respondido?.q === termo && respondido.lista) return respondido.lista
    const q = termo.toLowerCase()
    return sessions.filter((s) => s.title.toLowerCase().includes(q) || textoDaPrevia(s.preview).toLowerCase().includes(q))
  }, [sessions, termo, respondido])
  const grupos = agrupar(filtradas)

  const copiarTitulo = (s: CopilotSession) => {
    navigator.clipboard?.writeText(s.title)
      .then(() => showToast('Título copiado.', 'success'))
      .catch(() => showToast('Não foi possível copiar o título.', 'error'))
  }

  return (
    <>
      <Dropdown
        open={aberto}
        onClose={() => setAberto(false)}
        align="left"
        className="w-[min(320px,calc(100vw-24px))] p-0"
        anchor={
          <button type="button" onClick={() => setAberto(!aberto)} aria-haspopup="menu" aria-expanded={aberto}
            title={`Conversas (${ATALHO_DO_SELETOR})`}
            aria-keyshortcuts="Control+B Meta+B"
            className={cn('inline-flex items-center gap-1.5 h-8 max-w-[min(360px,40vw)] pl-2.5 pr-2 rounded-[6px] border text-[13px] transition-colors',
              aberto ? 'border-brand-500 bg-surface-800' : 'border-surface-700 bg-surface-800 hover:bg-[var(--rowhover)]')}>
            <MessagesSquare className="w-4 h-4 flex-shrink-0 text-surface-400" aria-hidden />
            <span className={cn('truncate', atual ? 'font-semibold text-surface-100' : 'text-surface-300')}>
              {atual ? atual.title : 'Conversas'}
            </span>
            <ChevronDown className={cn('w-3.5 h-3.5 flex-shrink-0 text-surface-400 transition-transform', aberto && 'rotate-180')} aria-hidden />
          </button>
        }
      >
        <div className="p-2">
          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-surface-400 pointer-events-none" aria-hidden />
            <input autoFocus value={busca} onChange={(e) => setBusca(e.target.value)} placeholder="Buscar conversas" aria-label="Buscar conversas"
              className="w-full h-8 pl-8 pr-8 text-[13px] bg-[var(--sf2)] border border-surface-700 rounded-[6px] text-surface-100 placeholder:text-surface-500 outline-none focus:border-brand-500" />
            {buscando && <Loader2 className="absolute right-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-surface-400 animate-spin" aria-label="Buscando" />}
          </div>
        </div>
        <button type="button" onClick={() => { onNova(); setAberto(false) }} disabled={desabilitarNova}
          className="mx-2 w-[calc(100%-16px)] flex items-center gap-2.5 h-8 px-2 rounded-[6px] text-[13px] font-semibold text-surface-100 hover:bg-[var(--rowhover)] disabled:opacity-50 disabled:cursor-not-allowed">
          <Plus className="w-4 h-4 text-surface-400" aria-hidden /> Nova conversa
        </button>
        <DropdownSeparator />
        <div className="max-h-[360px] overflow-y-auto px-2 pb-2">
          {grupos.length === 0 ? (
            <p className="text-xs text-surface-400 text-center py-6">{busca ? (buscando ? 'Buscando…' : `Nenhuma conversa com “${busca}”.`) : 'Nenhuma conversa ainda.'}</p>
          ) : grupos.map(([rotulo, lista]) => (
            <div key={rotulo} className="pt-1">
              <p className="text-xs font-medium text-surface-400 px-2 pt-1.5 pb-1">{rotulo}</p>
              {lista.map((s) => {
                const sel = s.id === ativa
                return (
                  <div key={s.id} className="group relative">
                    <button type="button" onClick={() => { onSelecionar(s.id); setAberto(false) }} aria-current={sel ? 'true' : undefined}
                      className={cn('w-full flex items-start gap-2 pl-2 pr-16 py-1.5 rounded-[6px] text-left transition-colors', sel ? 'bg-[var(--sel)]' : 'hover:bg-[var(--rowhover)]')}>
                      <span className="flex-1 min-w-0">
                        <span className={cn('block text-[13px] truncate', sel ? 'font-semibold text-surface-50' : 'text-surface-100')}>{s.title}</span>
                        {s.preview && <span className="block text-xs text-surface-400 truncate"><PreviaDaConversa preview={s.preview} /></span>}
                      </span>
                      {sel && <Check className="w-3.5 h-3.5 mt-0.5 flex-shrink-0 text-brand-400" aria-hidden />}
                    </button>
                    <div className="absolute right-1 top-1/2 -translate-y-1/2 flex items-center opacity-0 group-hover:opacity-100 group-focus-within:opacity-100 [@media(hover:none)]:opacity-100">
                      <button type="button" onClick={() => copiarTitulo(s)} aria-label={`Copiar o título "${s.title}"`} title="Copiar título"
                        className="w-7 h-7 rounded-[6px] flex items-center justify-center text-surface-400 hover:text-surface-100 hover:bg-[var(--rowhover)]">
                        <Copy className="w-3.5 h-3.5" aria-hidden />
                      </button>
                      <button type="button" onClick={() => setExcluir(s)} aria-label={`Excluir a conversa "${s.title}"`} title="Excluir conversa"
                        className="w-7 h-7 rounded-[6px] flex items-center justify-center text-surface-400 hover:text-danger hover:bg-danger/10">
                        <Trash2 className="w-3.5 h-3.5" aria-hidden />
                      </button>
                    </div>
                  </div>
                )
              })}
            </div>
          ))}
          {!busca.trim() && temMais && onCarregarMais && (
            <button type="button" onClick={onCarregarMais} disabled={carregandoMais}
              className="mt-1 w-full h-8 rounded-[6px] text-xs font-semibold text-surface-300 hover:text-surface-100 hover:bg-[var(--rowhover)] disabled:opacity-50 inline-flex items-center justify-center gap-1.5">
              {carregandoMais && <Loader2 className="w-3.5 h-3.5 animate-spin" aria-hidden />}
              {carregandoMais ? 'Carregando…' : 'Carregar mais conversas'}
            </button>
          )}
        </div>
        <div className="border-t border-surface-700 px-3 py-2 text-xs text-surface-400 tabular-nums">
          {busca.trim()
            ? (filtradas.length === 1 ? '1 conversa encontrada' : `${filtradas.length} conversas encontradas`)
            : (sessions.length === 1 ? '1 conversa' : `${sessions.length} conversas`) + (temMais ? ' · há mais antigas' : '')}
        </div>
      </Dropdown>
      <ConfirmModal
        open={!!excluir}
        onClose={() => setExcluir(null)}
        onConfirm={() => { if (excluir) { onExcluir(excluir.id); setExcluir(null) } }}
        title="Excluir conversa"
        description={`"${excluir?.title ?? ''}" e todas as mensagens dela serão apagadas. Não dá para desfazer.`}
        confirmLabel="Excluir conversa"
        danger
      />
    </>
  )
}
