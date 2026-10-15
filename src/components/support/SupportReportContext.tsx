import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import { useNavigate } from 'react-router-dom'
import { useIsMobile } from '@/hooks/useIsMobile'
import { showToast } from '@/hooks/useToast'
import { supportApi } from '@/services/supportApi'
import type { Message } from '@/types'
import type { ChamadoDaEmpresa, ResumoDoChamado } from '@/types/support'
import { emAberto } from './supportModel'
import { criarStoreDaMarcacao, MAX_MARCADAS, type ChamadoDaMensagem, type SobreOChamado } from './marcacaoDoChamado'
import { AcoesCtx, DadosCtx, DESLIGADO, resumoDe, useSuporteLigado, type AcoesDoSuporte, type DadosDoSuporte } from './suporteDaConversa'

/** Chamados de UMA conversa, com o pedido que os trouxe (trocar de conversa esvazia na hora, sem efeito). */
interface ListaDaConversa {
  conversa: string
  pedido: number
  chamados: readonly ResumoDoChamado[]
  erro: boolean
}
const SEM_CHAMADOS: readonly ResumoDoChamado[] = []

/**
 * Fica na página de Conversas (não no chat): o cabeçalho, as bolhas, o rodapé
 * e o PAINEL DO CONTATO, irmão do chat, leem o mesmo estado. Sempre montado
 * (com a flag desligada, `ligado` é `false`): os consumidores não mudam de
 * árvore quando a flag ou a conversa mudam. Hooks e tipos: suporteDaConversa.ts.
 */
export function SupportReportProvider({ conversationId, contatoNome, children }: {
  conversationId: string | null
  contatoNome: string | null
  children: ReactNode
}) {
  const flag = useSuporteLigado()
  const ligado = flag && !!conversationId
  const emPainel = !useIsMobile()
  const navigate = useNavigate()
  // Uma marcação por conversa: a conversa nova já nasce sem nada marcado, sem
  // um quadro com o estado da anterior (revisão do Portão 2). É o padrão do
  // React para ajustar o estado quando a prop muda: o render recomeça na hora.
  const [marcacao, setMarcacao] = useState(() => ({ conversa: conversationId, store: criarStoreDaMarcacao() }))
  if (marcacao.conversa !== conversationId) setMarcacao({ conversa: conversationId, store: criarStoreDaMarcacao() })
  const store = marcacao.store
  const [lista, setLista] = useState<ListaDaConversa | null>(null)
  const [pedido, setPedido] = useState(0)

  // Chamados desta conversa (a lista já traz as mensagens marcadas de cada um).
  useEffect(() => {
    if (!ligado || !conversationId) return
    let vivo = true
    supportApi.listar({ conversationId, situacao: 'todos', limite: 50 })
      .then((p) => { if (vivo) setLista({ conversa: conversationId, pedido, chamados: p.itens, erro: false }) })
      .catch(() => {
        if (vivo) setLista((l) => ({ conversa: conversationId, pedido, chamados: l?.conversa === conversationId ? l.chamados : SEM_CHAMADOS, erro: true }))
      })
    return () => { vivo = false }
  }, [conversationId, ligado, pedido])

  const daConversa = ligado && lista?.conversa === conversationId ? lista : null
  const chamados = daConversa?.chamados ?? SEM_CHAMADOS
  const erro = daConversa?.erro ?? false
  const carregando = ligado && daConversa?.pedido !== pedido

  // Bandeira na bolha: mensagem → chamado. O mais recente vence.
  useEffect(() => {
    const mapa = new Map<string, ChamadoDaMensagem>()
    for (const c of chamados) for (const id of c.mensagensMarcadas ?? []) if (!mapa.has(id)) mapa.set(id, { id: c.id, numero: c.numero })
    store.mudar({ chamadoPorMensagem: mapa })
  }, [chamados, store])

  // No painel, marcar e escrever são um passo só: o formulário abre junto.
  const iniciarMarcacao = useCallback((primeira?: string) => {
    store.mudar({ marcando: true, marcadas: new Set(primeira ? [primeira] : []), sobre: 'mensagens', painelAberto: emPainel })
  }, [store, emPainel])
  const alternar = useCallback((id: string) => {
    if (!store.alternar(id)) showToast(`Até ${MAX_MARCADAS} mensagens por chamado.`, 'error')
  }, [store])
  const cancelarMarcacao = useCallback(() => store.zerar(true), [store])
  const reportar = useCallback((ids: string[]) => {
    const conversa = ids.length === 0
    store.mudar({ marcadas: new Set(ids), marcando: !conversa, sobre: conversa ? 'conversa' : 'mensagens', painelAberto: true })
  }, [store])
  // Conversa inteira: sai a marcação (e as caixas do chat). Mensagens: volta a marcar.
  // No celular a folha cobre o chat: "Mensagens" fecha a folha para marcar.
  const definirSobre = useCallback((v: SobreOChamado) => {
    if (v === 'conversa') store.mudar({ sobre: v, marcando: false, marcadas: new Set() })
    else store.mudar({ sobre: v, marcando: true, painelAberto: emPainel ? store.ler().painelAberto : false })
  }, [store, emPainel])
  const irParaChamado = useCallback((id: string) => navigate(`/support?chamado=${encodeURIComponent(id)}`), [navigate])
  const registrarMensagens = useCallback((m: readonly Message[]) => store.mudar({ mensagens: m }), [store])

  const acoes = useMemo<AcoesDoSuporte>(() => (ligado
    ? { ligado, emPainel, store, iniciarMarcacao, alternar, cancelarMarcacao, reportar, definirSobre, irParaChamado, registrarMensagens }
    : DESLIGADO), [ligado, emPainel, store, iniciarMarcacao, alternar, cancelarMarcacao, reportar, definirSobre, irParaChamado, registrarMensagens])

  // SCRUM-1394 (achado 17 do Portão 2): fechar o painel devolve o foco a quem o
  // abriu. Quem abriu pode ter sumido (item de menu, bolha que rolou): então o
  // foco vai para o campo da mensagem — nunca fica no vazio (body).
  const focoAntesDoPainel = useRef<{ el: HTMLElement; rotulo: string | null; noCabecalho: boolean } | null>(null)
  useEffect(() => {
    if (!ligado) return
    const aoFocar = (e: FocusEvent) => {
      const alvo = e.target as HTMLElement | null
      // Item de menu some ao fechar o menu: vale o que tinha o foco antes dele (o botão que abriu o menu).
      if (!alvo || alvo === document.body || alvo.closest('[data-painel-do-chamado], [role="menu"], [role="menuitem"]')) return
      focoAntesDoPainel.current = { el: alvo, rotulo: alvo.getAttribute('aria-label'), noCabecalho: !!alvo.closest('header') }
    }
    document.addEventListener('focusin', aoFocar)
    let aberto = store.ler().painelAberto
    const parar = store.assinar(() => {
      const agora = store.ler().painelAberto
      if (aberto && !agora) {
        const antes = focoAntesDoPainel.current
        requestAnimationFrame(() => {
          const atual = document.activeElement
          // Alguém já levou o foco para outro lugar (ex.: o chamado criado): respeita.
          if (atual && atual !== document.body && !atual.closest('[data-painel-do-chamado]')) return
          // O botão pode ter sido recriado (o cabeçalho muda com o painel): acha pelo mesmo rótulo.
          const mesmo = antes?.el.isConnected ? antes.el
            : antes?.rotulo ? document.querySelector<HTMLElement>(`${antes.noCabecalho ? 'header ' : ''}[aria-label="${CSS.escape(antes.rotulo)}"]`) : null
          ;(mesmo ?? document.querySelector<HTMLElement>('textarea[aria-label="Mensagem"]'))?.focus()
        })
      }
      aberto = agora
    })
    return () => { document.removeEventListener('focusin', aoFocar); parar() }
  }, [ligado, store])

  const recarregar = useCallback(() => setPedido((v) => v + 1), [])
  // O pós-envio chega com a resposta do servidor: a pessoa pode já estar em
  // outra conversa. As refs dão a conversa e a lista de AGORA, não as do clique.
  const conversaAtual = useRef(conversationId)
  const listaAtual = useRef(lista)
  useEffect(() => {
    conversaAtual.current = conversationId
    listaAtual.current = lista
  })
  // Criou ou juntou: a lista desta conversa já mostra o chamado (e a bandeira nas bolhas), sem esperar o servidor.
  const aoCriar = useCallback((c: ChamadoDaEmpresa, novo: boolean) => {
    if (c.conversationId !== conversaAtual.current) return false
    if (listaAtual.current?.conversa !== c.conversationId) { setPedido((v) => v + 1); return true }
    const r = resumoDe(c)
    setLista((l) => (l && l.conversa === c.conversationId
      ? { ...l, chamados: novo ? [r, ...l.chamados.filter((x) => x.id !== r.id)] : l.chamados.map((x) => (x.id === r.id ? r : x)) }
      : l))
    return true
  }, [])
  const dados = useMemo<DadosDoSuporte | null>(() => (ligado ? {
    conversationId, contatoNome, chamados, temChamadoAberto: chamados.some(emAberto), carregando, erro, recarregar, aoCriar,
  } : null), [ligado, conversationId, contatoNome, chamados, carregando, erro, recarregar, aoCriar])

  return (
    <AcoesCtx.Provider value={acoes}>
      <DadosCtx.Provider value={dados}>{children}</DadosCtx.Provider>
    </AcoesCtx.Provider>
  )
}
