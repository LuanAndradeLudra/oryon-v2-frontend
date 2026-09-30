import { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { AnimatePresence, motion, useInView, useReducedMotion } from 'framer-motion'
import { ArrowRight, Check, Info } from 'lucide-react'
import { cn } from '@/lib/utils'
import { MessageBubble } from '@/components/conversations/ChatWindow/MessageBubble'
import { TypingIndicator } from '@/components/conversations/ChatWindow/TypingIndicator'
import { MediaViewerProvider } from '@/components/ui/MediaViewer'
import { LANDING_ROUTES, solucoes, type AreaSolucao } from '../landingCopy'
import { Cabecalho, Revelar } from '../plataforma/SecoesVenda'
import { SIMULACOES, linhaDoTempoAte, mensagensAte } from './simulacoes'
import { teclasDasAbas } from '../ui/abasTeclado'

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
  // Cada volta da história é um ciclo: a conversa inteira sai com um fade e a
  // nova entra — antes, as bolhas sumiam de uma vez (30/09, PO: "não tem uma
  // animação suave").
  const [ciclo, setCiclo] = useState(0)

  useEffect(() => {
    if (semMovimento || !naTela) return
    let timer: ReturnType<typeof setTimeout>
    if (passo >= total) {
      timer = setTimeout(() => { setCiclo((c) => c + 1); setPasso(1) }, PAUSA_FIM_MS)
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
    <>
    {/* A simulação é visual (aria-hidden); o leitor de tela recebe a conversa
        inteira em texto (auditoria WIG, 30/09). */}
    <div className="sr-only">
      <p>Simulação de atendimento com {sim.contato}:</p>
      <ol>
        {sim.passos.map((p, i) => (
          <li key={i}>
            {p.tipo === 'cliente' ? `${sim.contato}: ${p.texto}`
              : p.tipo === 'ia' ? `${sim.agente}: ${p.texto}`
              : `Registro: ${p.resumo}`}
          </li>
        ))}
      </ol>
    </div>
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
          {/* As mensagens mais antigas saem pelo topo com um degradê, não com um corte seco. */}
          <div className="relative min-h-0 flex-1 overflow-hidden [mask-image:linear-gradient(to_bottom,transparent,black_36px)]">
            <AnimatePresence mode="wait" initial={false}>
              <motion.div
                key={ciclo}
                className="absolute inset-0 flex flex-col justify-end px-2 py-2"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: semMovimento ? 0 : 0.45, ease: [0.16, 1, 0.3, 1] }}
              >
                {/* A bolha nova cresce de altura 0 (as anteriores sobem junto,
                    sem pulo) e entra com fade + leve subida. Sem layout
                    projection: com a coluna ancorada embaixo ela deixava
                    transformações penduradas. */}
                <AnimatePresence initial={false}>
                  {mensagens.map((m, i) => (
                    <motion.div
                      key={m.id}
                      // O recorte só vale DURANTE a entrada: o avatar e o ícone da IA
                      // ficam um pouco para fora da bolha e saíam cortados (30/09, PO).
                      initial={semMovimento ? false : { height: 0, opacity: 0, overflow: 'hidden' }}
                      animate={{ height: 'auto', opacity: 1, transitionEnd: { overflow: 'visible' } }}
                      transition={{ height: { duration: 0.38, ease: [0.16, 1, 0.3, 1] }, opacity: { duration: 0.3, delay: 0.08 } }}
                    >
                      <motion.div
                        className="pb-1"
                        initial={semMovimento ? false : { y: 10, scale: 0.97 }}
                        animate={{ y: 0, scale: 1 }}
                        transition={{ type: 'spring', stiffness: 380, damping: 30, delay: 0.05 }}
                        style={{ transformOrigin: m.direction === 'outbound' ? 'bottom right' : 'bottom left' }}
                      >
                        <MessageBubble message={m} prevMessage={mensagens[i - 1]} contact={contato} showAvatar={mensagens[i - 1]?.direction !== m.direction} />
                      </motion.div>
                    </motion.div>
                  ))}
                  {digitando && (
                    <motion.div
                      key="digitando"
                      // O recorte só vale DURANTE a entrada: o avatar e o ícone da IA
                      // ficam um pouco para fora da bolha e saíam cortados (30/09, PO).
                      initial={semMovimento ? false : { height: 0, opacity: 0, overflow: 'hidden' }}
                      animate={{ height: 'auto', opacity: 1, transitionEnd: { overflow: 'visible' } }}
                      exit={{ height: 0, opacity: 0, overflow: 'hidden', transition: { duration: 0.18 } }}
                      transition={{ height: { duration: 0.3, ease: [0.16, 1, 0.3, 1] }, opacity: { duration: 0.25 } }}
                    >
                      <div className="flex justify-end pr-2 pb-1"><TypingIndicator /></div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </motion.div>
            </AnimatePresence>
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
        {/* O registro desenhado aqui (não o componente real): cada linha nova
            desliza e acende, com o ponto do produto — teal quando a IA agiu,
            âmbar quando chamou uma pessoa (30/09, PO: "as ações simplesmente
            surgem na tela"). */}
        <div className="relative min-h-0 flex-1">
        {/* O recomeço sai em fade junto com a conversa (a chave é o ciclo). */}
        <AnimatePresence mode="wait" initial={false}>
        <motion.div
          key={ciclo}
          className="absolute inset-0"
          initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0, y: -10 }}
          transition={{ duration: semMovimento ? 0 : 0.45, ease: [0.16, 1, 0.3, 1] }}
        >
          {linha.length === 0 && (
            <motion.p
              key={`vazio-${ciclo}`}
              className="absolute inset-0 flex items-center justify-center px-5 py-8 text-center text-[12.5px] leading-relaxed text-surface-500"
              initial={semMovimento ? false : { opacity: 0 }} animate={{ opacity: 1 }}
              transition={{ duration: 0.3 }}
            >
              {solucoes.registroVazio}
            </motion.p>
          )}
          <ol className="px-4 py-2">
              {linha.map((e) => {
                const pessoa = e.kind === 'agent' && e.toolName === 'assign_conversation'
                const hora = new Date(e.createdAt).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
                return (
                  <motion.li
                    key={`${ciclo}-${e.id}`}
                    className="grid grid-cols-[38px_12px_minmax(0,1fr)] gap-x-2.5 border-b border-surface-800 py-3 last:border-b-0"
                    initial={semMovimento ? false : { opacity: 0, x: -14 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ type: 'spring', stiffness: 320, damping: 28 }}
                  >
                    <span className="pt-[2px] font-mono text-[10.5px] text-surface-500">{hora}</span>
                    <motion.span
                      aria-hidden
                      className={cn('mt-[6px] h-[7px] w-[7px] rounded-full', pessoa ? 'bg-[#F5B544]' : 'bg-[var(--landing-destaque)]')}
                      initial={semMovimento ? false : { scale: 0.4, boxShadow: pessoa ? '0 0 0 0 rgba(245,181,68,.6)' : '0 0 0 0 rgba(45,212,191,.6)' }}
                      animate={{ scale: 1, boxShadow: pessoa ? '0 0 0 8px rgba(245,181,68,0)' : '0 0 0 8px rgba(45,212,191,0)' }}
                      transition={{ duration: 0.9, ease: 'easeOut' }}
                    />
                    <span className="min-w-0">
                      <span className="block text-[12.5px] leading-snug text-surface-100">{e.summary}</span>
                      <span className={cn('mt-0.5 block font-mono text-[10px] tracking-[.04em]', pessoa ? 'text-[#F5B544]' : 'text-[var(--landing-destaque)]')}>
                        {e.kind === 'agent' ? e.agentName : ''}
                      </span>
                    </span>
                  </motion.li>
                )
              })}
          </ol>
        </motion.div>
        </AnimatePresence>
        </div>
      </div>
    </div>
    </>
  )
}

export function SecaoSolucoes({ completa = false, numero }: { completa?: boolean; numero?: string }) {
  const [ativa, setAtiva] = useState<string>(solucoes.areas[0].id)
  const area = solucoes.areas.find((a) => a.id === ativa) ?? solucoes.areas[0]
  return (
    <section id="solucoes" data-section="solucoes" className="relative scroll-mt-20 border-t border-[var(--landing-borda)] bg-[var(--landing-palco)] py-16 sm:py-20">
      <div className="landing-container">
        {!completa && <Cabecalho titulo={solucoes.titulo} apoio={solucoes.lead} />}
        {completa && (
          <Revelar>
            <p className="max-w-[60ch] text-[16px] leading-relaxed text-surface-400 sm:text-[18px] text-pretty">{solucoes.lead}</p>
          </Revelar>
        )}

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
              tabIndex={a.id === ativa ? 0 : -1}
              onClick={() => setAtiva(a.id)}
              onKeyDown={teclasDasAbas(solucoes.areas.map((x) => x.id), ativa, setAtiva, 'area-aba-')}
              className={cn('landing-aba rounded-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500', a.id === ativa && 'landing-aba-ativa')}
            >
              <span data-numero>{String(i + 1).padStart(2, '0')}</span>
              {a.nome}
            </button>
          ))}
        </div>

        <div id="area-painel" role="tabpanel" aria-labelledby={`area-aba-${area.id}`} className="mt-8">
        {/* Trocar de área: o painel sai e entra em crossfade, em vez de trocar
            de conteúdo de uma vez (30/09). */}
        <AnimatePresence mode="wait" initial={false}>
        <motion.div
          key={area.id}
          className="grid gap-6 lg:grid-cols-[minmax(0,.8fr)_minmax(0,1.5fr)] lg:gap-10"
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -6, transition: { duration: 0.18 } }}
          transition={{ duration: 0.32, ease: [0.16, 1, 0.3, 1] }}
        >
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
        </motion.div>
        </AnimatePresence>
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
