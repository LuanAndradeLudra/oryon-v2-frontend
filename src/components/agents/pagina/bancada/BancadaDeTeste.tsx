import { useCallback, useEffect, useRef, useState } from 'react'
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion'
import {
  AlertTriangle, ArrowRightLeft, BookOpen, ChevronDown, History, MessageSquareDashed, Plug, RotateCcw, Send,
  ShieldCheck, Sparkles, Wand2, X,
} from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import { cn } from '@/lib/utils'
import {
  chatWithAgent, endTestSession, getTestSessionMessages, listTestSessions, startTestSession,
  type AgentConfigWithTools, type ChatTurnDebug, type TestSessionSummary,
} from '@/services/agentsApi'
import { Button } from '@/components/ui/Button'
import { Dropdown, DropdownItem } from '@/components/ui/Dropdown'
import { fontesDaResposta, promptDeTeste, type TipoDeFonte } from './fontesDaResposta'
import { DetalhesTecnicos } from './DetalhesTecnicos'

interface Mensagem {
  id: string
  papel: 'user' | 'assistant'
  texto: string
  em: Date
  debug?: ChatTurnDebug
}

const ICONE: Record<TipoDeFonte, LucideIcon> = {
  conhecimento: BookOpen,
  crm: ShieldCheck,
  skill: Wand2,
  integracao: Plug,
  outra: Plug,
  transferencia: ArrowRightLeft,
  verificacao: AlertTriangle,
  instrucoes: MessageSquareDashed,
}

const SUGESTOES = ['Quanto custa uma consulta?', 'Vocês aceitam meu convênio?', 'Quero falar com uma pessoa']

function hora(d: Date) {
  return d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
}

function dataCurta(iso: string) {
  return new Date(iso).toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })
}

/** O cartão sob cada resposta: de onde ela saiu e o que a IA fez. */
function OQueUsou({ debug }: { debug?: ChatTurnDebug }) {
  const [tecnico, setTecnico] = useState(false)
  const fontes = fontesDaResposta(debug)
  if (fontes.length === 0) return null
  return (
    <div className="mt-1.5 rounded-md border border-surface-700 bg-[var(--sf2)] px-2.5 py-2">
      <p className="mb-1 text-3xs font-bold uppercase tracking-[.12em] text-surface-500">O que a IA usou</p>
      <ul className="space-y-0.5">
        {fontes.map((f) => {
          const Icone = ICONE[f.tipo]
          return (
            <li key={f.rotulo} className={cn('flex items-start gap-1.5 text-xs leading-snug', f.alerta ? 'text-status-pending' : 'text-surface-200')}>
              <Icone className="mt-[1px] h-3.5 w-3.5 flex-shrink-0 opacity-80" aria-hidden />
              <span>{f.rotulo}</span>
            </li>
          )
        })}
      </ul>
      {debug && (
        <>
          <button
            type="button"
            onClick={() => setTecnico((v) => !v)}
            aria-expanded={tecnico}
            className="mt-1.5 inline-flex items-center gap-1 rounded-sm text-2xs font-semibold text-surface-400 hover:text-surface-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500"
          >
            Detalhes técnicos
            <ChevronDown className={cn('h-3 w-3 transition-transform', tecnico && 'rotate-180')} aria-hidden />
          </button>
          {tecnico && <div className="mt-2 border-t border-surface-700 pt-2"><DetalhesTecnicos debug={debug} /></div>}
        </>
      )}
    </div>
  )
}

/**
 * A BANCADA DE TESTE (direção D): a conversa simulada fica ao lado da
 * configuração enquanto a pessoa troca de seção. Cada resposta mostra o que a
 * IA usou. O teste usa sempre a versão SALVA do agente (as instruções em
 * rascunho não entram até serem salvas).
 */
export function BancadaDeTeste({
  agent, onTestou, onFechar, flutuante = false, movel = false,
}: {
  agent: AgentConfigWithTools
  onTestou: () => void
  onFechar: () => void
  /** Telas estreitas: a bancada abre por cima do conteúdo. */
  flutuante?: boolean
  /** Celular: tela cheia, áreas seguras, alvos maiores e Enter quebra linha
   *  (como no WhatsApp) — envia pelo botão. */
  movel?: boolean
}) {
  const tam = movel ? 'md' as const : 'sm' as const
  const semMovimento = useReducedMotion()
  const [mensagens, setMensagens] = useState<Mensagem[]>([])
  const [texto, setTexto] = useState('')
  const [pensando, setPensando] = useState(false)
  const [erro, setErro] = useState<string | null>(null)
  const [historicoAberto, setHistoricoAberto] = useState(false)
  const [historico, setHistorico] = useState<TestSessionSummary[] | null>(null)
  const [revendo, setRevendo] = useState<{ quando: string; mensagens: Mensagem[] } | null>(null)
  const sessao = useRef<string | null>(null)
  const avisouTeste = useRef(false)
  const fim = useRef<HTMLDivElement>(null)
  const entrada = useRef<HTMLTextAreaElement>(null)
  const agentRef = useRef(agent)
  useEffect(() => { agentRef.current = agent }, [agent])

  // Cada abertura é uma geração: se a bancada fechar (ou a conversa recomeçar)
  // antes de a sessão nascer no servidor, a resposta atrasada é encerrada em
  // vez de virar uma sessão órfã aberta.
  const geracao = useRef(0)
  const abrirSessao = useCallback(() => {
    const minha = ++geracao.current
    startTestSession(agent.id)
      .then((s) => {
        if (minha === geracao.current) sessao.current = s.id
        else endTestSession(agent.id, s.id).catch(() => {})
      })
      .catch(() => { if (minha === geracao.current) sessao.current = null })
  }, [agent.id])

  const fecharSessao = useCallback(() => {
    geracao.current += 1
    if (sessao.current) endTestSession(agent.id, sessao.current).catch(() => {})
    sessao.current = null
  }, [agent.id])

  // Uma sessão por abertura da bancada; fechar a bancada encerra a sessão.
  useEffect(() => {
    abrirSessao()
    return fecharSessao
  }, [abrirSessao, fecharSessao])

  const exibidas = revendo ? revendo.mensagens : mensagens

  useEffect(() => {
    if (revendo) return
    fim.current?.scrollIntoView?.({ behavior: semMovimento ? 'auto' : 'smooth', block: 'end' })
  }, [mensagens, pensando, revendo, semMovimento])

  const enviar = async (conteudo?: string) => {
    const t = (conteudo ?? texto).trim()
    if (!t || pensando || revendo) return
    const minha: Mensagem = { id: `u-${Date.now()}`, papel: 'user', texto: t, em: new Date() }
    const conversa = [...mensagens, minha]
    setMensagens(conversa)
    setTexto('')
    setErro(null)
    setPensando(true)
    try {
      const r = await chatWithAgent(
        promptDeTeste(agentRef.current),
        conversa.map((m) => ({ role: m.papel, content: m.texto })),
        { sessionId: sessao.current ?? undefined, agentId: agent.id },
      )
      setMensagens((m) => [...m, {
        id: `a-${Date.now()}`, papel: 'assistant', texto: r.message, em: new Date(),
        debug: { toolCalls: r.toolCalls, turnSummary: r.turnSummary, guard: r.guard },
      }])
      if (!avisouTeste.current) { avisouTeste.current = true; onTestou() }
    } catch (e) {
      setErro(e instanceof Error ? e.message : 'O agente não respondeu.')
    } finally {
      setPensando(false)
      requestAnimationFrame(() => entrada.current?.focus())
    }
  }

  const novaConversa = () => {
    fecharSessao()
    setMensagens([])
    setErro(null)
    setRevendo(null)
    abrirSessao()
    entrada.current?.focus()
  }

  const alternarHistorico = () => {
    setHistoricoAberto((v) => !v)
    if (historico === null) listTestSessions(agent.id).then(setHistorico).catch(() => setHistorico([]))
  }

  const rever = async (s: TestSessionSummary) => {
    setHistoricoAberto(false)
    try {
      const linhas = await getTestSessionMessages(agent.id, s.id)
      setRevendo({
        quando: s.created_at,
        mensagens: linhas.map((l) => ({ id: l.id, papel: l.role, texto: l.content, em: new Date(l.created_at), debug: l.debug ?? undefined })),
      })
    } catch {
      setErro('Não foi possível abrir essa conversa de teste.')
    }
  }

  const regras = (agent.handoff_rules?.rules ?? []).filter((r) => r.enabled).length

  return (
    <aside
      aria-label="Teste ao vivo"
      className={cn(
        'flex flex-col min-h-0 bg-surface-900 border-l border-surface-700',
        movel ? 'fixed inset-0 z-50 w-full h-[100dvh] border-l-0 pt-safe'
          : flutuante ? 'fixed right-0 top-0 bottom-0 z-50 w-[min(400px,100vw)] shadow-[0_18px_55px_rgba(0,0,0,.28)]' : 'w-[372px] flex-shrink-0',
      )}
    >
      <div className={cn('flex flex-shrink-0 items-center gap-2 border-b border-surface-700 pl-4 pr-2', movel ? 'h-14' : 'h-12')}>
        <Sparkles className="h-4 w-4 text-accent-dark" aria-hidden />
        <h2 className="text-sm font-semibold text-surface-100">Teste ao vivo</h2>
        <span className="inline-flex h-5 items-center rounded-xs border border-status-pending-border bg-status-pending-bg px-[7px] text-2xs font-semibold text-status-pending">
          Simulação
        </span>
        <div className="ml-auto flex items-center gap-0.5">
          <Dropdown
            open={historicoAberto}
            onClose={() => setHistoricoAberto(false)}
            align="right"
            className="w-64"
            anchor={
              <Button variant="ghost" size={tam} iconOnly aria-label="Conversas de teste anteriores" title="Conversas anteriores" onClick={alternarHistorico}>
                <History className="h-4 w-4" />
              </Button>
            }
          >
            {historico === null ? (
              <p className="px-2 py-3 text-xs text-surface-400">Carregando…</p>
            ) : historico.length === 0 ? (
              <p className="px-2 py-3 text-xs text-surface-400">Nenhuma conversa de teste anterior.</p>
            ) : historico.map((s) => (
              <DropdownItem key={s.id} onClick={() => void rever(s)}>
                <span className="flex-1">{dataCurta(s.created_at)}</span>
                <span className="text-2xs text-surface-500">{s.message_count} msg.</span>
              </DropdownItem>
            ))}
          </Dropdown>
          <Button variant="ghost" size={tam} iconOnly aria-label="Nova conversa" title="Nova conversa" onClick={novaConversa}>
            <RotateCcw className="h-4 w-4" />
          </Button>
          <Button variant="ghost" size={tam} iconOnly aria-label="Fechar teste" title="Fechar" onClick={onFechar}>
            <X className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {revendo ? (
        <div className="flex flex-shrink-0 items-center gap-2 border-b border-surface-700 bg-accent-soft px-4 py-2 text-xs text-accent-dark">
          <History className="h-3.5 w-3.5 flex-shrink-0" aria-hidden />
          <span className="flex-1">Revendo o teste de {dataCurta(revendo.quando)}</span>
          <button type="button" onClick={() => setRevendo(null)} className="font-semibold underline underline-offset-2">Voltar</button>
        </div>
      ) : (
        <p className="flex-shrink-0 border-b border-surface-700 px-4 py-2 text-2xs text-surface-400">
          Usa as instruções salvas{regras > 0 ? ` e ${regras} ${regras === 1 ? 'regra' : 'regras'} de transferência` : ''}. Você escreve como o cliente.
        </p>
      )}

      <div className="flex-1 min-h-0 space-y-3 overflow-y-auto px-4 py-4" aria-live="polite">
        {exibidas.length === 0 && !pensando && (
          <div className="pt-6">
            <p className="text-sm font-semibold text-surface-100">Converse como se fosse um cliente</p>
            <p className="mt-1 text-xs leading-relaxed text-surface-400">A resposta mostra de onde veio e o que a IA fez no CRM. Nada é enviado a ninguém.</p>
            <div className="mt-3 flex flex-col items-start gap-1.5">
              {SUGESTOES.map((s) => (
                <button key={s} type="button" onClick={() => void enviar(s)}
                  className={cn('rounded-md border border-[var(--bd2)] text-left text-surface-200 hover:bg-[var(--rowhover)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500', movel ? 'min-h-10 px-3 py-2 text-sm' : 'px-2.5 py-1.5 text-xs')}>
                  {s}
                </button>
              ))}
            </div>
          </div>
        )}

        <AnimatePresence initial={false}>
          {exibidas.map((m) => (
            <motion.div
              key={m.id}
              initial={semMovimento ? false : { opacity: 0, y: 4 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.15 }}
              className={cn('flex flex-col', m.papel === 'user' ? 'items-end' : 'items-start')}
            >
              <div className={cn(
                'max-w-[88%] rounded-lg px-3 py-2 text-sm leading-relaxed whitespace-pre-wrap',
                m.papel === 'user'
                  ? 'rounded-br-xs bg-[var(--color-btn-primary-bg)] text-[var(--color-btn-primary-fg)]'
                  : 'rounded-bl-xs border border-surface-700 bg-surface-800 text-surface-100',
              )}>
                {m.texto}
                <span className={cn('mt-0.5 block text-right text-3xs', m.papel === 'user' ? 'opacity-70' : 'text-surface-500')}>{hora(m.em)}</span>
              </div>
              {m.papel === 'assistant' && <div className="w-[88%]"><OQueUsou debug={m.debug} /></div>}
            </motion.div>
          ))}
        </AnimatePresence>

        {pensando && (
          <div className="inline-flex items-center gap-1 rounded-lg border border-surface-700 bg-surface-800 px-3 py-2.5" aria-label="O agente está escrevendo">
            {[0, 1, 2].map((i) => (
              <span key={i} className="h-1.5 w-1.5 rounded-full bg-surface-500 motion-safe:animate-bounce" style={{ animationDelay: `${i * 150}ms` }} />
            ))}
          </div>
        )}

        {erro && (
          <div role="alert" className="flex items-start gap-2 rounded-md border border-[color-mix(in_srgb,var(--color-danger)_30%,transparent)] px-3 py-2 text-xs text-danger">
            <AlertTriangle className="mt-[1px] h-3.5 w-3.5 flex-shrink-0" aria-hidden />
            <span className="flex-1">{erro}</span>
            <button type="button" onClick={() => setErro(null)} aria-label="Dispensar erro"><X className="h-3.5 w-3.5" /></button>
          </div>
        )}
        <div ref={fim} />
      </div>

      <form
        className={cn('flex flex-shrink-0 items-end gap-2 border-t border-surface-700 px-3 pt-3', movel ? 'pb-[max(12px,env(safe-area-inset-bottom))]' : 'pb-3')}
        onSubmit={(e) => { e.preventDefault(); void enviar() }}
      >
        <textarea
          ref={entrada}
          aria-label="Mensagem do cliente"
          value={texto}
          onChange={(e) => setTexto(e.target.value)}
          onKeyDown={(e) => { if (!movel && e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); void enviar() } }}
          placeholder={revendo ? 'Volte ao teste atual para escrever' : 'Escreva como o cliente…'}
          disabled={!!revendo}
          rows={1}
          className="max-h-28 min-h-10 flex-1 resize-none rounded-sm border border-[var(--bd2)] bg-surface-800 px-2.5 py-2 text-[13px] text-surface-100 placeholder:text-surface-500 caret-brand-500 focus:border-brand-500 focus:outline-none focus:ring-[3px] focus:ring-accent-soft disabled:opacity-50"
        />
        <Button type="submit" size={movel ? 'lg' : 'md'} iconOnly aria-label="Enviar" disabled={!texto.trim() || pensando || !!revendo} loading={pensando}>
          <Send className="h-4 w-4" />
        </Button>
      </form>
    </aside>
  )
}
