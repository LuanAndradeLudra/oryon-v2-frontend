import type { KpiId, KpiMetric } from '@/types/dashboard'

/**
 * DC-4/DC-6 — metas do Dashboard por empresa (espelho de
 * `backend-release/src/modules/dashboard/dashboard-metas.ts`). Unidades de
 * quem preenche: tempos em minutos/horas, taxas em %. Ausente = sem meta.
 */
export interface MetasDoPainel {
  tempoRespostaMin?: number | null
  primeiraRespostaHumanaMin?: number | null
  tempoResolucaoHoras?: number | null
  taxaResolucao?: number | null
  taxaRecontatoMax?: number | null
  resolucaoIA?: number | null
  taxaEntrega?: number | null
  taxaResposta?: number | null
}

export type CampoDaMeta = keyof MetasDoPainel

/** Cada meta: o indicador que ela julga, a unidade de quem digita e o sentido. */
export const CAMPOS_DAS_METAS: Array<{
  campo: CampoDaMeta
  kpi: KpiId
  rotulo: string
  unidade: 'min' | 'h' | '%'
  sentido: 'menor' | 'maior'
  min: number
  max: number
}> = [
  { campo: 'tempoRespostaMin',          kpi: 'first_response_time',    rotulo: 'Tempo de resposta (mediana) até',     unidade: 'min', sentido: 'menor', min: 1, max: 1440 },
  { campo: 'primeiraRespostaHumanaMin', kpi: 'human_first_response',   rotulo: '1ª resposta humana (mediana) até',    unidade: 'min', sentido: 'menor', min: 1, max: 1440 },
  { campo: 'tempoResolucaoHoras',       kpi: 'avg_resolution_time',    rotulo: 'Tempo de resolução (mediana) até',    unidade: 'h',   sentido: 'menor', min: 1, max: 720 },
  { campo: 'taxaResolucao',             kpi: 'resolution_rate',        rotulo: 'Taxa de resolução de pelo menos',     unidade: '%',   sentido: 'maior', min: 1, max: 100 },
  { campo: 'taxaRecontatoMax',          kpi: 'recontact_rate',         rotulo: 'Taxa de recontato de no máximo',      unidade: '%',   sentido: 'menor', min: 1, max: 100 },
  { campo: 'resolucaoIA',               kpi: 'bot_deflection',         rotulo: 'Resolução pela IA de pelo menos',     unidade: '%',   sentido: 'maior', min: 1, max: 100 },
  { campo: 'taxaEntrega',               kpi: 'campaign_delivery_rate', rotulo: 'Entrega dos disparos de pelo menos',  unidade: '%',   sentido: 'maior', min: 1, max: 100 },
  { campo: 'taxaResposta',              kpi: 'campaign_reply_rate',    rotulo: 'Resposta aos disparos de pelo menos', unidade: '%',   sentido: 'maior', min: 1, max: 100 },
]

const FATOR = { min: 60, h: 3600, '%': 1 } as const

/**
 * Metas → alvo de cada indicador, na unidade do valor (segundos, %).
 * A 1ª resposta humana cai no SLA da empresa (`slaTargetMinutes`) quando não
 * há meta própria — é o mesmo número que a tabela da equipe usa.
 */
export function metasDosIndicadores(
  metas: MetasDoPainel | null | undefined,
  slaMin: number | null,
): Partial<Record<KpiId, KpiMetric['meta']>> {
  const out: Partial<Record<KpiId, KpiMetric['meta']>> = {}
  for (const c of CAMPOS_DAS_METAS) {
    const v = metas?.[c.campo]
    if (typeof v === 'number' && Number.isFinite(v) && v > 0) out[c.kpi] = { alvo: v * FATOR[c.unidade], sentido: c.sentido }
  }
  if (!out.human_first_response && slaMin && slaMin > 0) out.human_first_response = { alvo: slaMin * 60, sentido: 'menor' }
  return out
}
