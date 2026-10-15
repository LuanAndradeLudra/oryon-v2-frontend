import type { StatusChamado } from '@/components/support/supportModel'
import type { ResumoDaCalibracao, ResumoDoProblema, StatusDoProblema } from '@/types/support'

/**
 * Vocabulário da FILA da Oryon (SCRUM-1384) — o lado da equipe, espelho de
 * `support/dominio/tipos.ts` e `transicoes.ts` do backend. A empresa usa o de
 * `supportModel.ts` (lá, triado e investigando são "Em análise").
 */

export type Prioridade = 'P0' | 'P1' | 'P2' | 'P3'
export const PRIORIDADES: Record<Prioridade, { nome: string; cor: string; faixa: string }> = {
  P0: { nome: 'Crítica', cor: 'text-danger', faixa: 'bg-danger' },
  P1: { nome: 'Alta', cor: 'text-warning', faixa: 'bg-warning' },
  P2: { nome: 'Média', cor: 'text-accent-amber', faixa: 'bg-accent-amber' },
  P3: { nome: 'Baixa', cor: 'text-surface-400', faixa: 'bg-surface-600' },
}

export type CausaRaiz =
  | 'technical_defect' | 'config_or_data' | 'integration_limit' | 'generative_residual' | 'improvement_request' | 'insufficient_evidence'
export const CAUSAS: Record<CausaRaiz, string> = {
  technical_defect: 'Defeito técnico',
  config_or_data: 'Cadastro ou configuração do cliente',
  integration_limit: 'Limite da integração',
  generative_residual: 'Erro residual da IA',
  improvement_request: 'Pedido de melhoria',
  insufficient_evidence: 'Evidência insuficiente',
}

/** Como a EQUIPE chama cada status. */
export const STATUS_NA_FILA: Record<StatusChamado, string> = {
  received: 'Recebido',
  triaged: 'Triado',
  investigating: 'Investigando',
  awaiting_client: 'Aguardando a empresa',
  mitigated: 'Contornado',
  fix_planned: 'Correção planejada',
  residual_risk: 'Limite conhecido',
  not_reproduced: 'Não reproduzido',
  resolved: 'Resolvido · falta a confirmação',
  closed: 'Encerrado',
}

/** O que a equipe escolhe no status. Resolvido só pela resposta ao cliente; encerrado, pela empresa. */
export const STATUS_DA_EQUIPE: StatusChamado[] = ['triaged', 'investigating', 'mitigated', 'fix_planned', 'residual_risk', 'not_reproduced']
/** Como a resposta ao cliente pode deixar o chamado — o único caminho para Resolvido. */
export const STATUS_AO_RESPONDER: StatusChamado[] = ['resolved', 'fix_planned', 'mitigated', 'residual_risk', 'not_reproduced', 'investigating']

export type Relogio = 'primeiraResposta' | 'triagem' | 'contorno' | 'solucao'
export const RELOGIOS: Record<Relogio, string> = { primeiraResposta: '1ª resposta', triagem: 'Triagem', contorno: 'Contorno', solucao: 'Solução' }

/** Canal por onde o chamado entrou. */
export const CANAIS: Record<string, string> = { inbox: 'Inbox', whatsapp_suporte: 'WhatsApp de suporte', sinal_automatico: 'Sinal automático', app: 'App' }
export const ENTRADAS: Record<string, string> = { conversa: 'conversa', pagina_suporte: 'página Suporte', menu_do_usuario: 'menu do usuário' }

export function canalDe(c: { origem: string; entrada: string | null }): string {
  return `${CANAIS[c.origem] ?? c.origem}${c.origem === 'app' && c.entrada ? ` · ${ENTRADAS[c.entrada] ?? c.entrada}` : ''}`
}

/** SCRUM-1387 — como a equipe chama cada status do problema (os mesmos nomes do backend). */
export const STATUS_DO_PROBLEMA: Record<StatusDoProblema, string> = {
  aberto: 'Aberto', investigando: 'Investigando', corrigido: 'Corrigido', nao_corrigir: 'Não será corrigido',
}

/** "3 chamados em 2 empresas" — o alcance real do problema. */
export function alcanceDoProblema(p: Pick<ResumoDoProblema, 'chamados' | 'empresas'>): string {
  return `${p.chamados} ${p.chamados === 1 ? 'chamado' : 'chamados'} em ${p.empresas} ${p.empresas === 1 ? 'empresa' : 'empresas'}`
}

/** Só o resumo (o chamado guarda o resumo; o problema aberto traz a lista e o candidato). */
export function resumoDoProblema(p: ResumoDoProblema): ResumoDoProblema {
  return {
    id: p.id, numero: p.numero, titulo: p.titulo, status: p.status, nomeDoStatus: p.nomeDoStatus, causaRaiz: p.causaRaiz, jiraRef: p.jiraRef,
    chamados: p.chamados, empresas: p.empresas, temFixture: p.temFixture,
  }
}

/** SCRUM-1392 — "40% confirmados (4 de 10 · 90 dias)": numerador, denominador e período sempre à vista. */
export function textoDaCalibracao(c: ResumoDaCalibracao): string {
  if (c.situacao === 'poucos_dados' || c.taxa === null) {
    return `poucos dados (${c.triados} ${c.triados === 1 ? 'relato de urgência triado' : 'relatos de urgência triados'} · ${c.janelaDias} dias)`
  }
  return `${c.taxa}% confirmados (${c.confirmados} de ${c.triados} · ${c.janelaDias} dias)`
}

/** 409: alguém mexeu no chamado entre a leitura e o envio (a tela recarrega o chamado). */
export function ehConflito(err: unknown): boolean {
  return (err as { response?: { status?: number } } | null)?.response?.status === 409
}

/** "em 25 min", "há 2 h", "em 3 dias" — a partir do minuto atual (useRelogioDoMinuto). */
export function relativo(iso: string, agora: number): string {
  const ms = new Date(iso).getTime() - agora
  const min = Math.round(Math.abs(ms) / 60_000)
  const texto = min < 60 ? `${min} min` : min < 60 * 24 ? `${Math.round(min / 60)} h` : `${Math.round(min / (60 * 24))} ${Math.round(min / (60 * 24)) > 1 ? 'dias' : 'dia'}`
  return ms >= 0 ? `em ${texto}` : `há ${texto}`
}

/**
 * Modelos de resposta (até a SCRUM-1393, que traz o rascunho pela IA): ponto
 * de partida, sempre revisado por quem envia. Cada um sugere o status.
 */
export const MODELOS_DE_RESPOSTA: Array<{ id: string; titulo: string; texto: string; deixarComo: StatusChamado }> = [
  {
    id: 'corrigido', titulo: 'Corrigido', deixarComo: 'resolved',
    texto: 'Encontramos a causa e corrigimos. [o que aconteceu e o que foi feito]. Se voltar a acontecer, responda por aqui.',
  },
  {
    id: 'cadastro', titulo: 'Ajuste no cadastro', deixarComo: 'resolved',
    texto: 'A resposta veio do cadastro: [o que estava no cadastro]. Ajustamos [o quê] e a IA já responde com a informação certa.',
  },
  {
    id: 'planejada', titulo: 'Correção planejada', deixarComo: 'fix_planned',
    texto: 'Confirmamos o problema: [o que acontece]. A correção está planejada e avisamos por aqui quando sair.',
  },
  {
    id: 'contorno', titulo: 'Contorno', deixarComo: 'mitigated',
    texto: 'Enquanto a correção não sai, [o contorno]. Seguimos acompanhando e avisamos por aqui.',
  },
  {
    id: 'nao-reproduzido', titulo: 'Não reproduzido', deixarComo: 'not_reproduced',
    texto: 'Tentamos reproduzir [o quê] e não aconteceu de novo. Se acontecer, responda por aqui com o horário e a conversa.',
  },
]
