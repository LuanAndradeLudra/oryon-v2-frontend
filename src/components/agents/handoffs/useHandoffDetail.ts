// ─── Detalhe da conversa selecionada (A6 / SCRUM-1017) ───────────────────────
import { useCallback, useEffect, useState } from 'react'
import { conversionApi, messagesApi } from '@/services/api'
import type { ConversationAnalysisResult, Message } from '@/types'
import type { HandoffItem } from '@/types/agentsOps'

/**
 * As três origens possíveis do card de resumo, em ordem de preferência.
 *
 * O rótulo muda junto com a origem, e isso é o ponto: o `/analysis` é o
 * analisador de **conversão de vendas** (`outcome`, `conversionValue`,
 * `signals`, `objections`), não um resumo de triagem. O texto é real nos dois
 * casos; o que eu recuso é vender análise de conversão como resumo de
 * atendimento — o operador tomaria decisão de triagem em cima de um texto
 * escrito para atribuir venda.
 */
export type OrigemDoResumo = 'handoff' | 'analise' | 'nenhuma'

export interface DetailState {
  mensagens: Message[]
  carregandoMensagens: boolean
  temMais: boolean
  carregarMais: () => void
  analise: ConversationAnalysisResult | null
  origem: OrigemDoResumo
  /** Texto do card, já resolvido pela cascata dos 3 níveis. */
  resumo: string | null
}

/**
 * **O estado é reiniciado por `key`, não por efeito.** Quem monta o painel usa
 * `key={item.id}`, então trocar de conversa desmonta e remonta — que é a forma
 * idiomática de zerar estado no React e evita o `setState` síncrono dentro de
 * efeito, que dispara render em cascata (e o lint proíbe).
 */
export function useHandoffDetail(item: HandoffItem | null): DetailState {
  const [mensagens, setMensagens] = useState<Message[]>([])
  // Nasce `true` porque o efeito abaixo vai buscar já: assim o `false` sai
  // só do `finally`, e nada precisa ser ligado no corpo do efeito. Em
  // "carregar mais" o indicador não volta a subir — a lista já tem conteúdo na
  // tela e o `MessageList` mostra a própria afordância.
  const [carregandoMensagens, setCarregando] = useState(true)
  const [pagina, setPagina] = useState(1)
  const [temMais, setTemMais] = useState(false)
  const [analise, setAnalise] = useState<ConversationAnalysisResult | null>(null)

  const conversationId = item?.conversationId ?? null

  useEffect(() => {
    if (!conversationId) return
    let vivo = true
    messagesApi.list(conversationId, pagina, 50)
      .then((r) => {
        if (!vivo) return
        const lote = r.data.data ?? []
        setMensagens((antes) => (pagina === 1 ? lote : [...lote, ...antes]))
        setTemMais(lote.length === 50)
      })
      .catch(() => { if (vivo) setTemMais(false) })
      .finally(() => { if (vivo) setCarregando(false) })
    return () => { vivo = false }
  }, [conversationId, pagina])

  // Nível 2 da cascata: só busca a análise quando o `summary` do próprio evento
  // não veio. É uma chamada por conversa selecionada, sob demanda no clique —
  // nunca prefetch da fila inteira.
  useEffect(() => {
    if (!conversationId || item?.summary) return
    let vivo = true
    conversionApi.getAnalysis(conversationId)
      .then((r) => { if (vivo) setAnalise(r.data) })
      // Conversa sem análise é o caso comum, não um erro a mostrar.
      .catch(() => { if (vivo) setAnalise(null) })
    return () => { vivo = false }
  }, [conversationId, item?.summary])

  const carregarMais = useCallback(() => setPagina((p) => p + 1), [])

  const origem: OrigemDoResumo = item?.summary
    ? 'handoff'
    : analise?.summary
      ? 'analise'
      : 'nenhuma'

  return {
    mensagens,
    carregandoMensagens,
    temMais,
    carregarMais,
    analise,
    origem,
    resumo: origem === 'handoff' ? item!.summary : origem === 'analise' ? analise!.summary : null,
  }
}
