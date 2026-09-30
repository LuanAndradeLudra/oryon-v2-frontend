import type { Message } from '@/types'
import type { TimelineEntry } from '@/components/conversations/ContactPanel/ConversationActivitySection'
import { minutesAgo } from '../stage/hero/heroClock'

/**
 * AS SIMULAÇÕES POR ÁREA (30/09) — uma conversa curta de cada operação, com
 * DADOS FICTÍCIOS, desenhada pelos componentes reais do produto (a bolha do
 * chat e a linha do tempo do CRM). A página avisa que é simulação.
 *
 * Regras de roteiro (PO, 30/09):
 *  • a IA pode errar — nenhum roteiro mostra a IA decidindo o que é da
 *    pessoa (orientação jurídica, dúvida clínica, fechar venda): nesses
 *    pontos ela CHAMA alguém da equipe;
 *  • nada de módulo desligado (nada de "agendamento" como produto) — a IA
 *    "encaminha" ou "chama" a pessoa;
 *  • o que a IA responde vem do que a empresa cadastrou (catálogo, base de
 *    conhecimento) — o roteiro sempre deixa isso visível.
 */

export type Passo =
  | { tipo: 'cliente'; texto: string }
  | { tipo: 'ia'; texto: string }
  | { tipo: 'crm'; resumo: string; ferramenta: string }
  | { tipo: 'chamou'; resumo: string }

export interface Simulacao {
  contato: string
  agente: string
  passos: Passo[]
}

export const SIMULACOES: Record<string, Simulacao> = {
  clinicas: {
    contato: 'Juliana Reis',
    agente: 'Agente Recepção',
    passos: [
      { tipo: 'cliente', texto: 'Oi! Vocês atendem Unimed? E quanto fica a consulta particular?' },
      { tipo: 'ia', texto: 'Oi, Juliana! Atendemos Unimed, basta trazer a guia autorizada. No particular, a consulta fica R$ 220. Quer que eu veja um horário?' },
      { tipo: 'crm', resumo: 'Adicionou a etiqueta "convênio" à conversa', ferramenta: 'add_tag_to_conversation' },
      { tipo: 'cliente', texto: 'Quero, mas estou com uma mancha que apareceu ontem. É urgente?' },
      { tipo: 'ia', texto: 'Essa avaliação precisa ser feita pela equipe da clínica. Já chamei a recepção para falar com você agora.' },
      { tipo: 'chamou', resumo: 'Chamou Ana da recepção para a conversa' },
    ],
  },
  contabilidade: {
    contato: 'Marcos Tavares',
    agente: 'Agente Atendimento',
    passos: [
      { tipo: 'cliente', texto: 'Bom dia! Até quando posso mandar as notas de setembro?' },
      { tipo: 'ia', texto: 'Bom dia, Marcos! As notas de setembro podem ser enviadas até o dia 5 de outubro, por aqui mesmo, em PDF ou XML.' },
      { tipo: 'crm', resumo: 'Adicionou a etiqueta "fiscal" à conversa', ferramenta: 'add_tag_to_conversation' },
      { tipo: 'cliente', texto: 'Recebi uma notificação da Receita. O que eu faço?' },
      { tipo: 'ia', texto: 'Esse caso precisa da análise de um contador. Já passei sua conversa para a Carla, que acompanha a sua empresa.' },
      { tipo: 'chamou', resumo: 'Chamou Carla Mendes para a conversa' },
    ],
  },
  juridico: {
    contato: 'Renato Alves',
    agente: 'Agente Triagem',
    passos: [
      { tipo: 'cliente', texto: 'Fui demitido e queria entender meus direitos.' },
      { tipo: 'ia', texto: 'Sinto muito, Renato. Não posso orientar sobre o seu caso, mas já organizo o atendimento: você tem a carta de demissão e a carteira de trabalho?' },
      { tipo: 'crm', resumo: 'Situação do contato: Novo → Triagem', ferramenta: 'update_contact' },
      { tipo: 'cliente', texto: 'Tenho as duas.' },
      { tipo: 'ia', texto: 'Ótimo. Separei o que o advogado precisa e chamei o Dr. Paulo, que vai falar com você por aqui.' },
      { tipo: 'chamou', resumo: 'Chamou Dr. Paulo para a conversa' },
    ],
  },
  imobiliarias: {
    contato: 'Fernanda Luz',
    agente: 'Agente Imóveis',
    passos: [
      { tipo: 'cliente', texto: 'Tem apartamento de 2 quartos para alugar no Centro, até R$ 2.500?' },
      { tipo: 'ia', texto: 'Tenho dois no catálogo: um de 68 m² na Rua XV por R$ 2.300 e um de 72 m² com vaga por R$ 2.480. Quer visitar algum?' },
      { tipo: 'crm', resumo: 'Criou o negócio "Aluguel · Centro" na etapa Interesse', ferramenta: 'manage_deal_pipeline' },
      { tipo: 'cliente', texto: 'O com vaga! Pode ser sábado de manhã?' },
      { tipo: 'ia', texto: 'Vou pedir para o corretor confirmar o horário com o proprietário. O Lucas já está com a sua conversa.' },
      { tipo: 'chamou', resumo: 'Chamou Lucas Prado para a conversa' },
    ],
  },
  varejo: {
    contato: 'Bianca Rocha',
    agente: 'Agente Loja',
    passos: [
      { tipo: 'cliente', texto: 'Vocês têm o tênis Runner Pro no 38?' },
      { tipo: 'ia', texto: 'Temos sim, Bianca! O Runner Pro no 38 sai por R$ 349, em preto ou branco. Quer que um vendedor separe um para você?' },
      { tipo: 'crm', resumo: 'Criou o negócio "Runner Pro · 38" na etapa Interesse', ferramenta: 'manage_deal_pipeline' },
      { tipo: 'cliente', texto: 'Quero o branco. Consigo retirar hoje?' },
      { tipo: 'ia', texto: 'Chamei a Paula, da loja, para confirmar a retirada e fechar o pedido com você.' },
      { tipo: 'chamou', resumo: 'Chamou Paula Nunes para a conversa' },
    ],
  },
}

/** As mensagens até o passo `ate` (exclusive), no formato do produto. */
export function mensagensAte(sim: Simulacao, ate: number): Message[] {
  const out: Message[] = []
  sim.passos.slice(0, ate).forEach((p, i) => {
    if (p.tipo !== 'cliente' && p.tipo !== 'ia') return
    const quando = minutesAgo(sim.passos.length - i)
    out.push({
      id: `sim-m-${i}`,
      conversationId: 'sim-conv',
      direction: p.tipo === 'cliente' ? 'inbound' : 'outbound',
      type: 'text',
      status: p.tipo === 'cliente' ? 'delivered' : 'read',
      body: p.texto,
      sentAt: quando,
      createdAt: quando,
      senderKind: p.tipo === 'cliente' ? 'client' : 'ai',
    } as Message)
  })
  return out
}

/** As linhas da linha do tempo do CRM até o passo `ate` (exclusive). */
export function linhaDoTempoAte(sim: Simulacao, ate: number): TimelineEntry[] {
  const out: TimelineEntry[] = []
  sim.passos.slice(0, ate).forEach((p, i) => {
    if (p.tipo === 'crm') {
      out.push({ kind: 'agent', id: `sim-t-${i}`, summary: p.resumo, success: true, errorMessage: null, toolName: p.ferramenta, agentName: sim.agente, createdAt: minutesAgo(sim.passos.length - i) })
    } else if (p.tipo === 'chamou') {
      out.push({ kind: 'agent', id: `sim-t-${i}`, summary: p.resumo, success: true, errorMessage: null, toolName: 'assign_conversation', agentName: sim.agente, createdAt: minutesAgo(sim.passos.length - i) })
    }
  })
  return out
}
