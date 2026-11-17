import { createContext } from 'react'

/**
 * Onde um passo novo vai entrar:
 * - `saida`: numa saída livre de um passo (ou da Entrada, com `origem` = '__entrada');
 * - `entre`: no meio de uma ligação que já existe (o passo novo fica entre os dois);
 * - `solto`: sem lugar definido (o editor decide: abaixo do passo selecionado, ou solto).
 */
export type DestinoDoPasso =
  | { tipo: 'solto' }
  | { tipo: 'saida'; origem: string; saida: string }
  | { tipo: 'entre'; origem: string; saida: string; destino: string }

/** O que os cartões e as ligações do canvas podem pedir ao editor. */
export interface AcoesDoCanvas {
  abrirSeletor: (destino: DestinoDoPasso, ponto: { x: number; y: number }) => void
  somenteLeitura: boolean
  /** O número do cartão ("63 agora") abre quem está no passo (P2, 16/11). */
  verQuemEsta?: (nodeId: string) => void
  /** Com a lista de passos aberta (painéis encaixados): onde o passo novo vai entrar, para o "+" e a ligação se destacarem. */
  insercao?: DestinoDoPasso | null
}

export const ContextoDoCanvas = createContext<AcoesDoCanvas>({ abrirSeletor: () => {}, somenteLeitura: true })
