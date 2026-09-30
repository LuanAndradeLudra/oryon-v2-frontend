import { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { AnimatePresence, motion, useInView, useReducedMotion } from 'framer-motion'
import { ArrowRight, Check, Info } from 'lucide-react'
import { cn } from '@/lib/utils'
import { MessageBubble } from '@/components/conversations/ChatWindow/MessageBubble'
import { TypingIndicator } from '@/components/conversations/ChatWindow/TypingIndicator'
import { ConversationActivitySection } from '@/components/conversations/ContactPanel/ConversationActivitySection'
import { MediaViewerProvider } from '@/components/ui/MediaViewer'
import { LANDING_ROUTES, solucoes, type AreaSolucao } from '../landingCopy'
import { Cabecalho, Revelar } from '../plataforma/SecoesVenda'
import { SIMULACOES, linhaDoTempoAte, mensagensAte } from './simulacoes'

/**
 * PARA A SUA ÁREA (30/09) — a mesma plataforma em operações diferentes, em
 * ABAS (padrão da Attio para casos de uso): uma área por vez, com a
 * simulação da conversa ao lado do que o CRM registra. Dados fictícios, e a
 * página diz isso. Na home, a versão curta; em /solucoes, todas com o texto
 * completo.
 */

/** Tempo de cada passo da simulação (ms). A resposta da IA "digita" antes. */
const PASSO_MS = 1900
const DIGITANDO_MS = 1100
const PAUSA_FIM_MS = 4200

function Simulacao({ area }: { area: AreaSolucao }) {
  const sim = SIMULACOES[area.id]
  const semMovimento = useReducedMotion()
  const ref = useRef<HTMLDivElement>(null)
  const naTela = useInView(ref, { amount: 0.35 })
  const total = sim.passos.length
  // `passo` = quantos passos já aconteceram; `digitando` = a IA escrevendo o próximo.
  const [passo, setPasso] = useState(semMovimento ? total : 1)
  const [digitando, setDigitando] = useState(false)

  useEffect(() => {
    if (semMovimento || !naTela) return
    let timer: ReturnType<typeof setTimeout>
    if (passo >= total) {
      timer = setTimeout(() => setPasso(1), PAUSA_FIM_MS)
      return () => clearTimeout(timer)
    }
    const proximo = sim.passos[passo]
    if (proximo.tipo === 'ia' && !digitando) {
      timer = setTimeout(() => setDigitando(true), 500)
    } else {
      timer = setTimeout(() => { setDigitando(false); setPasso((p) => p + 1) }, digitando ? DIGITANDO_MS : PASSO_MS)
    }
    return () => clearTimeout(timer)
  }, [passo, digitando, naTela, semMovimento, total, sim])

  const mensagens = mensagensAte(sim, passo)
  const linha = linhaDoTempoAte(sim, passo)
  const contato = { displayName: sim.contato, profilePicUrl: null }

  return (
    <div ref={ref} aria-hidden inert className="pointer-events-none grid select-none gap-3 md:grid-cols-[minmax(0,1.35fr)_minmax(0,1fr)]">
      {/* A conversa: as bolhas reais do chat da Oryon. */}
      <div className="flex h-[400px] flex-col overflow-hidden rounded-xl bg-surface-950 ring-1 ring-surface-700">
        <div className="flex items-center gap-2 border-b border-surface-700 px-3 py-2">
          <span className="flex h-6 w-6 items-center justify-center rounded-full bg-surface-800 text-[10px] font-bold text-surface-200">
            {sim.contato.split(' ').map((n) => n[0]).join('')}
          </span>
          <span className="text-[12px] font-semibold text-surface-100">{sim.contato}</span>
          <span className="ml-auto rounded-full px-2 py-0.5 text-[10px] font-semibold landing-selo">{sim.agente}</span>
        </div>
        <MediaViewerProvider>
          <div className="flex min-h-0 flex-1 flex-col justify-end gap-1 overflow-hidden px-2 py-2">
            <AnimatePresence initial={false}>
              {mensagens.map((m, i) => (
                <motion.div key={m.id} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.35 }}>
                  <MessageBubble message={m} prevMessage={mensagens[i - 1]} contact={contato} showAvatar={mensagens[i - 1]?.direction !== m.direction} />
                </motion.div>
              ))}
            </AnimatePresence>
            {digitando && <div className="flex justify-end pr-2"><TypingIndicator /></div>}
          </div>
        </MediaViewerProvider>
      </div>
      {/* O que o CRM registra: a linha do tempo real da conversa. */}
      {/* O cabeçalho do app ("Timeline" e o filtro de período) sai: na landing, o
          painel diz em português o que é, e começa explicando o que vai
          aparecer em vez de "Nenhum evento registrado" (ciclo noturno, 30/09). */}
      <div className="flex flex-col overflow-hidden rounded-xl bg-surface-900 ring-1 ring-surface-700">
        <div className="border-b border-surface-700 px-4 py-2.5">
          <p className="text-[12px] font-semibold text-surface-100">{solucoes.registroTitulo}</p>
          <p className="text-[11px] text-surface-500">{solucoes.registroSub}</p>
        </div>
        {linha.length === 0 ? (
          <p className="flex flex-1 items-center justify-center px-5 py-8 text-center text-[12.5px] leading-relaxed text-surface-500">{solucoes.registroVazio}</p>
        ) : (
          <div className="px-3 pb-2 [&_.panel-divider>div:first-child]:hidden [&_.panel-divider]:border-t-0">
            <ConversationActivitySection conversationId={`sim-${area.id}`} entries={linha} />
          </div>
        )}
      </div>
    </div>
  )
}

export function SecaoSolucoes({ completa = false, numero }: { completa?: boolean; numero?: string }) {
  const [ativa, setAtiva] = useState<string>(solucoes.areas[0].id)
  const area = solucoes.areas.find((a) => a.id === ativa) ?? solucoes.areas[0]
  return (
    <section id="solucoes" data-section="solucoes" className="relative scroll-mt-20 border-t border-[var(--landing-borda)] bg-[var(--landing-palco)] py-16 sm:py-20">
      <div className="landing-container">
        {!completa && <Cabecalho numero={numero} eyebrow={solucoes.eyebrow} titulo={solucoes.titulo} cinza={solucoes.cinza} />}
        <Revelar atraso={0.1}>
          <p className="mt-3 max-w-[64ch] text-[15px] leading-relaxed text-surface-400 sm:text-[16.5px] text-pretty">{solucoes.lead}</p>
        </Revelar>

        {/* As áreas como índice (P5, 30/09): número em mono + nome sobre uma
            régua, a ativa sublinhada; e sem a moldura em volta do painel — só
            a simulação (que tem tela dentro) fica emoldurada. */}
        <div role="tablist" aria-label={solucoes.abasLabel} className="landing-abas mt-8">
          {solucoes.areas.map((a, i) => (
            <button
              key={a.id}
              type="button"
              role="tab"
              id={`area-aba-${a.id}`}
              aria-selected={a.id === ativa}
              aria-controls="area-painel"
              onClick={() => setAtiva(a.id)}
              className={cn('landing-aba rounded-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500', a.id === ativa && 'landing-aba-ativa')}
            >
              <span data-numero>{String(i + 1).padStart(2, '0')}</span>
              {a.nome}
            </button>
          ))}
        </div>

        <div id="area-painel" role="tabpanel" aria-labelledby={`area-aba-${area.id}`} className="mt-8 grid gap-6 lg:grid-cols-[minmax(0,.8fr)_minmax(0,1.5fr)] lg:gap-10">
          <div className="min-w-0">
            <h3 className="font-display text-[clamp(1.2rem,1.7vw,1.5rem)] font-semibold leading-[1.15] tracking-[-0.02em] text-surface-50">{area.titulo}</h3>
            <p className="mt-2.5 text-[14px] leading-relaxed text-surface-400">{area.texto}</p>
            <ul className="mt-4 space-y-2">
              {area.itens.map((it) => (
                <li key={it} className="flex items-start gap-2.5 text-[14px] leading-snug text-surface-200">
                  <Check className="mt-[2px] h-3.5 w-3.5 flex-shrink-0 text-[var(--landing-destaque)]" strokeWidth={2.2} aria-hidden />
                  <span>{it}</span>
                </li>
              ))}
            </ul>
            <p className="mt-4 flex items-start gap-2 text-[12.5px] leading-relaxed text-surface-500">
              <Info className="mt-[1px] h-3.5 w-3.5 flex-shrink-0" aria-hidden />
              <span>{solucoes.aviso}</span>
            </p>
          </div>
          {/* A simulação remonta ao trocar de área (recomeça do primeiro passo). */}
          <Simulacao key={area.id} area={area} />
        </div>

        {!completa && (
          <Link to={LANDING_ROUTES.solucoes} className="mt-5 inline-flex items-center gap-1.5 rounded-sm text-[14px] font-medium text-[var(--landing-destaque)] hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500">
            {solucoes.verTodas} <ArrowRight className="h-3.5 w-3.5" aria-hidden />
          </Link>
        )}
      </div>
    </section>
  )
}
