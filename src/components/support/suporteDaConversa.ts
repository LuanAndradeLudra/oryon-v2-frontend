import { createContext, useContext, useEffect } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import { suporteLigadoPara } from '@/config/featureFlags'
import type { Message } from '@/types'
import type { ChamadoDaEmpresa, ResumoDoChamado } from '@/types/support'
import { criarStoreDaMarcacao, type SobreOChamado, type StoreDaMarcacao } from './marcacaoDoChamado'

/**
 * O CHAMADO NA CONVERSA — contextos e hooks (épico SCRUM-1376, SCRUM-1381).
 * O provider mora em SupportReportContext.tsx; aqui fica o que os
 * consumidores importam (o arquivo do provider só exporta componente).
 */

/** `true` com a flag do tenant `FF_SUPPORT_TICKETS` (lida do `/auth/me`). */
export function useSuporteLigado(): boolean {
  const { featureFlags, user } = useAuth()
  // A equipe de suporte da Oryon não abre chamado de empresa: a API responde 403 para ela.
  return suporteLigadoPara(featureFlags) && user?.role !== 'oryon_support'
}

/**
 * AÇÕES do chamado na conversa — estáveis, para as bolhas (que são `memo`)
 * não re-renderizarem a cada mudança. O estado da marcação mora no `store`
 * (ver marcacaoDoChamado.ts); cada um assina só o que lê.
 */
export interface AcoesDoSuporte {
  /** Flag do tenant ligada E uma conversa aberta. Desligado: nada do recurso aparece. */
  ligado: boolean
  /** Computador: painel ao lado do chat, com a marcação ao vivo. Celular: marca primeiro, depois a folha em tela cheia. */
  emPainel: boolean
  store: StoreDaMarcacao
  iniciarMarcacao: (primeira?: string) => void
  alternar: (messageId: string) => void
  cancelarMarcacao: () => void
  /** Abre o formulário com as mensagens escolhidas (nenhuma = a conversa inteira). */
  reportar: (messageIds: string[]) => void
  definirSobre: (v: SobreOChamado) => void
  irParaChamado: (id: string) => void
  /** O chat informa as mensagens que carregou (vão para o store: só o painel as lê). */
  registrarMensagens: (m: readonly Message[]) => void
}

/** DADOS da conversa para o painel, a seção do painel do contato e o cabeçalho. */
export interface DadosDoSuporte {
  conversationId: string | null
  contatoNome: string | null
  chamados: readonly ResumoDoChamado[]
  temChamadoAberto: boolean
  carregando: boolean
  erro: boolean
  recarregar: () => void
  /** `false`: a pessoa já está em outra conversa (o pós-envio não mexe em nada dela). */
  aoCriar: (c: ChamadoDaEmpresa, novo: boolean) => boolean
}

const nada = () => {}
/** Fora da página de Conversas (e nos testes): desligado, com um store que nunca muda. */
export const DESLIGADO: AcoesDoSuporte = {
  ligado: false, emPainel: true, store: criarStoreDaMarcacao(),
  iniciarMarcacao: nada, alternar: nada, cancelarMarcacao: nada, reportar: nada, definirSobre: nada, irParaChamado: nada, registrarMensagens: nada,
}
export const AcoesCtx = createContext<AcoesDoSuporte>(DESLIGADO)
export const DadosCtx = createContext<DadosDoSuporte | null>(null)

/** Ações do chamado. Sempre definido: sem o provider, `ligado` é `false`. */
export function useSuporte(): AcoesDoSuporte {
  return useContext(AcoesCtx)
}
/** Dados do chamado da conversa; `null` com o recurso desligado ou sem conversa. */
export function useDadosDoSuporte(): DadosDoSuporte | null {
  return useContext(DadosCtx)
}

/** O chat chama isto com as mensagens que carregou (o painel mostra as marcadas). Sem o recurso, não faz nada. */
export function useRegistrarMensagensDoSuporte(messages: readonly Message[]) {
  const { registrarMensagens } = useSuporte()
  useEffect(() => { registrarMensagens(messages) }, [registrarMensagens, messages])
}

/** Resumo de lista a partir do chamado completo (criar, juntar). */
export function resumoDe(c: ChamadoDaEmpresa): ResumoDoChamado {
  return {
    id: c.id, numero: c.numero, origemDoProblema: c.origemDoProblema, origemNome: c.origemNome, tipoDePedido: c.tipoDePedido,
    categoria: c.categoria, assunto: c.assunto, ondeAconteceu: c.ondeAconteceu, trecho: c.trecho, status: c.status, prioridade: c.prioridade,
    perguntaPendente: c.perguntaPendente, avaliacao: c.avaliacao, conversationId: c.conversationId, contatoNome: c.contatoNome,
    abertoPor: c.abertoPor, abertoEm: c.abertoEm, atualizadoEm: c.atualizadoEm, mensagensMarcadas: c.mensagens.map((m) => m.id),
  }
}
