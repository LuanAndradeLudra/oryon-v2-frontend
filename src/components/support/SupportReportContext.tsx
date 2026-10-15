import { useCallback, useEffect, useMemo, useState, type ReactNode } from 'react'
import { useNavigate } from 'react-router-dom'
import { useIsMobile } from '@/hooks/useIsMobile'
import { supportApi } from '@/services/supportApi'
import type { Message } from '@/types'
import type { ChamadoDaEmpresa, ResumoDoChamado } from '@/types/support'
import { emAberto } from './supportModel'
import { criarStoreDaMarcacao, type ChamadoDaMensagem, type SobreOChamado } from './marcacaoDoChamado'
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
  const store = useMemo(() => criarStoreDaMarcacao(), [])
  const [lista, setLista] = useState<ListaDaConversa | null>(null)
  const [pedido, setPedido] = useState(0)

  // Troca de conversa: a marcação começa do zero.
  useEffect(() => { store.zerar() }, [conversationId, store])

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
  const alternar = useCallback((id: string) => store.alternar(id), [store])
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

  const recarregar = useCallback(() => setPedido((v) => v + 1), [])
  // Criou ou juntou: a lista desta conversa já mostra o chamado (e a bandeira nas bolhas), sem esperar o servidor.
  const aoCriar = useCallback((c: ChamadoDaEmpresa, novo: boolean) => {
    if (!lista || lista.conversa !== c.conversationId) { setPedido((v) => v + 1); return }
    const r = resumoDe(c)
    setLista({ ...lista, chamados: novo ? [r, ...lista.chamados.filter((x) => x.id !== r.id)] : lista.chamados.map((x) => (x.id === r.id ? r : x)) })
  }, [lista])
  const dados = useMemo<DadosDoSuporte | null>(() => (ligado ? {
    conversationId, contatoNome, chamados, temChamadoAberto: chamados.some(emAberto), carregando, erro, recarregar, aoCriar,
  } : null), [ligado, conversationId, contatoNome, chamados, carregando, erro, recarregar, aoCriar])

  return (
    <AcoesCtx.Provider value={acoes}>
      <DadosCtx.Provider value={dados}>{children}</DadosCtx.Provider>
    </AcoesCtx.Provider>
  )
}
