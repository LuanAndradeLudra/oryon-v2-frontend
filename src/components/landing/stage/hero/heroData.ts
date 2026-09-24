/**
 * Dados FIXOS do Hero novo — os mesmos nos 5 frames (continuidade), conforme
 * `docs/design/landing-2026/STORYBOARD-HERO.md` §2. Lastro no código real
 * (§1 do storyboard): catálogo do agente (`AgentCatalogTab.tsx`), preço/
 * quantidade da proposta (`dealItems.ts`), mover de etapa e etiquetar contato
 * (`crmCapabilitiesCatalog.tsx`). Limite obrigatório: fechar venda NUNCA é
 * permitido (a própria capacidade recusa) — o resultado é PROPOSTA
 * REGISTRADA, nunca "Ganho". P14: nomes obviamente de demonstração; rótulo
 * `STAGE_DEMO_LABEL` no chrome (StageFrame já garante isso).
 */

export const HERO = {
  person: 'Marina Alves',
  company: 'Loja Vida Natural',
  line: 'WhatsApp · Comercial',
  agent: 'Agente Vendas',
  demand: 'Oi! Preciso de uma proposta pra 12 licenças do plano anual.',
  response: 'Enviei a proposta: 12 licenças do Plano Pro anual, R$ 4.500 por ano. Quer que eu agende uma conversa pra fechar?',
  catalogItem: { name: 'Plano Pro · anual', price: 'R$ 375 / licença' },
  deal: { title: 'Loja Vida Natural — Plano Pro anual', qty: 12, total: 'R$ 4.500' },
  tag: 'proposta enviada',
  ficha: { clienteDesde: 'cliente desde março', negocioAberto: 'Qualificado', conversasAnteriores: 2 },
  stageFrom: 'Qualificado',
  stageTo: 'Proposta',
  time: '09:14',
} as const

/** Os cinco frames do storyboard §4 — cada um é um ESTADO desta MESMA composição, não uma tela própria. */
export type HeroFrameKey = 'demanda' | 'contexto' | 'consulta' | 'acao' | 'resultado'
export const HERO_FRAMES: readonly HeroFrameKey[] = ['demanda', 'contexto', 'consulta', 'acao', 'resultado']
export const HERO_FRAME_LABEL: Record<HeroFrameKey, string> = {
  demanda: 'F1 · demanda', contexto: 'F2 · contexto', consulta: 'F3 · consulta', acao: 'F4 · ação', resultado: 'F5 · resultado',
}

/** Mobile é uma composição PRÓPRIA de três momentos (storyboard §6), não os 5 frames encolhidos. */
export type HeroMobileMoment = 'demanda' | 'execucao' | 'resultado'
export const HERO_MOBILE_MOMENTS: readonly HeroMobileMoment[] = ['demanda', 'execucao', 'resultado']
export const HERO_MOBILE_LABEL: Record<HeroMobileMoment, string> = {
  demanda: 'M1 · demanda', execucao: 'M2 · execução', resultado: 'M3 · resultado',
}
