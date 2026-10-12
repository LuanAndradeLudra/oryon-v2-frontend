import type { KpiDefinition, KpiId, KpiMetric } from '@/types/dashboard'

/**
 * Identidade dos indicadores dos Relatórios (pedido do PO, 01/10).
 *
 * Direção escolhida (B2B, minimalista): SEM ícones nem cor por grupo — a
 * primeira tentativa (ícone colorido por indicador) ficou genérica e
 * "carnavalesca". A diferença vem de:
 *  - estrutura: os indicadores aparecem em GRUPOS com cabeçalho discreto;
 *  - o formato do dado: barra nas taxas, referência ao lado dos tempos;
 *  - cor só com significado: estado da meta, ponto "ao vivo", barra da taxa.
 */

/** Nome do grupo no cabeçalho da faixa. */
export const NOME_DO_GRUPO: Record<KpiDefinition['category'], string> = {
  Atendimento: 'Atendimento',
  Velocidade: 'Velocidade',
  Qualidade: 'Qualidade',
  Volume: 'Volume',
  Bot: 'IA',
  Equipe: 'Equipe',
  Disparos: 'Disparos',
  Marketing: 'Marketing',
  Clínica: 'Clínica',
}

/** Indicadores de AGORA (estado atual) — ganham o ponto "ao vivo"; os demais são do período. */
export const KPI_AO_VIVO: ReadonlySet<KpiId> = new Set<KpiId>(['active_conversations', 'queued', 'agents_online'])

/** Para onde o cartão leva (a lista que compõe o número). Sem destino = não é clicável. */
const DESTINO: Partial<Record<KpiId, { para: string; rotulo: string }>> = {
  total_conversations:    { para: '/conversations', rotulo: 'Abrir as conversas' },
  active_conversations:   { para: '/conversations?status=open', rotulo: 'Abrir as conversas ativas' },
  queued:                 { para: '/conversations?aba=fila', rotulo: 'Abrir a Fila' },
  resolved:               { para: '/conversations?status=resolved', rotulo: 'Abrir as conversas resolvidas' },
  first_response_time:    { para: '/conversations?aguardando=1', rotulo: 'Abrir quem espera resposta' },
  human_first_response:   { para: '/conversations?aguardando=1', rotulo: 'Abrir quem espera resposta' },
  new_contacts:           { para: '/contacts', rotulo: 'Abrir os contatos' },
  agents_online:          { para: '/dashboard', rotulo: 'Ver a equipe agora' },
  campaign_sent:          { para: '/campaigns', rotulo: 'Abrir as campanhas' },
  campaign_delivery_rate: { para: '/campaigns', rotulo: 'Abrir as campanhas' },
  campaign_read_rate:     { para: '/campaigns', rotulo: 'Abrir as campanhas' },
  campaign_reply_rate:    { para: '/campaigns', rotulo: 'Abrir as campanhas' },
}

export function identidadeDo(kpi: Pick<KpiDefinition, 'id'>) {
  return { aoVivo: KPI_AO_VIVO.has(kpi.id), destino: DESTINO[kpi.id] ?? null }
}

/**
 * Agrupa os indicadores escolhidos pelo grupo, na ordem em que o primeiro de
 * cada grupo aparece na escolha do usuário; dentro do grupo, a ordem dele.
 */
export function agruparPorGrupo(metrics: KpiMetric[]): Array<{ grupo: KpiDefinition['category']; itens: KpiMetric[] }> {
  const ordem: Array<KpiDefinition['category']> = []
  const porGrupo = new Map<KpiDefinition['category'], KpiMetric[]>()
  for (const m of metrics) {
    if (!porGrupo.has(m.category)) { porGrupo.set(m.category, []); ordem.push(m.category) }
    porGrupo.get(m.category)!.push(m)
  }
  return ordem.map((grupo) => ({ grupo, itens: porGrupo.get(grupo)! }))
}

export type EstadoDaMeta = 'ok' | 'atencao' | 'fora'

/**
 * Estado do número em relação à meta. "Menor é melhor" (tempos): até a meta
 * = ok, até 2× = atenção. "Maior é melhor" (taxas): da meta para cima = ok,
 * até 80% dela = atenção.
 */
export function estadoDaMeta(m: Pick<KpiMetric, 'value' | 'meta'>): EstadoDaMeta | null {
  if (m.value === null || !m.meta) return null
  const { alvo, sentido } = m.meta
  if (sentido === 'menor') return m.value <= alvo ? 'ok' : m.value <= alvo * 2 ? 'atencao' : 'fora'
  return m.value >= alvo ? 'ok' : m.value >= alvo * 0.8 ? 'atencao' : 'fora'
}

export const COR_DO_ESTADO: Record<EstadoDaMeta, string> = {
  ok: 'var(--color-status-active)',
  atencao: 'var(--color-status-pending)',
  fora: 'var(--color-danger)',
}

export const ROTULO_DO_ESTADO: Record<EstadoDaMeta, string> = {
  ok: 'na meta',
  atencao: 'atenção',
  fora: 'fora da meta',
}

/** DC-5: compacta = número, variação e apoio; detalhada = mais a linha por dia. */
export type Densidade = 'compacta' | 'detalhada'
/** DC-5: até 2 indicadores em destaque, maiores, acima dos grupos. */
export const DESTAQUE_MAX = 2
