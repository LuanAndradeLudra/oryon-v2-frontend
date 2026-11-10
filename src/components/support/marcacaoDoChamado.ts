import { useSyncExternalStore } from 'react'
import type { Message } from '@/types'

/**
 * MARCAÇÃO DAS MENSAGENS DO CHAMADO — store fora do React (épico SCRUM-1376).
 *
 * Na prévia o conjunto de mensagens marcadas morava num contexto: cada clique
 * re-renderizava TODAS as bolhas da conversa. Aqui cada bolha assina só o
 * pedaço de que precisa, com um seletor que devolve um valor simples
 * (`useSyncExternalStore`): marcar uma mensagem re-renderiza uma bolha.
 *
 * Também guarda o mapa mensagem → chamado (bandeira na linha da hora), que
 * muda pouco (abrir a conversa, criar ou juntar um chamado), e as mensagens
 * carregadas no chat: só o painel as lê, então uma mensagem nova não
 * re-renderiza o cabeçalho nem a seção do painel do contato.
 */
export type SobreOChamado = 'mensagens' | 'conversa'

export interface ChamadoDaMensagem {
  id: string
  numero: string
}

export interface EstadoDaMarcacao {
  /** Bolhas viram caixas de seleção. */
  marcando: boolean
  marcadas: ReadonlySet<string>
  /** Painel do chamado aberto (no celular, a folha em tela cheia). */
  painelAberto: boolean
  /** Painel: o chamado é sobre mensagens marcadas ou sobre a conversa inteira. */
  sobre: SobreOChamado
  chamadoPorMensagem: ReadonlyMap<string, ChamadoDaMensagem>
  /** Mensagens carregadas no chat (o painel mostra as marcadas e os fatos da conversa). */
  mensagens: readonly Message[]
}

/** Teto do backend: até 50 mensagens marcadas por chamado. */
export const MAX_MARCADAS = 50

export interface StoreDaMarcacao {
  ler(): EstadoDaMarcacao
  assinar(ouvinte: () => void): () => void
  mudar(parcial: Partial<EstadoDaMarcacao>): void
  /** Marca ou desmarca. `false`: chegou ao teto e não marcou. */
  alternar(messageId: string): boolean
  /** Volta ao estado inicial (cancelar). Mantém o mapa só se pedido; as mensagens, sempre (quem as registra é o chat). */
  zerar(manterChamados?: boolean): void
}

const VAZIO: ReadonlySet<string> = new Set()
const SEM_CHAMADOS: ReadonlyMap<string, ChamadoDaMensagem> = new Map()
const SEM_MENSAGENS: readonly Message[] = []

export function criarStoreDaMarcacao(): StoreDaMarcacao {
  let estado: EstadoDaMarcacao = { marcando: false, marcadas: VAZIO, painelAberto: false, sobre: 'mensagens', chamadoPorMensagem: SEM_CHAMADOS, mensagens: SEM_MENSAGENS }
  const ouvintes = new Set<() => void>()
  const avisar = () => { for (const o of ouvintes) o() }
  return {
    ler: () => estado,
    assinar(ouvinte) {
      ouvintes.add(ouvinte)
      return () => { ouvintes.delete(ouvinte) }
    },
    mudar(parcial) {
      estado = { ...estado, ...parcial }
      avisar()
    },
    alternar(id) {
      const marcadas = new Set(estado.marcadas)
      if (marcadas.has(id)) marcadas.delete(id)
      else if (marcadas.size >= MAX_MARCADAS) return false
      else marcadas.add(id)
      estado = { ...estado, marcadas }
      avisar()
      return true
    },
    zerar(manterChamados = false) {
      estado = {
        marcando: false, marcadas: VAZIO, painelAberto: false, sobre: 'mensagens',
        chamadoPorMensagem: manterChamados ? estado.chamadoPorMensagem : SEM_CHAMADOS, mensagens: estado.mensagens,
      }
      avisar()
    },
  }
}

/**
 * Lê um pedaço do estado. O seletor deve devolver um valor simples (booleano,
 * número) ou uma referência que só muda quando o pedaço muda (o Set, o Map ou
 * um item dele) — senão o React re-renderiza em todo aviso.
 */
export function useMarcacao<T>(store: StoreDaMarcacao, seletor: (e: EstadoDaMarcacao) => T): T {
  return useSyncExternalStore(store.assinar, () => seletor(store.ler()), () => seletor(store.ler()))
}
