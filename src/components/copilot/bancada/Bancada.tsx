import { useEffect, useMemo, type ReactNode } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { ArrowLeft, FileText, Globe, Layers, ListChecks, Presentation, Sheet, ShieldCheck, X } from 'lucide-react'
import { cn } from '@/lib/utils'
import { SegmentedControl } from '@/components/ui/SegmentedControl'
import { useArtifactContext } from '@/contexts/ArtifactContext'
import type { AbaDaBancada, ContextoDaBancada } from '../SessionChat'
import { ehLote, pendente } from './lotes'
import { ApprovalReviewPanel } from '../ApprovalReviewPanel'
import { RegistroDeAprovacao } from '../RegistroDeAprovacao'
import { PlanCard } from '../PlanCard'
import { ToolCallChip } from '../CopilotMessage'
import { ArtifactPanel } from '../ArtifactPanel'

// ─── Bancada do Copilot (proposta SCRUM-1253, "Conversa + bancada") ─────────
// Tudo o que a conversa produz tem lugar fixo aqui: as ações a aprovar (sem
// modal), os resultados das consultas e os artefatos. A conversa fica só com
// o texto e atalhos que trazem para cá.



interface BancadaProps {
  /** null = ainda não há conversa: a bancada mostra `inicio`. */
  ctx: ContextoDaBancada | null
  aba: AbaDaBancada
  onAba: (aba: AbaDaBancada) => void
  /** Item a destacar (vem do atalho na conversa). */
  foco?: string | null
  inicio?: ReactNode
  /** Celular: a bancada vira folha inferior. */
  celular?: boolean
  aberta?: boolean
  onFechar?: () => void
}

export function Bancada({ ctx, aba, onAba, foco, inicio, celular = false, aberta = true, onFechar }: BancadaProps) {
  const { artifacts, artifact, openExisting, closeArtifact } = useArtifactContext()
  const messages = useMemo(() => ctx?.messages ?? [], [ctx?.messages])

  const lotes = useMemo(() => messages.flatMap((m) => (m.toolCalls ?? []).filter(ehLote)), [messages])
  const pendentes = lotes.filter(pendente)
  const decididos = lotes.filter((tc) => !pendente(tc))
  const comResultado = useMemo(
    () => messages.filter((m) => m.role === 'assistant' && (m.plan || (m.toolCalls ?? []).some((tc) => !ehLote(tc)))),
    [messages],
  )

  // Leva o item em foco à vista e o destaca por um instante.
  useEffect(() => {
    if (!foco) return
    const el = document.getElementById(`bancada-${foco}`)
    el?.scrollIntoView?.({ behavior: 'smooth', block: 'start' })
  }, [foco, aba])

  const opcoes = [
    { value: 'aprovacoes' as const, label: 'Aprovações', count: ctx ? pendentes.length : undefined },
    { value: 'resultados' as const, label: 'Resultados', count: ctx ? comResultado.length : undefined },
    { value: 'artefatos' as const, label: 'Artefatos', count: artifacts.length },
  ]

  const conteudo = !ctx && inicio ? inicio : (
    <>
      {aba === 'aprovacoes' && (
        <div className="flex flex-col gap-4">
          {pendentes.length === 0 ? (
            <Vazio
              icone={<ShieldCheck className="w-5 h-5" aria-hidden />}
              titulo="Nada esperando sua aprovação"
              texto="Quando o Copilot preparar uma mudança no CRM — cadastrar, etiquetar, disparar —, ela aparece aqui para você revisar antes de acontecer."
            />
          ) : pendentes.map((tc) => (
            <div key={tc.id} id={`bancada-${tc.id}`}
              className={cn('scroll-mt-4 rounded-[10px] border overflow-hidden bg-surface-800 transition-shadow duration-500',
                foco === tc.id ? 'border-brand-500 shadow-[0_0_0_3px_color-mix(in_oklab,var(--color-brand-500)_22%,transparent)]' : 'border-surface-700')}>
              <ApprovalReviewPanel
                tc={tc}
                onResolve={(ids, edits) => ctx?.resolveBatch(tc.id, ids, edits)}
                onReject={() => ctx?.resolveBatch(tc.id, [])}
              />
            </div>
          ))}
          {decididos.length > 0 && (
            <section className="flex flex-col gap-1.5">
              <h3 className="text-xs font-medium text-surface-400 pt-2">Já decididas</h3>
              {decididos.map((tc) => <RegistroDeAprovacao key={tc.id} tc={tc} />)}
            </section>
          )}
        </div>
      )}

      {aba === 'resultados' && (
        comResultado.length === 0 ? (
          <Vazio
            icone={<ListChecks className="w-5 h-5" aria-hidden />}
            titulo="Nenhum resultado ainda"
            texto="Planos e consultas aos seus dados aparecem aqui, separados da conversa, para você conferir com calma."
          />
        ) : (
          <div className="flex flex-col gap-6">
            {comResultado.map((m) => {
              const i = messages.indexOf(m)
              const pergunta = [...messages.slice(0, i)].reverse().find((x) => x.role === 'user')
              const soltas = (m.toolCalls ?? []).filter((tc) => !ehLote(tc) && (!m.plan || !tc.stepId))
              return (
                <section key={m.id} id={`bancada-${m.id}`} className={cn('scroll-mt-4 rounded-[10px] transition-shadow duration-500', foco === m.id && 'shadow-[0_0_0_3px_color-mix(in_oklab,var(--color-brand-500)_22%,transparent)]')}>
                  <header className="mb-2">
                    <p className="text-xs text-surface-400">
                      Pedido às {new Date(m.timestamp).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                    </p>
                    {pergunta && <h3 className="text-[13px] font-semibold text-surface-100 line-clamp-2">{pergunta.content}</h3>}
                  </header>
                  {m.plan && <PlanCard plan={m.plan} toolCalls={m.toolCalls} onSendFollowup={ctx ? (t) => ctx.enviar(t) : undefined} />}
                  {soltas.length > 0 && (
                    <div className="flex flex-col gap-1.5 mt-2">
                      {soltas.map((tc) => <ToolCallChip key={tc.id} tc={tc} onSendFollowup={ctx ? (t) => ctx.enviar(t) : undefined} />)}
                    </div>
                  )}
                </section>
              )
            })}
          </div>
        )
      )}

      {aba === 'artefatos' && (
        artifacts.length === 0 ? (
          <Vazio
            icone={<Layers className="w-5 h-5" aria-hidden />}
            titulo="Nenhum artefato ainda"
            texto="Peça um documento, uma apresentação ou uma planilha. O que o Copilot criar fica guardado aqui."
          />
        ) : (
          <ul className="flex flex-col divide-y divide-surface-700 rounded-[10px] border border-surface-700 overflow-hidden">
            {artifacts.map((art) => (
              <li key={art.id}>
                <button type="button" onClick={() => openExisting(art.id)}
                  className="w-full flex items-center gap-3 px-3.5 py-2.5 text-left hover:bg-[var(--rowhover)] transition-colors focus-visible:outline-none focus-visible:bg-[var(--rowhover)]">
                  <span className="w-8 h-8 rounded-[6px] bg-[var(--sf2)] border border-surface-700 flex items-center justify-center flex-shrink-0 text-surface-300">
                    <IconeDoArtefato tipo={art.type} />
                  </span>
                  <span className="flex-1 min-w-0">
                    <span className="block text-[13px] font-semibold text-surface-100 truncate">{art.title}</span>
                    <span className="block text-xs text-surface-400">
                      {rotuloDoTipo(art.type)} · {new Date(art.createdAt).toLocaleDateString('pt-BR')}
                      {art.versions.length > 1 && ` · ${art.versions.length} versões`}
                    </span>
                  </span>
                </button>
              </li>
            ))}
          </ul>
        )
      )}
    </>
  )

  // Artefato aberto ocupa a bancada inteira, com volta para a lista.
  const corpo = aba === 'artefatos' && artifact ? (
    <div className="flex-1 min-h-0 flex flex-col">
      <div className="flex items-center h-10 px-3 border-b border-surface-700 flex-shrink-0">
        <button type="button" onClick={closeArtifact} className="inline-flex items-center gap-1.5 h-7 px-2 rounded-[6px] text-xs font-semibold text-surface-300 hover:text-surface-100 hover:bg-[var(--rowhover)]">
          <ArrowLeft className="w-3.5 h-3.5" aria-hidden /> Artefatos
        </button>
      </div>
      <div className="flex-1 min-h-0 flex [&>div]:!w-full [&>div]:!border-l-0">
        <ArtifactPanel />
      </div>
    </div>
  ) : (
    <div className="flex-1 min-h-0 overflow-y-auto px-5 py-4">{conteudo}</div>
  )

  const cabecalho = (
    <div className="flex items-center gap-2 h-12 px-4 border-b border-surface-700 flex-shrink-0">
      {ctx || !inicio ? (
        <SegmentedControl label="Bancada" size="sm" variant="ink" value={aba} onChange={onAba} options={opcoes} />
      ) : (
        <h2 className="text-[13px] font-semibold text-surface-100">Para começar</h2>
      )}
      {celular && onFechar && (
        <button type="button" onClick={onFechar} aria-label="Fechar bancada"
          className="ml-auto w-8 h-8 rounded-[6px] flex items-center justify-center text-surface-400 hover:text-surface-100 hover:bg-[var(--rowhover)]">
          <X className="w-4 h-4" aria-hidden />
        </button>
      )}
    </div>
  )

  if (celular) {
    return (
      <AnimatePresence>
        {aberta && (
          <>
            <div className="overlay-scrim" aria-hidden onClick={onFechar} />
            <motion.aside
              role="dialog" aria-modal="true" aria-label="Bancada do Copilot"
              initial={{ y: '100%' }} animate={{ y: 0 }} exit={{ y: '100%' }}
              transition={{ type: 'spring', damping: 32, stiffness: 320 }}
              className="fixed inset-x-0 bottom-0 z-[90] h-[86dvh] flex flex-col bg-surface-800 rounded-t-[14px] border-t border-surface-700 shadow-2xl"
            >
              <span className="mx-auto mt-2 mb-1 h-1 w-9 rounded-full bg-surface-600" aria-hidden />
              {cabecalho}
              {corpo}
            </motion.aside>
          </>
        )}
      </AnimatePresence>
    )
  }

  return (
    // Largura contida (PO, 08/10): a bancada equilibra com a conversa em vez de
    // dominar a tela — ~46% até 560px, nunca abaixo de 380px.
    <aside aria-label="Bancada do Copilot" className="w-[clamp(380px,46%,560px)] flex-shrink-0 min-w-0 flex flex-col bg-surface-800 border-l border-surface-700">
      {cabecalho}
      {corpo}
    </aside>
  )
}

function Vazio({ icone, titulo, texto }: { icone: ReactNode; titulo: string; texto: string }) {
  return (
    <div className="max-w-sm mx-auto text-center pt-12">
      <span className="inline-flex w-10 h-10 rounded-[8px] bg-[var(--sf2)] border border-surface-700 items-center justify-center text-surface-400 mb-3">
        {icone}
      </span>
      <p className="text-[13px] font-semibold text-surface-100">{titulo}</p>
      <p className="text-xs text-surface-400 mt-1 leading-relaxed">{texto}</p>
    </div>
  )
}

function IconeDoArtefato({ tipo }: { tipo: string }) {
  if (tipo === 'webpage') return <Globe className="w-4 h-4" aria-hidden />
  if (tipo === 'spreadsheet') return <Sheet className="w-4 h-4" aria-hidden />
  if (tipo === 'slides' || tipo === 'slides-json') return <Presentation className="w-4 h-4" aria-hidden />
  return <FileText className="w-4 h-4" aria-hidden />
}

function rotuloDoTipo(tipo: string): string {
  if (tipo === 'webpage') return 'Página'
  if (tipo === 'spreadsheet') return 'Planilha'
  if (tipo === 'slides' || tipo === 'slides-json') return 'Apresentação'
  return 'Documento'
}
