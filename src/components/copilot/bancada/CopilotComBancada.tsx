import { useCallback, useEffect, useRef, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { ArrowLeft, BookOpen, Loader2, MessageSquareOff, PanelRight, Plus } from 'lucide-react'
import { CopilotMark } from '@/lib/icons'
import { useAuth } from '@/contexts/AuthContext'
import { useIsMobile } from '@/hooks/useIsMobile'
import { useCopilotSessions } from '@/hooks/useCopilotSessions'
import { useRegisterTopBarActions } from '@/contexts/TopBarActionsContext'
import type { CopilotAttachment } from '@/contexts/CopilotContext'
import { SessionChat, type AbaDaBancada } from '../SessionChat'
import { GlassChatInput } from '../GlassChatInput'
import { Bancada } from './Bancada'
import { contarPendentes } from './lotes'
import { InicioDaBancada } from './InicioDaBancada'
import { SeletorDeConversa } from './SeletorDeConversa'
import { isAdminTier } from '@/lib/roleHelpers'
import { isFeatureVisible } from '@/config/featureFlags'

// ─── Copilot: conversa + bancada (proposta SCRUM-1253) ──────────────────────
// Duas áreas fixas, nada de painéis que se empurram nem modal de aprovação:
// à esquerda a conversa (coluna de leitura no fundo de chat), à direita a
// bancada (Aprovações · Resultados · Artefatos). Conversa e aba vivem na URL
// (`?conversa=&aba=`) — recarregar ou voltar devolve a mesma tela.

const ABAS: AbaDaBancada[] = ['aprovacoes', 'resultados', 'artefatos']

export function CopilotComBancada() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const celular = useIsMobile()
  const admin = isAdminTier(user?.role)
  // Atalho da base: administrador vai a Contexto da IA; os demais, à seção
  // Copilot de Configurações (instruções, visível a todos os papéis). No
  // celular Contexto da IA é bloqueado (formulário longo) — vai à seção Copilot.
  const baseCompleta = admin && !celular
  const destinoDaBase = baseCompleta ? '/settings/company-brain' : '/settings/copilot'
  const baseVisivel = admin || isFeatureVisible('copilot')
  const [params, setParams] = useSearchParams()
  const reais = useCopilotSessions(user?.id)

  const {
    sessions, activeMessages, selectSession, createSession, deleteSession, updateSessionMessages, updateSessionTitle,
    loadedFromDb, abrirConversa, estadoAvulsa, temMais, carregandoMais, carregarMais, buscarNoServidor,
  } = reais
  const conversa = params.get('conversa')
  const conversaNaLista = !!conversa && sessions.some((s) => s.id === conversa)
  // Conversa da URL fora da lista (antiga, excluída, de outro usuário).
  const estadoDaConversa = !conversa || conversaNaLista ? null : (estadoAvulsa[conversa] ?? 'carregando')
  const pendentesTotal = conversa ? contarPendentes(activeMessages) : 0
  const abaUrl = params.get('aba') as AbaDaBancada | null
  // Sem aba na URL: o que espera você vem primeiro; senão, os resultados.
  const aba: AbaDaBancada = abaUrl && ABAS.includes(abaUrl) ? abaUrl : pendentesTotal > 0 ? 'aprovacoes' : 'resultados'

  const [foco, setFoco] = useState<string | null>(null)
  const [bancadaAberta, setBancadaAberta] = useState(false)
  // Pedido feito antes de existir conversa: a conversa nova envia ao montar.
  const [pendente, setPendente] = useState<{ text: string; attachments?: CopilotAttachment[] } | null>(null)

  // Revisão 11/10: trocar de CONVERSA empilha no histórico (o "Voltar" do
  // navegador volta à conversa anterior, não sai do Copilot); trocar de ABA
  // da bancada só substitui.
  const mudar = useCallback((patch: Record<string, string | null>) => {
    const empilhar = 'conversa' in patch
    setParams((prev) => {
      const p = new URLSearchParams(prev)
      for (const [k, v] of Object.entries(patch)) { if (v === null) p.delete(k); else p.set(k, v) }
      return p
    }, { replace: !empilhar })
  }, [setParams])

  // A URL manda: a conversa aberta é a do parâmetro.
  useEffect(() => {
    selectSession(conversa)
  }, [conversa, selectSession])

  // Fora da lista: busca a conversa pelo id (depois da lista do servidor).
  useEffect(() => {
    if (conversa && loadedFromDb && !conversaNaLista && !estadoAvulsa[conversa]) void abrirConversa(conversa)
  }, [conversa, loadedFromDb, conversaNaLista, estadoAvulsa, abrirConversa])

  // Ctrl/Cmd+B abre/fecha a lista de conversas (antes abria a barra lateral).
  const [seletorAberto, setSeletorAberto] = useState(false)
  useEffect(() => {
    const aoTeclar = (e: KeyboardEvent) => {
      if (!(e.ctrlKey || e.metaKey) || e.altKey || e.shiftKey || e.key.toLowerCase() !== 'b') return
      e.preventDefault()
      setSeletorAberto((v) => !v)
    }
    window.addEventListener('keydown', aoTeclar)
    return () => window.removeEventListener('keydown', aoTeclar)
  }, [])

  const irParaBancada = useCallback((destino: AbaDaBancada, alvoId?: string) => {
    mudar({ aba: destino })
    setFoco(alvoId ?? null)
    if (celular) setBancadaAberta(true)
  }, [mudar, celular])

  // Revisão 11/10: duplo clique (sugestão, "Nova conversa") criava duas
  // conversas e mandava o texto na errada. Uma criação por vez.
  const criandoRef = useRef(false)
  const [criando, setCriando] = useState(false)
  const criar = useCallback(async (antes?: () => void): Promise<string | null> => {
    if (criandoRef.current) return null
    criandoRef.current = true
    setCriando(true)
    try {
      antes?.()
      const id = await createSession()
      return id || null
    } finally {
      criandoRef.current = false
      setCriando(false)
    }
  }, [createSession])

  const novaConversa = useCallback(async () => {
    const id = await criar()
    if (id) mudar({ conversa: id, aba: null })
  }, [criar, mudar])

  const enviarDoInicio = useCallback(async (text: string, attachments?: CopilotAttachment[]) => {
    const id = await criar(() => setPendente({ text, attachments }))
    if (id) mudar({ conversa: id, aba: null })
  }, [criar, mudar])

  // Assinatura da bancada: chegou uma aprovação nova → a bancada vai até ela.
  const pendentesAntes = useRef(pendentesTotal)
  useEffect(() => {
    if (pendentesTotal > pendentesAntes.current) {
      mudar({ aba: 'aprovacoes' })
    }
    pendentesAntes.current = pendentesTotal
  }, [pendentesTotal, mudar])

  // Topo: seletor da conversa + nova + base de conhecimento (que mora em Configurações).
  const topo = (
    <div className="flex items-center gap-1.5 min-w-0">
      <SeletorDeConversa
        sessions={sessions}
        ativa={conversa}
        onSelecionar={(id) => { if (id !== conversa) mudar({ conversa: id, aba: null }) }}
        onNova={() => { void novaConversa() }}
        onExcluir={(id) => { deleteSession(id); if (id === conversa) mudar({ conversa: null, aba: null }) }}
        aberto={seletorAberto}
        onAbertoChange={setSeletorAberto}
        temMais={temMais}
        carregandoMais={carregandoMais}
        onCarregarMais={() => { void carregarMais() }}
        buscarNoServidor={buscarNoServidor}
        desabilitarNova={criando}
      />
      <button type="button" onClick={() => { void novaConversa() }} disabled={criando} title="Nova conversa" aria-label="Nova conversa"
        className="inline-flex items-center gap-1.5 h-8 px-2.5 rounded-[6px] border border-surface-700 bg-surface-800 text-xs font-semibold text-surface-200 whitespace-nowrap flex-shrink-0 hover:bg-[var(--rowhover)] disabled:opacity-50">
        {criando ? <Loader2 className="w-3.5 h-3.5 animate-spin" aria-hidden /> : <Plus className="w-3.5 h-3.5" aria-hidden />}<span className="hidden xl:inline">Nova conversa</span>
      </button>
      {baseVisivel && <button type="button" onClick={() => navigate(destinoDaBase)} title={baseCompleta ? 'O que o Copilot sabe da empresa (Configurações › Contexto da IA)' : 'Instruções do Copilot (Configurações › Copilot)'}
        aria-label={baseCompleta ? 'Contexto da IA' : 'Instruções do Copilot'}
        className="inline-flex items-center gap-1.5 h-8 px-2.5 rounded-[6px] text-xs font-semibold text-surface-300 whitespace-nowrap flex-shrink-0 hover:text-surface-100 hover:bg-[var(--rowhover)]">
        <BookOpen className="w-3.5 h-3.5" aria-hidden /><span className="hidden xl:inline">{baseCompleta ? 'Contexto da IA' : 'Instruções'}</span>
      </button>}
    </div>
  )
  useRegisterTopBarActions(celular ? null : topo, [sessions, conversa, celular, novaConversa, mudar, deleteSession, navigate, admin, seletorAberto, temMais, carregandoMais, carregarMais, buscarNoServidor, criando])

  const bancadaInicio = <InicioDaBancada onPedido={(t) => { void enviarDoInicio(t) }} />

  return (
    <div className="relative flex-1 flex flex-col min-w-0 h-full">
      {celular && (
        <div className="flex items-center gap-2 h-12 px-3 border-b border-surface-700 bg-surface-800 flex-shrink-0">
          <div className="flex-1 min-w-0">{topo}</div>
          <button type="button" onClick={() => setBancadaAberta(true)} aria-label="Abrir bancada"
            className="relative inline-flex items-center gap-1.5 h-8 px-2.5 rounded-[6px] border border-surface-700 bg-surface-800 text-xs font-semibold text-surface-200">
            <PanelRight className="w-4 h-4" aria-hidden /> Bancada
            {pendentesTotal > 0 && <span className="min-w-[18px] h-[18px] px-1 rounded-full bg-status-pending text-white text-[11px] leading-[18px] text-center tabular-nums">{pendentesTotal}</span>}
          </button>
        </div>
      )}

      <div className="flex-1 min-h-0 flex">
        {conversa && estadoDaConversa ? (
          <>
            <ConversaIndisponivel
              estado={estadoDaConversa}
              onNova={() => { void novaConversa() }}
              onVoltar={() => mudar({ conversa: null, aba: null })}
              criando={criando}
            />
            <Bancada ctx={null} aba={aba} onAba={(a) => mudar({ aba: a })} inicio={bancadaInicio}
              celular={celular} aberta={bancadaAberta} onFechar={() => setBancadaAberta(false)} />
          </>
        ) : conversa ? (
          <div className="flex-1 min-w-0">
            <SessionChat
              key={conversa}
              sessionId={conversa}
              initialMessages={activeMessages}
              onMessagesChange={updateSessionMessages}
              onTitleChange={updateSessionTitle}
              tools={[]}
              autoSendMessage={pendente ?? undefined}
              onAutoSendConsumed={() => setPendente(null)}
              onIrParaBancada={irParaBancada}
              renderBancada={(ctx) => (
                <Bancada ctx={ctx} aba={aba} onAba={(a) => { mudar({ aba: a }); setFoco(null) }} foco={foco}
                  celular={celular} aberta={bancadaAberta} onFechar={() => setBancadaAberta(false)} />
              )}
            />
          </div>
        ) : (
          <>
            <BoasVindas onEnviar={(t, a) => { void enviarDoInicio(t, a) }} ocupado={criando} />
            <Bancada ctx={null} aba={aba} onAba={(a) => mudar({ aba: a })} inicio={bancadaInicio}
              celular={celular} aberta={bancadaAberta} onFechar={() => setBancadaAberta(false)} />
          </>
        )}
      </div>
    </div>
  )
}

/** `?conversa=` que não está na lista e não foi encontrada (ou ainda carrega). */
function ConversaIndisponivel({ estado, onNova, onVoltar, criando }: {
  estado: 'carregando' | 'nao-encontrada' | 'erro'
  onNova: () => void
  onVoltar: () => void
  criando: boolean
}) {
  if (estado === 'carregando') {
    return (
      <section aria-label="Conversa" className="chat-shell-bg flex flex-1 min-w-0 h-full items-center justify-center">
        <p role="status" className="inline-flex items-center gap-2 text-sm text-surface-400"><Loader2 className="w-4 h-4 animate-spin" aria-hidden />Abrindo a conversa…</p>
      </section>
    )
  }
  return (
    <section aria-label="Conversa" className="chat-shell-bg flex flex-1 min-w-0 h-full items-center justify-center px-6">
      <div className="max-w-sm text-center">
        <span className="inline-flex w-10 h-10 rounded-[8px] bg-[var(--sf2)] border border-surface-700 items-center justify-center text-surface-400 mb-3">
          <MessageSquareOff className="w-5 h-5" aria-hidden />
        </span>
        <h1 className="text-base font-semibold text-surface-100">{estado === 'erro' ? 'Não foi possível abrir a conversa' : 'Conversa não encontrada'}</h1>
        <p className="text-xs text-surface-400 mt-1 leading-relaxed">
          {estado === 'erro'
            ? 'O servidor do Copilot não respondeu. Tente de novo em instantes ou comece outra conversa.'
            : 'Ela pode ter sido excluída ou o link é de outra pessoa. Comece uma conversa nova ou volte para a lista.'}
        </p>
        <div className="mt-4 flex items-center justify-center gap-2">
          <button type="button" onClick={onVoltar}
            className="inline-flex items-center gap-1.5 h-8 px-3 rounded-[6px] border border-surface-700 bg-surface-800 text-xs font-semibold text-surface-200 hover:bg-[var(--rowhover)]">
            <ArrowLeft className="w-3.5 h-3.5" aria-hidden /> Voltar ao início
          </button>
          <button type="button" onClick={onNova} disabled={criando}
            className="inline-flex items-center gap-1.5 h-8 px-3 rounded-[6px] bg-brand-600 hover:bg-brand-500 text-xs font-semibold text-white disabled:opacity-50">
            <Plus className="w-3.5 h-3.5" aria-hidden /> Nova conversa
          </button>
        </div>
      </div>
    </section>
  )
}

/** Coluna da conversa antes de existir conversa: convite curto e o campo. */
function BoasVindas({ onEnviar, ocupado = false }: { onEnviar: (t: string, a?: CopilotAttachment[]) => void; ocupado?: boolean }) {
  const [texto, setTexto] = useState('')
  const [anexos, setAnexos] = useState<CopilotAttachment[]>([])
  const [erro, setErro] = useState<string | null>(null)
  return (
    <section aria-label="Conversa" className="chat-shell-bg flex flex-col flex-1 min-w-0 h-full">
      <div className="flex-1 flex flex-col items-center justify-center text-center px-6">
        <span className="inline-flex items-center justify-center w-14 h-14 rounded-[14px] bg-brand-600 mb-5">
          <CopilotMark style={{ width: 28, height: 28 }} className="text-white" />
        </span>
        <h1 className="text-xl leading-tight font-semibold tracking-[-0.01em] text-surface-50 text-balance">Como posso ajudar o seu negócio hoje?</h1>
        <p className="text-[13px] text-surface-400 mt-1.5 max-w-[46ch] text-balance">
          Pergunte sobre contatos, conversas e campanhas, ou peça uma ação. Mudanças no CRM só acontecem depois que você aprova na bancada.
        </p>
      </div>
      <div className="px-3 pb-3">
        <GlassChatInput
          value={texto}
          onChange={setTexto}
          onSend={() => { if (ocupado) return; const t = texto.trim(); if (!t && anexos.length === 0) return; setTexto(''); setAnexos([]); setErro(null); onEnviar(t, anexos) }}
          onAbort={() => {}}
          isBusy={ocupado}
          placeholder="Pergunte ou peça uma ação…"
          autoFocus
          attachments={anexos}
          onAttachmentsChange={setAnexos}
          attachError={erro}
          onAttachError={setErro}
        />
      </div>
    </section>
  )
}
